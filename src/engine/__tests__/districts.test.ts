import { siteZones } from '../../content/siteMap';
import { simPhases } from '../../content';
import {
  accrue,
  ceilingStage,
  districtOfZone,
  districtPercent,
  DISTRICTS,
  initialProgress,
  stageAt,
  stageFraction,
} from '../districts';

const DAY = 86_400_000;

describe('district ↔ zone mapping', () => {
  it('assigns every master-plan zone to exactly one district', () => {
    const assigned = DISTRICTS.flatMap((d) => d.zoneIds);
    expect(new Set(assigned).size).toBe(assigned.length); // no zone twice
    for (const z of siteZones) expect(districtOfZone(z.id)).toBeDefined();
    expect(assigned.sort()).toEqual(siteZones.map((z) => z.id).sort());
  });

  it('every checkpoint references a real phase and an in-range stage', () => {
    const phaseIds = new Set(simPhases.map((p) => p.id));
    for (const d of DISTRICTS) {
      for (const cp of d.checkpoints) {
        expect(phaseIds.has(cp.phaseId)).toBe(true);
        expect(cp.stage).toBeGreaterThanOrEqual(0);
        expect(cp.stage).toBeLessThan(d.stages.length);
      }
    }
  });
});

describe('ceilingStage', () => {
  const housing = DISTRICTS.find((d) => d.id === 'housing')!;

  it('is 0 before any authorising phase', () => {
    expect(ceilingStage(housing, new Set())).toBe(0);
  });

  it('rises as authorising phases complete and never exceeds the stage list', () => {
    const afterHoriz = ceilingStage(housing, new Set(['phase2-marine-horizontal']));
    const afterVert = ceilingStage(housing, new Set(['phase2-marine-horizontal', 'phase3-vertical-amenity']));
    expect(afterVert).toBeGreaterThan(afterHoriz);
    const all = ceilingStage(housing, new Set(simPhases.map((p) => p.id)));
    expect(all).toBe(housing.stages.length - 1);
  });
});

describe('accrue — idle fill', () => {
  const housing = DISTRICTS.find((d) => d.id === 'housing')!;

  it('does not advance past the ceiling no matter how much time passes', () => {
    const p = initialProgress(0);
    const filled = accrue(p, housing, 6, 1000 * DAY, 1); // a thousand days
    expect(filled.pos).toBe(6);
  });

  it('accrues proportional to elapsed time and rate', () => {
    const p = initialProgress(0);
    // base rate 1.0 stage/day for housing → 3 days ≈ 3 stages (under ceiling 6)
    const filled = accrue(p, housing, 6, 3 * DAY, 1);
    expect(filled.pos).toBeCloseTo(3, 5);
    expect(filled.lastTickAt).toBe(3 * DAY);
  });

  it('a higher rate multiplier builds faster', () => {
    const slow = accrue(initialProgress(0), housing, 6, 2 * DAY, 1);
    const fast = accrue(initialProgress(0), housing, 6, 2 * DAY, 1.5);
    expect(fast.pos).toBeGreaterThan(slow.pos);
  });

  it('never goes backward and is a no-op when no time passed', () => {
    const p = { pos: 4.2, lastTickAt: 5 * DAY };
    expect(accrue(p, housing, 6, 5 * DAY, 1).pos).toBe(4.2);
    expect(accrue(p, housing, 6, 4 * DAY, 1).pos).toBe(4.2); // clock going back
  });

  it('stops filling until the ceiling is raised, then resumes', () => {
    let p = accrue(initialProgress(0), housing, 3, 10 * DAY, 1); // fills to 3 (capped)
    expect(p.pos).toBe(3);
    p = accrue(p, housing, 6, 12 * DAY, 1); // ceiling raised, 2 more days
    expect(p.pos).toBeGreaterThan(3);
    expect(p.pos).toBeLessThanOrEqual(6);
  });
});

describe('stage resolution', () => {
  const housing = DISTRICTS.find((d) => d.id === 'housing')!;

  it('resolves a continuous position to a discrete stage and fraction', () => {
    expect(stageAt(housing, 0).key).toBe('raw');
    expect(stageAt(housing, 8.6).key).toBe(housing.stages[8].key);
    expect(stageFraction(8.6)).toBeCloseTo(0.6, 5);
  });

  it('clamps out-of-range positions', () => {
    expect(stageAt(housing, -5).key).toBe('raw');
    expect(stageAt(housing, 999).key).toBe('complete');
  });

  it('reports district completion percent', () => {
    expect(districtPercent(housing, 0)).toBe(0);
    expect(districtPercent(housing, housing.stages.length - 1)).toBe(100);
  });
});
