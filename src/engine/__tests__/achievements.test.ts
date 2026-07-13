import {
  ACHIEVEMENTS,
  achievementById,
  AchievementContext,
  evaluateAchievements,
  rewardFor,
} from '../achievements';

const base: AchievementContext = {
  totalXp: 0,
  capital: 0,
  modulesMastered: 0,
  pathComplete: false,
  mathAttempts: 0,
  mathReadiness: 0,
  projectsCompleted: 0,
  bestGrade: 0,
  reputation: 0,
  rankIndex: 0,
};

describe('achievement roster', () => {
  it('has unique ids and non-negative rewards', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.reward).toBeGreaterThanOrEqual(0);
      expect(a.name).toBeTruthy();
      expect(a.icon).toBeTruthy();
    }
  });
});

describe('evaluateAchievements', () => {
  it('unlocks nothing for a blank slate', () => {
    expect(evaluateAchievements(base, [])).toEqual([]);
  });

  it('unlocks first-xp as soon as any XP is earned', () => {
    const got = evaluateAchievements({ ...base, totalXp: 10 }, []);
    expect(got).toContain('first-xp');
  });

  it('does not re-award an already-unlocked achievement', () => {
    const ctx = { ...base, totalXp: 10 };
    const got = evaluateAchievements(ctx, ['first-xp']);
    expect(got).not.toContain('first-xp');
  });

  it('unlocks tiered building achievements at the right thresholds', () => {
    expect(evaluateAchievements({ ...base, projectsCompleted: 1 }, [])).toContain('groundbreaker');
    expect(evaluateAchievements({ ...base, projectsCompleted: 1 }, [])).not.toContain('handover');
    expect(evaluateAchievements({ ...base, projectsCompleted: 7 }, [])).toContain('handover');
  });

  it('stacks multiple unlocks in one pass', () => {
    const ctx: AchievementContext = { ...base, totalXp: 5, modulesMastered: 5, projectsCompleted: 1 };
    const got = evaluateAchievements(ctx, []);
    expect(got).toEqual(expect.arrayContaining(['first-xp', 'first-master', 'scholar', 'groundbreaker']));
  });
});

describe('rewardFor', () => {
  it('sums the B$ of the given ids and ignores unknown ids', () => {
    expect(rewardFor(['first-xp'])).toBe(10);
    expect(rewardFor(['first-xp', 'scholar'])).toBe(60);
    expect(rewardFor(['nope'])).toBe(0);
  });
});
