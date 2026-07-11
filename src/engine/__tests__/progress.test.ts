import { modules } from '../../content';
import {
  daysToGroundbreak,
  emptyMathStats,
  emptyModuleStats,
  levelForXp,
  mathReadiness,
  moduleProficiency,
  projectReadiness,
  recordMathAttempt,
} from '../progress';

describe('progress', () => {
  it('levels need 100·n XP each', () => {
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100).level).toBe(2);
    expect(levelForXp(300).level).toBe(3);
  });

  it('proficiency is 0 with no engagement, 100 with full coverage + reliability', () => {
    const m = modules.find((x) => x.id === 'm01-site-conditions')!;
    expect(moduleProficiency(m, undefined)).toBe(0);
    const stats = emptyModuleStats();
    for (const q of m.quiz) stats.questions[q.id] = { attempts: 1, correct: 1, everCorrect: true };
    for (const d of m.decisionPoints) stats.decisionsSeen.push(d.id);
    expect(moduleProficiency(m, stats)).toBe(100);
  });

  it('difficulty unlocks after 4 of 5 at the frontier', () => {
    let s = emptyMathStats();
    for (let i = 0; i < 4; i++) s = recordMathAttempt(s, true, 0, 1);
    expect(s.unlockedDifficulty).toBe(1);
    s = recordMathAttempt(s, true, 0, 1);
    expect(s.unlockedDifficulty).toBe(2);
    // attempts at a lower level don't advance the frontier
    for (let i = 0; i < 5; i++) s = recordMathAttempt(s, true, 0, 1);
    expect(s.unlockedDifficulty).toBe(2);
  });

  it('math readiness grows with accuracy, ladder, and volume', () => {
    let s = emptyMathStats();
    expect(mathReadiness(s)).toBe(0);
    for (let i = 0; i < 10; i++) s = recordMathAttempt(s, true, 2, s.unlockedDifficulty);
    const r1 = mathReadiness(s);
    for (let i = 0; i < 20; i++) s = recordMathAttempt(s, true, 2, s.unlockedDifficulty);
    expect(mathReadiness(s)).toBeGreaterThan(r1);
  });

  it('project readiness only grades non-placeholder modules', () => {
    const r = projectReadiness(modules, {}, emptyMathStats(), [], 1);
    expect(r.overall).toBe(0);
    expect(r.knowledge).toBe(0);
  });

  it('groundbreak countdown is positive before September 2026', () => {
    const july = new Date('2026-07-11T12:00:00Z').getTime();
    expect(daysToGroundbreak(july)).toBeGreaterThan(40);
    const after = new Date('2026-10-01T12:00:00Z').getTime();
    expect(daysToGroundbreak(after)).toBe(0);
  });
});
