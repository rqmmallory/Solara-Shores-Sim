/**
 * Principle retention — the engine half of the "forgetting is disuse, not
 * confusion" learner model. Instead of tracking question strings, it tracks
 * how well each recurring LAW (principleId) is holding up, and resurfaces a
 * weak or long-unused law in a NEW disguise (a different question, in a
 * different module/context) rather than replaying the old one.
 *
 * Pure and deterministic: state in, state out, timestamps passed by the caller.
 */

export interface PrincipleStat {
  /** 0..1 mastery, an exponential moving average of correct/incorrect */
  strength: number;
  /** epoch ms of the last time this principle was exercised */
  lastSeen: number;
  attempts: number;
}

export type PrincipleRetention = Record<string, PrincipleStat>;

// how fast a single result moves the running mastery average
const ALPHA = 0.4;
// a principle unused for this long is "due" regardless of strength (disuse)
const STALE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/** fold one graded outcome into the retention state for every tagged principle */
export function recordPrincipleOutcome(
  retention: PrincipleRetention,
  principleIds: string[] | undefined,
  correct: boolean,
  now: number
): PrincipleRetention {
  if (!principleIds || principleIds.length === 0) return retention;
  const next = { ...retention };
  for (const id of principleIds) {
    const prev = next[id];
    const target = correct ? 1 : 0;
    const strength = prev ? prev.strength + ALPHA * (target - prev.strength) : correct ? 0.6 : 0.25;
    next[id] = {
      strength: Math.max(0, Math.min(1, strength)),
      lastSeen: now,
      attempts: (prev?.attempts ?? 0) + 1,
    };
  }
  return next;
}

/** 0..100 mastery of one principle (0 = never seen) */
export function principleStrength(retention: PrincipleRetention, id: string): number {
  return Math.round((retention[id]?.strength ?? 0) * 100);
}

/**
 * Priority to resurface a principle: high when mastery is low, and rising the
 * longer it has gone unused (disuse). Unseen principles get a moderate,
 * non-zero priority so the curriculum introduces them. Higher = more due.
 */
export function resurfacePriority(retention: PrincipleRetention, id: string, now: number): number {
  const stat = retention[id];
  // never seen — worth introducing, but AFTER fixing anything already shaky
  // (a single miss scores ~0.49, so keep this below that)
  if (!stat) return 0.4;
  const weakness = 1 - stat.strength; // 0..1
  const staleness = Math.min(1, (now - stat.lastSeen) / STALE_MS); // 0..1
  // weakness dominates, disuse escalates it — a mastered-but-stale law still resurfaces
  return weakness * 0.65 + staleness * 0.35;
}

/** the principle ids most in need of resurfacing, most-due first */
export function dueForResurface(
  retention: PrincipleRetention,
  allPrincipleIds: string[],
  now: number,
  limit = 5
): string[] {
  return [...allPrincipleIds]
    .map((id) => ({ id, p: resurfacePriority(retention, id, now) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, limit)
    .map((x) => x.id);
}

/**
 * Pick a "new disguise" for a principle: from all questions tagged with it,
 * prefer one the learner has NOT just seen (a different module/context),
 * falling back to the least-recently-used. `candidates` is the tagged pool;
 * `recentlySeen` are question ids to avoid repeating.
 */
export interface DisguiseCandidate {
  moduleId: string;
  questionId: string;
  principleIds: string[];
}

export function pickDisguise(
  principleId: string,
  candidates: DisguiseCandidate[],
  recentlySeen: Set<string>
): DisguiseCandidate | null {
  const tagged = candidates.filter((c) => c.principleIds.includes(principleId));
  if (tagged.length === 0) return null;
  const fresh = tagged.filter((c) => !recentlySeen.has(c.questionId));
  return (fresh.length > 0 ? fresh : tagged)[0];
}
