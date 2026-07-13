import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { modules, simPhases } from '../content';
import type { CurveballFrequency } from '../engine/sim';
import {
  capitalForXp,
  emptyModuleStats,
  MathStats,
  mathReadiness,
  ModuleStats,
  moduleProficiency,
  projectReadiness,
  ReadinessBreakdown,
  recordMathAttempt,
  SimRecord,
  XP,
} from '../engine/progress';
import { companyReputation, rankForXp } from '../engine/career';
import { AchievementContext, evaluateAchievements, rewardFor } from '../engine/achievements';
import { dailyChallenge, dayKey, weekKey, weeklyContract } from '../engine/challenges';
import { nextOnPath } from '../engine/learningPath';
import { dueItems, recordMiss, recordReviewPass, SrsItem } from '../engine/spacedRepetition';
import { emptyState, loadState, PersistedState, saveStateDebounced } from './store';

interface AppStateValue {
  ready: boolean;
  state: PersistedState;
  readiness: ReadinessBreakdown;
  totalXp: number;
  dueReviews: SrsItem[];
  // quiz
  recordQuizResult: (
    moduleId: string,
    questionId: string,
    correct: boolean,
    opts?: { review?: boolean; xp?: number }
  ) => void;
  recordDecisionSeen: (moduleId: string, decisionId: string, optimal: boolean, acceptable: boolean) => void;
  // math
  recordMath: (correct: boolean, absPctError: number, difficulty: number) => void;
  // sim
  recordSimRun: (
    phaseId: string,
    score: number,
    xp: number,
    snapshot: { decisions: { stepId: string; optionId: string }[]; flags: string[]; finalRisk: number }
  ) => void;
  /** flags + carried risk for starting a given phase, built from earlier
   * phases' latest completed runs */
  simCarryFor: (phaseId: string) => { flags: string[]; risk: number };
  /** spend CM Capital (B$); returns false (and spends nothing) if short */
  spendCapital: (amount: number) => boolean;
  /** today's daily challenge + whether it's satisfied/already claimed */
  dailyStatus: () => { challenge: import('../engine/challenges').Challenge; satisfied: boolean; claimed: boolean };
  /** this week's contract + whether it's satisfied/already claimed */
  weeklyStatus: () => { challenge: import('../engine/challenges').Challenge; satisfied: boolean; claimed: boolean };
  /** claim a daily/weekly reward if satisfied and unclaimed; returns B$ paid (0 if not) */
  claimChallenge: (kind: 'daily' | 'weekly') => number;
  setCurveballFrequency: (f: CurveballFrequency) => void;
}

const Ctx = createContext<AppStateValue | null>(null);

/**
 * Build the pure state snapshot that achievements and challenges test against.
 * Kept at module scope so both the achievement effect and challenge-claiming
 * share one definition of "where the player is right now".
 */
