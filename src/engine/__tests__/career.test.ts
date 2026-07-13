import {
  careerSummary,
  companyReputation,
  RANKS,
  rankForXp,
  reputationTier,
} from '../career';
import type { SimRecord } from '../progress';

describe('rank ladder', () => {
  it('is strictly increasing in threshold and starts at 0', () => {
    expect(RANKS[0].threshold).toBe(0);
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].threshold).toBeGreaterThan(RANKS[i - 1].threshold);
    }
  });

  it('places XP in the right band and reports progress to next', () => {
    const cadet = rankForXp(0);
    expect(cadet.index).toBe(0);
    expect(cadet.rank.title).toBe('Site Cadet');
    expect(cadet.fraction).toBeCloseTo(0);

    const mid = rankForXp(275); // halfway between 150 and 400
    expect(mid.rank.title).toBe('Works Coordinator');
    expect(mid.next?.title).toBe('Assistant Site Manager');
    expect(mid.fraction).toBeCloseTo(0.5, 1);
  });

  it('caps at the final rank with full fraction and no next', () => {
    const top = rankForXp(999999);
    expect(top.index).toBe(RANKS.length - 1);
    expect(top.next).toBeNull();
    expect(top.fraction).toBe(1);
  });

  it('never returns negative progress for negative xp', () => {
    const r = rankForXp(-50);
    expect(r.index).toBe(0);
    expect(r.into).toBeGreaterThanOrEqual(0);
  });
});

describe('company reputation', () => {
  const recs = (scores: number[]): SimRecord[] =>
    scores.map((s, i) => ({ phaseId: `p${i}`, bestScore: s, runs: 1 }));

  it('is zero with nothing delivered and no knowledge', () => {
    expect(companyReputation(0, [])).toBe(0);
  });

  it('blends delivered grades with knowledge', () => {
    // 80 delivered, 100 knowledge -> 0.65*80 + 0.35*100 = 87
    expect(companyReputation(100, recs([80, 80]))).toBe(87);
  });

  it('labels tiers sensibly', () => {
    expect(reputationTier(90)).toBe('Blue-chip');
    expect(reputationTier(0)).toBe('Brand new');
    expect(reputationTier(55)).toBe('Established');
  });
});

describe('career summary', () => {
  it('rolls up projects, runs, best and average grade', () => {
    const recs: SimRecord[] = [
      { phaseId: 'a', bestScore: 90, runs: 3 },
      { phaseId: 'b', bestScore: 70, runs: 1 },
    ];
    const s = careerSummary(recs);
    expect(s.projectsCompleted).toBe(2);
    expect(s.totalRuns).toBe(4);
    expect(s.bestGrade).toBe(90);
    expect(s.avgGrade).toBe(80);
  });

  it('handles an empty career', () => {
    const s = careerSummary([]);
    expect(s).toEqual({ projectsCompleted: 0, totalRuns: 0, bestGrade: 0, avgGrade: 0 });
  });
});
