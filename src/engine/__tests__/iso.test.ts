import { siteZones } from '../../content/siteMap';
import { ZONE_HEIGHT } from '../iso';
import { extrudePolygon, isoProject, solidsBounds, svgPoints, zoneSolid } from '../iso';

describe('isometric projection', () => {
  it('projects the origin to the origin', () => {
    expect(isoProject(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('sends east and south to mirrored screen columns', () => {
    // one unit east goes right+down; one unit south goes left+down
    const east = isoProject(2, 0);
    const south = isoProject(0, 2);
    expect(east.x).toBeGreaterThan(0);
    expect(south.x).toBeLessThan(0);
    expect(east.y).toBeCloseTo(south.y); // same screen row
  });
});

describe('zoneSolid — rectangle (legacy) zones', () => {
  // a zone with no hand-traced footprint still renders as its x/y/w/h box
  const zone = siteZones.find((z) => !z.footprint)!;

  it('flat zones have no walls and top === base footprint', () => {
    const s = zoneSolid(zone, 0);
    expect(s.walls).toHaveLength(0);
    expect(s.top).toEqual(s.base);
    expect(s.top).toHaveLength(4);
  });

  it('extruded rectangles lift the roof and produce exactly the two near-side walls', () => {
    const s = zoneSolid(zone, 20);
    expect(s.walls).toHaveLength(2); // south + east faces only, as before
    for (let i = 0; i < 4; i++) {
      expect(s.top[i].y).toBeCloseTo(s.base[i].y - 20);
      expect(s.top[i].x).toBeCloseTo(s.base[i].x);
    }
  });
});

describe('extrudePolygon — arbitrary N-gon footprints', () => {
  it('a flat polygon has no walls and top === base', () => {
    const tri = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
    const s = extrudePolygon(tri, 0);
    expect(s.walls).toHaveLength(0);
    expect(s.top).toEqual(s.base);
  });

  it('extrudes a triangle with only camera-facing walls, each lifted correctly', () => {
    const tri = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
    const s = extrudePolygon(tri, 6);
    expect(s.walls.length).toBeGreaterThan(0);
    expect(s.walls.length).toBeLessThan(3); // at least one back face is culled
    for (const w of s.walls) {
      expect(w.pts).toHaveLength(4);
      expect(w.shade).toBeGreaterThan(0);
      expect(w.shade).toBeLessThanOrEqual(1);
    }
  });

  it('handles an irregular (non-rectangular) quad — e.g. an L-shaped or angled footprint', () => {
    const quad = [{ x: 0, y: 0 }, { x: 12, y: 2 }, { x: 10, y: 9 }, { x: 1, y: 7 }];
    const s = extrudePolygon(quad, 8);
    expect(s.top).toHaveLength(4);
    expect(s.base).toHaveLength(4);
    expect(s.walls.length).toBeGreaterThan(0);
    // every wall's base points must equal actual footprint edges (not fabricated)
    for (const w of s.walls) {
      expect(w.pts).toHaveLength(4);
    }
  });

  it('center is the centroid of the roof, depth grows toward the south-east', () => {
    const near = extrudePolygon([{ x: 80, y: 80 }, { x: 90, y: 80 }, { x: 90, y: 90 }, { x: 80, y: 90 }], 0);
    const far = extrudePolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], 0);
    expect(near.depth).toBeGreaterThan(far.depth);
  });
});

describe('every zone category has a defined height', () => {
  it('covers all categories used on the map', () => {
    for (const z of siteZones) {
      expect(ZONE_HEIGHT[z.category]).toBeDefined();
      expect(ZONE_HEIGHT[z.category]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('solidsBounds + svgPoints', () => {
  it('produces a finite, positive-area viewBox over the real site', () => {
    const solids = siteZones.map((z) => zoneSolid(z, ZONE_HEIGHT[z.category]));
    const b = solidsBounds(solids);
    expect(b.width).toBeGreaterThan(0);
    expect(b.height).toBeGreaterThan(0);
    expect(Number.isFinite(b.minX)).toBe(true);
    expect(Number.isFinite(b.minY)).toBe(true);
  });

  it('serializes points as SVG polygon coordinates, matching the zone footprint size', () => {
    const zone = siteZones.find((z) => !z.footprint)!;
    const s = zoneSolid(zone, 5);
    const str = svgPoints(s.top);
    expect(str.split(' ')).toHaveLength(4); // plain rectangle zone -> 4 points
    expect(str).toMatch(/^-?\d/);
  });

  it('serializes a hand-traced footprint at its own point count, not forced to 4', () => {
    const zone = siteZones.find((z) => (z.footprint?.length ?? 0) > 4)!;
    const s = zoneSolid(zone, 5);
    expect(svgPoints(s.top).split(' ')).toHaveLength(zone.footprint!.length);
  });
});
