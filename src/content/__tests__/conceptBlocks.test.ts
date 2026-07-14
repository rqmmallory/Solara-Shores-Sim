import { modules } from '..';
import { isPrinciple, PRINCIPLES } from '../principles';
import { DIAGRAM_IDS, hasDiagram } from '../../ui/diagrams';
import { validateModule } from '../validate';

describe('principle registry', () => {
  it('has unique ids and a statement for each', () => {
    const ids = PRINCIPLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PRINCIPLES) {
      expect(p.statement.length).toBeGreaterThan(10);
      expect(isPrinciple(p.id)).toBe(true);
    }
  });
});

describe('concept blocks across all modules', () => {
  const withConcepts = modules.filter((m) => (m.concepts?.length ?? 0) > 0);

  it('at least one module ships a concept block (the v33 exemplar)', () => {
    expect(withConcepts.some((m) => m.id === 'v33-water-buoyancy')).toBe(true);
  });

  it('every concept passes structural validation (mechanism, diagram, applied)', () => {
    for (const m of modules) {
      const errs = validateModule(m).filter((e) => /concept|BEAT|applied|principleId/i.test(e));
      expect(errs).toEqual([]);
    }
  });

  it('every concept references a real principle and a drawn (non-placeholder) diagram', () => {
    for (const m of withConcepts) {
      for (const c of m.concepts!) {
        expect(isPrinciple(c.principleId)).toBe(true);
        // a shipped concept should point at a REAL diagram, not the pending placeholder
        expect(hasDiagram(c.diagramId)).toBe(true);
      }
    }
  });

  it('the diagram library exposes its ids', () => {
    expect(DIAGRAM_IDS).toContain('hydrostatic-uplift');
    expect(DIAGRAM_IDS).toContain('load-path');
    expect(DIAGRAM_IDS).toContain('tension-location');
  });
});
