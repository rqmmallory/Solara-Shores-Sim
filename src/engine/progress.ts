/**
 * Progress model: XP, per-module proficiency, and the Project Readiness
 * score. Gamification is framed around the real goal — being job-site
 * ready before ground breaks in September — not arbitrary points.
 */
import type { ContentModule } from '../content/schema';

/** ground breaks September 2026 */
export const GROUNDBREAK_ISO = '2026-09-01T00:00:00-05:00';

export function daysToGroundbreak(now: number): number {
  const target = new Date(GROUNDBREAK_ISO).getTime();
  return Math.max(0, Math.ceil((target - now) / 86_400_000));
}

// ------------------------------------------------------------------- XP

export const XP = {
  quizCorrectFirstTry: 10,
  quizCorrectRetry: 4,
  sequencingCorrect: 15,
  subManageItem: 4,
  reviewPass: 6,
  mathCorrect: 12, // × difficulty
  decisionOptimal: 20,
  decisionAcceptable: 8,
  simStepOptimal: 25,
  simStepAcceptable: 10,
  simPhaseComplete: 100,
} as const;

export function levelForXp(xp: number): { level: number; into: number; needed: number } {
  // level n needs 100 * n XP beyond the previous level
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level += 1;
  }
  return { level, into: remaining, needed: level * 100 };
}

// ----------------------------------------------------------- per-module

export interface QuestionStat {
  attempts: number;
  correct: number;
  everCorrect: boolean;
}

export interface ModuleStats {
  /** keyed by question id */
  questions: Record<string, QuestionStat>;
  xp: number;
  /** decision points seen (optimal or not — seeing the debrief is learning) */
  decisionsSeen: string[];
}

export function emptyModuleStats(): ModuleStats {
  return { questions: {}, xp: 0, decisionsSeen: [] };
}

/**
 * Proficiency 0–100 = coverage × reliability.
 * Coverage: how much of the module you've engaged (questions + decisions).
 * Reliability: of engaged questions, share you've ever gotten right.
 */
export function moduleProficiency(module: ContentModule, stats: ModuleStats | undefined): number {
  const totalQ = module.quiz.length;
  const totalD = module.decisionPoints.length;
  const totalItems = totalQ + totalD;
  if (totalItems === 0 || !stats) return 0;

  const engagedQ = Object.keys(stats.questions).filter((id) =>
    module.quiz.some((q) => q.id === id)
  );
  const seenD = stats.decisionsSeen.filter((id) => module.decisionPoints.some((d) => d.id === id));
  const coverage = (engagedQ.length + seenD.length) / totalItems;

  const reliable =
    engagedQ.length === 0
      ? 1
      : engagedQ.filter((id) => stats.questions[id].everCorrect).length / engagedQ.length;

  return Math.round(coverage * reliable * 100);
}

// ----------------------------------------------------------- math stats

export interface MathStats {
  attempts: number;
  correct: number;
  /** rolling mean of |% error| across attempts (the estimating-accuracy stat) */
  meanAbsPctError: number;
  /** unlocked difficulty 1..3 */
  unlockedDifficulty: 1 | 2 | 3;
  /** recent results at the current difficulty, for unlock decisions */
  recentAtLevel: boolean[];
  xp: number;
}

export function emptyMathStats(): MathStats {
  return { attempts: 0, correct: 0, meanAbsPctError: 0, unlockedDifficulty: 1, recentAtLevel: [], xp: 0 };
}

export function recordMathAttempt(s: MathStats, correct: boolean, absPctError: number, difficulty: number): MathStats {
  const attempts = s.attempts + 1;
  const meanAbsPctError = s.meanAbsPctError + (Math.min(absPctError, 200) - s.meanAbsPctError) / attempts;
  let recentAtLevel = s.recentAtLevel;
  let unlockedDifficulty = s.unlockedDifficulty;
  if (difficulty === s.unlockedDifficulty) {
    recentAtLevel = [...s.recentAtLevel, correct].slice(-5);
    // 4 of last 5 right at your frontier unlocks the next difficulty
    if (
      unlockedDifficulty < 3 &&
      recentAtLevel.length === 5 &&
      recentAtLevel.filter(Boolean).length >= 4
    ) {
      unlockedDifficulty = (unlockedDifficulty + 1) as 1 | 2 | 3;
      recentAtLevel = [];
    }
  }
  return {
    attempts,
    correct: s.correct + (correct ? 1 : 0),
    meanAbsPctError,
    unlockedDifficulty,
    recentAtLevel,
    xp: s.xp + (correct ? XP.mathCorrect * difficulty : 0),
  };
}

/** 0–100: accuracy blended with how far up the difficulty ladder you are */
export function mathReadiness(s: MathStats): number {
  if (s.attempts === 0) return 0;
  const accuracy = s.correct / s.attempts;
  const ladder = (s.unlockedDifficulty - 1) / 2; // 0, .5, 1
  const volume = Math.min(1, s.attempts / 30); // trust the stat only with reps
  return Math.round((accuracy * 0.5 + ladder * 0.3 + volume * 0.2) * 100);
}

// -------------------------------------------------------------- sim stats

export interface SimRecord {
  phaseId: string;
  bestScore: number;
  runs: number;
}

export function simReadiness(records: SimRecord[], totalPhases: number, readyPhases: number): number {
  if (readyPhases === 0) return 0;
  const denom = Math.max(readyPhases, 1);
  const sum = records.reduce((acc, r) => acc + r.bestScore, 0);
  return Math.round(sum / denom);
}

// -------------------------------------------------------------- readiness

export interface ReadinessBreakdown {
  knowledge: number; // 0..100 mean proficiency over non-placeholder modules
  math: number;
  sim: number;
  overall: number; // weighted
}

export function projectReadiness(
  modules: ContentModule[],
  moduleStats: Record<string, ModuleStats>,
  mathStats: MathStats,
  simRecords: SimRecord[],
  readySimPhases: number
): ReadinessBreakdown {
  const gradable = modules.filter((m) => m.status !== 'placeholder');
  const knowledge =
    gradable.length === 0
      ? 0
      : Math.round(
          gradable.reduce((acc, m) => acc + moduleProficiency(m, moduleStats[m.id]), 0) /
            gradable.length
        );
  const math = mathReadiness(mathStats);
  const sim = simReadiness(simRecords, readySimPhases, readySimPhases);
  const overall = Math.round(knowledge * 0.5 + math * 0.25 + sim * 0.25);
  return { knowledge, math, sim, overall };
}
