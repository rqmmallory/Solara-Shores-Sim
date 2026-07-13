/**
 * Career progression — the long arc that turns "finish the tutorial estate"
 * into "build a construction company." XP already drives per-module levels;
 * this layer reads the same signals to award a Construction-Manager RANK and
 * a company REPUTATION, and rolls up career statistics. All derived and pure
 * so it needs no new persisted state and stays trivially testable.
 *
 * Design intent (per the product brief): there is always a next rung, and the
 * way you climb it is by managing real projects well — which is only possible
 * if you understand the construction science behind the decisions.
 */
import type { SimRecord } from './progress';

export interface Rank {
  /** total XP at which this rank is reached */
  threshold: number;
  title: string;
  /** what the player is trusted with at this rank */
  blurb: string;
}

/**
 * The CM career ladder. Titles mirror a real construction-management path
 * from first day on site to running a development company. Thresholds are
 * spaced so each rank is a satisfying multi-session climb, not a grind.
 */
export const RANKS: Rank[] = [
  { threshold: 0, title: 'Site Cadet', blurb: 'Learning the site. Shadowing every trade.' },
  { threshold: 150, title: 'Works Coordinator', blurb: 'Trusted to sequence a work front.' },
  { threshold: 400, title: 'Assistant Site Manager', blurb: 'Running daily works under supervision.' },
  { threshold: 800, title: 'Site Manager', blurb: 'The site answers to you now.' },
  { threshold: 1400, title: 'Project Manager', blurb: 'Cost, programme and quality are yours to own.' },
  { threshold: 2200, title: 'Senior Project Manager', blurb: 'Multiple work packages, one plan.' },
  { threshold: 3200, title: 'Construction Director', blurb: 'You set the standard the site is built to.' },
  { threshold: 4500, title: 'Development Director', blurb: 'From raw land to handover — the whole play.' },
];

export interface RankProgress {
  index: number;
  rank: Rank;
  next: Rank | null;
  /** XP earned into the current rank band */
  into: number;
  /** XP width of the current rank band (0 at the final rank) */
  span: number;
  /** 0..1 progress toward the next rank (1 at the final rank) */
  fraction: number;
}

export function rankForXp(xp: number): RankProgress {
  const x = Math.max(0, xp);
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (x >= RANKS[i].threshold) index = i;
  const rank = RANKS[index];
  const next = index < RANKS.length - 1 ? RANKS[index + 1] : null;
  const into = x - rank.threshold;
  const span = next ? next.threshold - rank.threshold : 0;
  const fraction = next ? Math.max(0, Math.min(1, into / span)) : 1;
  return { index, rank, next, into, span, fraction };
}

/**
 * Company reputation, 0..100 — the market's trust in your firm. It rises with
 * the grades you actually deliver on site (best score per completed phase) and
 * is anchored by your knowledge base: a well-studied CM is a credible one.
 * Reputation is what later unlocks bigger, riskier, more profitable projects.
 */
export function companyReputation(knowledgeReadiness: number, simRecords: SimRecord[]): number {
  const delivered =
    simRecords.length === 0
      ? 0
      : simRecords.reduce((acc, r) => acc + r.bestScore, 0) / simRecords.length;
  // 65% what you've built, 35% what you know — you can't coast on either alone
  return Math.round(delivered * 0.65 + Math.max(0, Math.min(100, knowledgeReadiness)) * 0.35);
}

/** a human label for a reputation score, for UI copy */
export function reputationTier(rep: number): string {
  if (rep >= 85) return 'Blue-chip';
  if (rep >= 70) return 'Well-regarded';
  if (rep >= 50) return 'Established';
  if (rep >= 30) return 'Up-and-coming';
  if (rep > 0) return 'Unproven';
  return 'Brand new';
}

export interface CareerSummary {
  projectsCompleted: number;
  totalRuns: number;
  bestGrade: number;
  avgGrade: number;
}

export function careerSummary(simRecords: SimRecord[]): CareerSummary {
  const projectsCompleted = simRecords.length;
  const totalRuns = simRecords.reduce((acc, r) => acc + r.runs, 0);
  const bestGrade = simRecords.reduce((acc, r) => Math.max(acc, r.bestScore), 0);
  const avgGrade =
    projectsCompleted === 0
      ? 0
      : Math.round(simRecords.reduce((acc, r) => acc + r.bestScore, 0) / projectsCompleted);
  return { projectsCompleted, totalRuns, bestGrade, avgGrade };
}
