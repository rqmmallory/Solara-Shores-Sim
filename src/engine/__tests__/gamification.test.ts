import { modules } from '../../content';
import { LEARNING_PATH, nextOnPath, PATH_THRESHOLD, pathProgress } from '../learningPath';
import { PHASE_PREP, PREP_THRESHOLD, prepStatus } from '../prep';
import { capitalForXp, emptyModuleStats, ModuleStats } from '../progress';
import { ADVISORS, applyAdvisor, availableAdvisors, initialSimState } from '../sim';
import { simPhases } from '../../content';

/** build stats where the given modules are fully mastered */
function masteredStats(moduleIds: string[]): Record<string, ModuleStats> {
  const stats: Record<string, ModuleStats> = {};
  for (const id of moduleIds) {
    const m = modules.find((x) => x.id === id)!;
    const s = emptyModuleStats();
    for (const q of m.quiz) s.questions[q.id] = { attempts: 1, correct: 1, everCorrect: true };
    for (const d of m.decisionPoints) s.decisionsSeen.push(d.id);
    stats[id] = s;
  }
  return stats;
}

describe('CM Capital earn rule', () => {
  it('grants B$1 per 2 XP, rounded up, never negative', () => {
    expect(capitalForXp(10)).toBe(5);
    expect(capitalForXp(15)).toBe(8);
    expect(capitalForXp(0)).toBe(0);
    expect(capitalForXp(-5)).toBe(0);
  });
});

describe('sim advisors', () => {
  const phase = simPhases[0];

  it('QS review reveals effects; each advisor applies once', () => {
    let s = initialSimState(phase);
    expect(s.revealEffects).toBe(false);
    s = applyAdvisor(s, 'qs-review');
    expect(s.revealEffects).toBe(true);
    expect(s.advisorsUsed).toContain('qs-review');
    const again = applyAdvisor(s, 'qs-review');
    expect(again).toBe(s); // no double-apply
  });

  it('reserve release cuts cost variance; acceleration recovers days', () => {
    let s = initialSimState(phase);
    s = applyAdvisor(s, 'reserve-release');
    expect(s.costVariance).toBe(-300000);
    s = applyAdvisor(s, 'acceleration');
    expect(s.slipDays).toBe(-5);
    expect(s.log.filter((l) => l.kind === 'info')).toHaveLength(2);
  });

  it('advisor list has positive costs and unique ids', () => {
    const ids = ADVISORS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ADVISORS) expect(a.cost).toBeGreaterThan(0);
  });

  it('gates higher-tier advisors behind CM rank', () => {
    const atStart = availableAdvisors(0).map((a) => a.id);
    expect(atStart).toContain('qs-review'); // rank 0 always available
    expect(atStart).not.toContain('safety-audit'); // unlocks at rank 2
    expect(atStart).not.toContain('value-engineering'); // unlocks at rank 4

    const veteran = availableAdvisors(5).map((a) => a.id);
    expect(veteran).toContain('safety-audit');
    expect(veteran).toContain('crew-welfare');
    expect(veteran).toContain('value-engineering');
  });

  it('new advisors move the safety, morale and cost meters', () => {
    const s0 = initialSimState(phase);
    expect(applyAdvisor(s0, 'safety-audit').safety).toBe(Math.min(100, s0.safety + 18));
    expect(applyAdvisor(s0, 'crew-welfare').morale).toBe(Math.min(100, s0.morale + 20));
    expect(applyAdvisor(s0, 'value-engineering').costVariance).toBe(s0.costVariance - 250000);
  });
});

describe('prep-bonus interlock', () => {
  it('every phase has linked prep modules that exist', () => {
    for (const p of simPhases) {
      const ids = PHASE_PREP[p.id];
      expect(ids?.length).toBeGreaterThan(0);
      for (const id of ids) expect(modules.some((m) => m.id === id)).toBe(true);
    }
  });

  it('unstudied modules do not qualify; mastered ones do', () => {
    const cold = prepStatus('phase1-site-prep', {});
    expect(cold.qualified).toBe(false);
    expect(cold.avgProficiency).toBe(0);

    const warm = prepStatus('phase1-site-prep', masteredStats(PHASE_PREP['phase1-site-prep']));
    expect(warm.qualified).toBe(true);
    expect(warm.avgProficiency).toBeGreaterThanOrEqual(PREP_THRESHOLD);
  });
});

describe('learning path', () => {
  it('covers every module exactly once', () => {
    expect(LEARNING_PATH).toHaveLength(modules.length);
    expect(new Set(LEARNING_PATH).size).toBe(LEARNING_PATH.length);
    for (const id of LEARNING_PATH) expect(modules.some((m) => m.id === id)).toBe(true);
  });

  it('starts from the site itself, then physics before trade science', () => {
    expect(LEARNING_PATH[0]).toBe('m01-site-conditions');
    expect(LEARNING_PATH.indexOf('v31-loads')).toBeLessThan(LEARNING_PATH.indexOf('s03-reinforcement'));
    expect(LEARNING_PATH.indexOf('v33-water-buoyancy')).toBeLessThan(LEARNING_PATH.indexOf('m04-marina'));
  });

  it('nextOnPath returns the first unfinished step and advances with mastery', () => {
    expect(nextOnPath({})?.moduleId).toBe('m01-site-conditions');
    const stats = masteredStats(['m01-site-conditions']);
    expect(nextOnPath(stats)?.moduleId).toBe('m02-permitting');
    const all = pathProgress(masteredStats(LEARNING_PATH));
    expect(all.every((s) => s.done && s.proficiency >= PATH_THRESHOLD)).toBe(true);
    expect(nextOnPath(masteredStats(LEARNING_PATH))).toBeNull();
  });
});
