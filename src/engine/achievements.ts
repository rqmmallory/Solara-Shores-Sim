/**
 * Achievements — the milestone layer that keeps a next goal always in view.
 * Each one is a small teaching contract: it rewards a behaviour the product
 * wants to reinforce (study deeply, build well, calibrate your estimating,
 * climb the career), pays CM Capital on unlock, and reads purely from a
 * snapshot of game state so it is deterministic and testable.
 *
 * Adding an achievement is data: append to ACHIEVEMENTS. The evaluator and
 * the UI pick it up automatically.
 */

/** everything an achievement can test, assembled once per evaluation */
export interface AchievementContext {
  totalXp: number;
  capital: number;
  /** modules at >= mastery proficiency (70) */
  modulesMastered: number;
  /** every learning-path module at mastery */
  pathComplete: boolean;
  mathAttempts: number;
  mathReadiness: number;
  projectsCompleted: number;
  bestGrade: number;
  reputation: number;
  rankIndex: number;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** B$ awarded once, on unlock */
  reward: number;
  test: (c: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---- learning ----
  { id: 'first-xp', name: 'First Day on Site', icon: '🥾', description: 'Earn your first XP.', reward: 10, test: (c) => c.totalXp > 0 },
  { id: 'first-master', name: 'One Down', icon: '📗', description: 'Master your first module (70%+).', reward: 25, test: (c) => c.modulesMastered >= 1 },
  { id: 'scholar', name: 'Scholar of the Trade', icon: '📚', description: 'Master 5 modules.', reward: 50, test: (c) => c.modulesMastered >= 5 },
  { id: 'professor', name: 'Walking Spec Book', icon: '🎓', description: 'Master 15 modules.', reward: 100, test: (c) => c.modulesMastered >= 15 },
  { id: 'full-curriculum', name: 'Master of the Ground Up', icon: '🏅', description: 'Complete the entire learning path.', reward: 300, test: (c) => c.pathComplete },
  // ---- estimating ----
  { id: 'estimator', name: 'Sharpening the Pencil', icon: '✏️', description: 'Attempt 20 estimating problems.', reward: 30, test: (c) => c.mathAttempts >= 20 },
  { id: 'calibrated', name: 'Reliable Number', icon: '🎯', description: 'Reach 70% estimating readiness.', reward: 60, test: (c) => c.mathReadiness >= 70 },
  // ---- building ----
  { id: 'groundbreaker', name: 'Groundbreaker', icon: '⛏️', description: 'Complete your first phase.', reward: 40, test: (c) => c.projectsCompleted >= 1 },
  { id: 'topping-out', name: 'Topping Out', icon: '🏗️', description: 'Complete 4 phases.', reward: 120, test: (c) => c.projectsCompleted >= 4 },
  { id: 'handover', name: 'Keys Handed Over', icon: '🔑', description: 'Complete all 7 phases.', reward: 250, test: (c) => c.projectsCompleted >= 7 },
  { id: 'distinction', name: 'Built to a Standard', icon: '⭐', description: 'Finish a phase with a grade of 90+.', reward: 80, test: (c) => c.bestGrade >= 90 },
  // ---- career ----
  { id: 'reputable', name: 'Word Gets Around', icon: '📈', description: 'Reach 70 company reputation.', reward: 80, test: (c) => c.reputation >= 70 },
  { id: 'site-manager', name: 'The Site Answers to You', icon: '👷', description: 'Reach Site Manager rank.', reward: 100, test: (c) => c.rankIndex >= 3 },
  { id: 'director', name: 'Corner Office', icon: '🏢', description: 'Reach Construction Director rank.', reward: 200, test: (c) => c.rankIndex >= 6 },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementById(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

/** ids whose test now passes but that aren't already unlocked */
export function evaluateAchievements(ctx: AchievementContext, unlocked: string[]): string[] {
  const have = new Set(unlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(ctx)).map((a) => a.id);
}

/** total B$ owed for a set of newly-unlocked ids */
export function rewardFor(ids: string[]): number {
  return ids.reduce((acc, id) => acc + (BY_ID.get(id)?.reward ?? 0), 0);
}
