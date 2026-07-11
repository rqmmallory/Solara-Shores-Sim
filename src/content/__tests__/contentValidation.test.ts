import { modules, simPhases } from '..';
import { validateModule, validateSimPhase } from '../validate';

describe('content validation', () => {
  it('has 14 modules mirroring the research doc', () => {
    expect(modules).toHaveLength(14);
    expect(modules.map((m) => m.order)).toEqual([...Array(14)].map((_, i) => i + 1));
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

  it('every non-placeholder question teaches (explanation present)', () => {
    for (const m of modules) {
      for (const q of m.quiz) {
        expect(q.explanation.length).toBeGreaterThan(20);
      }
    }
  });
});
