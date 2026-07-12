import { siteZones } from '../../content/siteMap';
import { resolveZoneVisual, unknownPhaseRefs } from '../siteMapState';

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
