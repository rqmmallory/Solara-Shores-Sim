import { modules, simPhases } from '..';
import { validateFlagGraph, validateModule, validateSimPhase } from '../validate';

describe('content validation', () => {
  it('has 33 modules across the three KB volumes', () => {
    expect(modules).toHaveLength(33);
    expect(modules.map((m) => m.order)).toEqual([...Array(33)].map((_, i) => i + 1));
    // volume boundaries: M1-14 project, S1-10 science, V3-1..9 physics
    expect(modules.filter((m) => m.id.startsWith('m'))).toHaveLength(14);
    expect(modules.filter((m) => m.id.startsWith('s'))).toHaveLength(10);
    expect(modules.filter((m) => m.id.startsWith('v'))).toHaveLength(9);
  });

  it('module ids are unique', () => {
    const ids = modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(modules.map((m) => [m.id, m] as const))('%s passes schema validation', (_id, m) => {
    expect(validateModule(m)).toEqual([]);
  });

  it.each(simPhases.map((p) => [p.id, p] as const))('sim phase %s passes validation', (_id, p) => {
    expect(validateSimPhase(p)).toEqual([]);
  });

  it('has 7 sim phases in order', () => {
    expect(simPhases.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('cross-phase flag graph is closed — every referenced flag is settable earlier', () => {
    expect(validateFlagGraph(simPhases)).toEqual([]);
  });

  it('every non-placeholder question teaches (explanation present)', () => {
    for (const m of modules) {
      for (const q of m.quiz) {
        expect(q.explanation.length).toBeGreaterThan(20);
      }
    }
  });
});
