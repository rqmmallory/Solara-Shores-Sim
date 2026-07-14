import { siteZones } from '../../content/siteMap';
import { resolveZoneVisual, siteBuildProgress, unknownPhaseRefs } from '../siteMapState';
import { simPhases } from '../../content';

const zone = (id: string) => siteZones.find((z) => z.id === id)!;
const cx = (id: string) => zone(id).x + zone(id).w / 2;

describe('Sheet A1 east-west orientation', () => {
  it('puts the marina/condos at the WEST (low x) and road/retail at the EAST (high x)', () => {
    // marina point is west of the whole commercial/road core
    expect(cx('marina-basin')).toBeLessThan(cx('lots-wave-1'));
    expect(cx('lots-wave-1')).toBeLessThan(cx('road-frontage'));
    expect(cx('marina-basin')).toBeLessThan(cx('retail-block'));
    expect(cx('clubhouse')).toBeLessThan(cx('senior-living'));
  });

  it('keeps every rotated zone inside the 0-100 canvas', () => {
    for (const z of siteZones) {
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.x + z.w).toBeLessThanOrEqual(100.01);
      expect(z.y + z.h).toBeLessThanOrEqual(100.01);
      if (z.footprint) {
        for (const p of z.footprint) {
          expect(p.x).toBeGreaterThanOrEqual(-0.01);
          expect(p.x).toBeLessThanOrEqual(100.01);
          expect(p.y).toBeGreaterThanOrEqual(-0.01);
          expect(p.y).toBeLessThanOrEqual(100.01);
        }
      }
    }
  });
});

describe('site map zone data', () => {
  it('has unique zone ids', () => {
    const ids = siteZones.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every zone stays within the 0-100 canvas bounds', () => {
    for (const z of siteZones) {
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.x + z.w).toBeLessThanOrEqual(100.01);
      expect(z.y + z.h).toBeLessThanOrEqual(100.01);
    }
  });

  it('every hand-traced footprint is a valid polygon within canvas bounds', () => {
    for (const z of siteZones) {
      if (!z.footprint) continue;
      expect(z.footprint.length).toBeGreaterThanOrEqual(3);
      for (const p of z.footprint) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100.01);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(100.01);
      }
    }
  });

  it('estate build progress rises monotonically as phases complete', () => {
    const empty = siteBuildProgress(siteZones, new Set());
    expect(empty).toBe(0);
    const afterPrep = siteBuildProgress(siteZones, new Set(['phase1-site-prep']));
    expect(afterPrep).toBeGreaterThan(empty);
    const allPhases = siteBuildProgress(siteZones, new Set(simPhases.map((p) => p.id)));
    expect(allPhases).toBeGreaterThan(afterPrep);
    expect(allPhases).toBeLessThanOrEqual(100);
  });

  it('every stage references a real, correctly-ordered sim phase', () => {
    expect(unknownPhaseRefs(siteZones)).toEqual([]);
  });

  it('every zone has at least one build stage', () => {
    for (const z of siteZones) expect(z.stages.length).toBeGreaterThan(0);
  });
});

describe('resolveZoneVisual', () => {
  const zone = siteZones.find((z) => z.id === 'lots-wave-1')!;

  it('shows raw land with nothing completed', () => {
    const v = resolveZoneVisual(zone, new Set());
    expect(v.tier).toBe('raw');
  });

  it('shows cleared once Phase 1 completes but before the zone\'s own stage', () => {
    const v = resolveZoneVisual(zone, new Set(['phase1-site-prep']));
    expect(v.tier).toBe('cleared');
  });

  it('advances to the latest completed stage in phase order', () => {
    const v = resolveZoneVisual(
      zone,
      new Set(['phase1-site-prep', 'phase2-marine-horizontal'])
    );
    expect(v.tier).toBe('built');
    expect(v.label).toMatch(/roads/i);

    const v2 = resolveZoneVisual(
      zone,
      new Set(['phase1-site-prep', 'phase2-marine-horizontal', 'phase3-vertical-amenity'])
    );
    expect(v2.label).toMatch(/wave 1 built/i);
    expect(v2.progress).toBe(1);
  });
});
