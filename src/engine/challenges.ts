/**
 * Daily challenges & weekly contracts — the "come back tomorrow" loop. Each is
 * a bite-sized goal drawn deterministically from the date, so every player on
 * a given day sees the same challenge and it rotates predictably. Predicates
 * read the same absolute state snapshot as achievements (no per-day delta
 * bookkeeping), and a claim can be taken once per period when satisfied.
 */
import type { AchievementContext } from './achievements';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number; // B$
  test: (c: AchievementContext) => boolean;
}

/** local calendar day key, YYYY-MM-DD */
export function dayKey(now: number): string {
  const d = new Date(now);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** ISO-ish week key, YYYY-Www — same for all 7 days of a week */
export function weekKey(now: number): string {
  const d = new Date(now);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86_400_000);
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

/** stable non-negative hash of a string, for deterministic selection */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const DAILY_POOL: Challenge[] = [
  { id: 'd-study5', title: 'Hit the books', description: 'Have 5 modules mastered (70%+).', reward: 30, test: (c) => c.modulesMastered >= 5 },
  { id: 'd-estimate', title: 'Trust your numbers', description: 'Reach 60% estimating readiness.', reward: 30, test: (c) => c.mathReadiness >= 60 },
  { id: 'd-build2', title: 'Keep it moving', description: 'Complete at least 2 phases.', reward: 35, test: (c) => c.projectsCompleted >= 2 },
  { id: 'd-quality', title: 'Built right', description: 'Land a phase at grade 85+.', reward: 40, test: (c) => c.bestGrade >= 85 },
  { id: 'd-rep', title: 'Make a name', description: 'Reach 50 company reputation.', reward: 35, test: (c) => c.reputation >= 50 },
  { id: 'd-rank', title: 'Climb', description: 'Reach Assistant Site Manager rank.', reward: 30, test: (c) => c.rankIndex >= 2 },
];

export const WEEKLY_POOL: Challenge[] = [
  { id: 'w-scholar', title: 'Weekly contract: Scholar', description: 'Master 10 modules.', reward: 90, test: (c) => c.modulesMastered >= 10 },
  { id: 'w-topout', title: 'Weekly contract: Top out', description: 'Complete 4 phases.', reward: 110, test: (c) => c.projectsCompleted >= 4 },
  { id: 'w-reputable', title: 'Weekly contract: Reputable firm', description: 'Reach 70 company reputation.', reward: 120, test: (c) => c.reputation >= 70 },
  { id: 'w-sharp', title: 'Weekly contract: Sharp estimator', description: 'Reach 75% estimating readiness.', reward: 100, test: (c) => c.mathReadiness >= 75 },
];

export function dailyChallenge(now: number): Challenge {
  return DAILY_POOL[hash(dayKey(now)) % DAILY_POOL.length];
}

export function weeklyContract(now: number): Challenge {
  return WEEKLY_POOL[hash(weekKey(now)) % WEEKLY_POOL.length];
}