function buildContext(state: PersistedState): AchievementContext {
  const gradable = modules.filter((m) => m.status !== 'placeholder');
  const knowledge =
    gradable.length === 0
      ? 0
      : Math.round(
          gradable.reduce((acc, m) => acc + moduleProficiency(m, state.moduleStats[m.id]), 0) /
            gradable.length
        );
  const totalXp =
    Object.values(state.moduleStats).reduce((acc, m) => acc + m.xp, 0) + state.mathStats.xp;
  return {
    totalXp,
    capital: state.capital,
    modulesMastered: gradable.filter((m) => moduleProficiency(m, state.moduleStats[m.id]) >= 70).length,
    pathComplete: nextOnPath(state.moduleStats) === null,
    mathAttempts: state.mathStats.attempts,
    mathReadiness: mathReadiness(state.mathStats),
    projectsCompleted: state.simRecords.length,
    bestGrade: state.simRecords.reduce((acc, r) => Math.max(acc, r.bestScore), 0),
    reputation: companyReputation(knowledge, state.simRecords),
    rankIndex: rankForXp(totalXp).index,
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(emptyState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveStateDebounced(state);
  }, [state, ready]);

  // award achievements whenever the game state that could satisfy one changes.
  // Reads a pure snapshot; only mutates when something new unlocks, so it
  // converges in a single pass and never loops.
  useEffect(() => {
    if (!ready) return;
    const newly = evaluateAchievements(buildContext(state), state.achievements);
    if (newly.length > 0) {
      mutate((s) => ({
        ...s,
        achievements: [...s.achievements, ...newly],
        capital: s.capital + rewardFor(newly),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready]);

  const mutate = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => fn(s));
  }, []);

  const recordQuizResult = useCallback(
    (moduleId: string, questionId: string, correct: boolean, opts?: { review?: boolean; xp?: number }) => {
      mutate((s) => {
        const ms: ModuleStats = s.moduleStats[moduleId] ?? emptyModuleStats();
        const q = ms.questions[questionId] ?? { attempts: 0, correct: 0, everCorrect: false };
        const firstTry = q.attempts === 0;
        const gained =
          opts?.xp ??
          (correct
            ? opts?.review
              ? XP.reviewPass
              : firstTry
                ? XP.quizCorrectFirstTry
                : XP.quizCorrectRetry
            : 0);
        const now = Date.now();
        const srsQueue = opts?.review
          ? correct
            ? recordReviewPass(s.srsQueue, moduleId, questionId, now)
            : recordMiss(s.srsQueue, moduleId, questionId, now)
          : correct
            ? s.srsQueue
            : recordMiss(s.srsQueue, moduleId, questionId, now);
        return {
          ...s,
          srsQueue,
          capital: s.capital + capitalForXp(gained),
          moduleStats: {
            ...s.moduleStats,
            [moduleId]: {
              ...ms,
              xp: ms.xp + gained,
              questions: {
                ...ms.questions,
                [questionId]: {
                  attempts: q.attempts + 1,
                  correct: q.correct + (correct ? 1 : 0),
                  everCorrect: q.everCorrect || correct,
                },
              },
            },
          },
        };
      });
    },
    [mutate]
  );

  const recordDecisionSeen = useCallback(
    (moduleId: string, decisionId: string, optimal: boolean, acceptable: boolean) => {
      mutate((s) => {
        const ms = s.moduleStats[moduleId] ?? emptyModuleStats();
        const seen = ms.decisionsSeen.includes(decisionId);
        const gained = seen ? 0 : optimal ? XP.decisionOptimal : acceptable ? XP.decisionAcceptable : 0;
        return {
          ...s,
          capital: s.capital + capitalForXp(gained),
          moduleStats: {
            ...s.moduleStats,
            [moduleId]: {
              ...ms,
              xp: ms.xp + gained,
              decisionsSeen: seen ? ms.decisionsSeen : [...ms.decisionsSeen, decisionId],
            },
          },
        };
      });
    },
    [mutate]
  );

  const recordMath = useCallback(
    (correct: boolean, absPctError: number, difficulty: number) => {
      mutate((s) => {
        const mathStats = recordMathAttempt(s.mathStats, correct, absPctError, difficulty);
        return {
          ...s,
          mathStats,
          capital: s.capital + capitalForXp(mathStats.xp - s.mathStats.xp),
        };
      });
    },
    [mutate]
  );

  const recordSimRun = useCallback(
    (
      phaseId: string,
      score: number,
      xp: number,
      snapshot: { decisions: { stepId: string; optionId: string }[]; flags: string[]; finalRisk: number }
    ) => {
      mutate((s) => {
        const existing = s.simRecords.find((r) => r.phaseId === phaseId);
        const simRecords = existing
          ? s.simRecords.map((r) =>
              r.phaseId === phaseId
                ? { ...r, runs: r.runs + 1, bestScore: Math.max(r.bestScore, score) }
                : r
            )
          : [...s.simRecords, { phaseId, bestScore: score, runs: 1 }];
        // sim XP is banked on the first module's stats bucket under a
        // synthetic id so total XP includes it without a schema change
        const ms = s.moduleStats['__sim__'] ?? emptyModuleStats();
        return {
          ...s,
          simRecords,
          simRuns: { ...s.simRuns, [phaseId]: { phaseId, score, ...snapshot } },
          capital: s.capital + capitalForXp(xp),
          moduleStats: { ...s.moduleStats, __sim__: { ...ms, xp: ms.xp + xp } },
        };
      });
    },
    [mutate]
  );

  const simCarryFor = useCallback(
    (phaseId: string) => {
      const target = simPhases.find((p) => p.id === phaseId);
      const earlier = simPhases.filter(
        (p) => p.status !== 'placeholder' && target && p.order < target.order
      );
      const flags: string[] = [];
      let risk = 0;
      for (const p of earlier) {
        const run = stateRef.current.simRuns[p.id];
        if (run) {
          flags.push(...run.flags);
          risk = run.finalRisk; // the immediately previous run's leftover wins
        }
      }
      return { flags: [...new Set(flags)], risk };
    },
    []
  );

  const spendCapital = useCallback(
    (amount: number): boolean => {
      if (stateRef.current.capital < amount) return false;
      mutate((s) => ({ ...s, capital: s.capital - amount }));
      return true;
    },
    [mutate]
  );

  const dailyStatus = useCallback(() => {
    const challenge = dailyChallenge(Date.now());
    const s = stateRef.current;
    const claimed = s.dailyClaim?.key === dayKey(Date.now()) && s.dailyClaim?.id === challenge.id;
    return { challenge, satisfied: challenge.test(buildContext(s)), claimed };
  }, []);

  const weeklyStatus = useCallback(() => {
    const challenge = weeklyContract(Date.now());
    const s = stateRef.current;
    const claimed = s.weeklyClaim?.key === weekKey(Date.now()) && s.weeklyClaim?.id === challenge.id;
    return { challenge, satisfied: challenge.test(buildContext(s)), claimed };
  }, []);

  const claimChallenge = useCallback(
    (kind: 'daily' | 'weekly'): number => {
      const now = Date.now();
      const s = stateRef.current;
      const challenge = kind === 'daily' ? dailyChallenge(now) : weeklyContract(now);
      const key = kind === 'daily' ? dayKey(now) : weekKey(now);
      const claim = kind === 'daily' ? s.dailyClaim : s.weeklyClaim;
      const already = claim?.key === key && claim?.id === challenge.id;
      if (already || !challenge.test(buildContext(s))) return 0;
      mutate((st) => ({
        ...st,
        capital: st.capital + challenge.reward,
        ...(kind === 'daily'
          ? { dailyClaim: { key, id: challenge.id } }
          : { weeklyClaim: { key, id: challenge.id } }),
      }));
      return challenge.reward;
    },
    [mutate]
  );

  const setCurveballFrequency = useCallback(
    (f: CurveballFrequency) => {
      mutate((s) => ({ ...s, settings: { ...s.settings, curveballFrequency: f } }));
    },
    [mutate]
  );

  const value = useMemo<AppStateValue>(() => {
    const readyPhases = simPhases.filter((p) => p.status !== 'placeholder').length;
    const readiness = projectReadiness(
      modules,
      state.moduleStats,
      state.mathStats,
      state.simRecords,
      readyPhases
    );
    const totalXp =
      Object.values(state.moduleStats).reduce((acc, m) => acc + m.xp, 0) + state.mathStats.xp;
    return {
      ready,
      state,
      readiness,
      totalXp,
      dueReviews: dueItems(state.srsQueue, Date.now()),
      recordQuizResult,
      recordDecisionSeen,
      recordMath,
      recordSimRun,
      simCarryFor,
      spendCapital,
      dailyStatus,
      weeklyStatus,
      claimChallenge,
      setCurveballFrequency,
    };
  }, [ready, state, recordQuizResult, recordDecisionSeen, recordMath, recordSimRun, simCarryFor, spendCapital, dailyStatus, weeklyStatus, claimChallenge, setCurveballFrequency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside provider');
  return v;
}
