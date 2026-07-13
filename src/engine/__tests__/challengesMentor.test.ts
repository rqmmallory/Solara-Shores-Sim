import type { AchievementContext } from '../achievements';
import {
  dailyChallenge,
  DAILY_POOL,
  dayKey,
  weeklyContract,
  weekKey,
  WEEKLY_POOL,
} from '../challenges';
import { adaptiveGuidance, assistLabel, assistLevel } from '../mentorGuidance';
import { MENTORS } from '../../content/mentors';

const ctx: AchievementContext = {
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

describe('date keys', () => {
  it('dayKey is stable within a day and differs across days', () => {
    const a = new Date(2026, 6, 13, 9).getTime();
    const b = new Date(2026, 6, 13, 23).getTime();
    const c = new Date(2026, 6, 14, 1).getTime();
    expect(dayKey(a)).toBe(dayKey(b));
    expect(dayKey(a)).not.toBe(dayKey(c));
  });

  it('weekKey is stable across a week', () => {
    const mon = new Date(2026, 6, 13).getTime();
    const fri = new Date(2026, 6, 17).getTime();
    expect(weekKey(mon)).toBe(weekKey(fri));
  });
});

describe('deterministic challenge selection', () => {
  it('daily challenge is stable for a given day and from the pool', () => {
    const t = new Date(2026, 6, 13, 10).getTime();
    const first = dailyChallenge(t);
    expect(DAILY_POOL).toContain(first);
    expect(dailyChallenge(new Date(2026, 6, 13, 20).getTime())).toBe(first);
  });

  it('weekly contract is stable within a week and from the pool', () => {
    const t = new Date(2026, 6, 13).getTime();
    expect(WEEKLY_POOL).toContain(weeklyContract(t));
    expect(weeklyContract(new Date(2026, 6, 16).getTime())).toBe(weeklyContract(t));
  });

  it('challenge tests are wired to context fields', () => {
    const study = DAILY_POOL.find((c) => c.id === 'd-study5')!;
    expect(study.test({ ...ctx, modulesMastered: 5 })).toBe(true);
    expect(study.test({ ...ctx, modulesMastered: 4 })).toBe(false);
  });
});

describe('adaptive mentor guidance', () => {
  const m = MENTORS[0];

  it('reduces assistance as proficiency rises', () => {
    expect(assistLevel(10)).toBe('coaching');
    expect(assistLevel(40)).toBe('guiding');
    expect(assistLevel(70)).toBe('nudging');
    expect(assistLevel(95)).toBe('observing');
  });

  it('produces a topic-specific line at every level', () => {
    for (const p of [10, 40, 70, 95]) {
      const line = adaptiveGuidance(m, p, 'compaction');
      expect(line).toContain('compaction');
      expect(line.length).toBeGreaterThan(20);
    }
  });

  it('labels each assist level', () => {
    expect(assistLabel('coaching')).toBeTruthy();
    expect(assistLabel('observing')).toBeTruthy();
  });
});
