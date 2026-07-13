import { siteZones } from '../../content/siteMap';
import { ZONE_HEIGHT } from '../iso';
import { isoProject, solidsBounds, svgPoints, zoneSolid } from '../iso';

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

describe('zoneSolid', () => {
  const zone = siteZones.find((z) => z.category === 'condo')!;

  it('flat zones have no walls and top === base footprint', () => {
    const s = zoneSolid(zone, 0);
    expect(s.left).toHaveLength(0);
    expect(s.right).toHaveLength(0);
    expect(s.top).toEqual(s.base);
    expect(s.top).toHaveLength(4);
  });

  it('extruded zones lift the roof above the base and grow two walls', () => {
    const s = zoneSolid(zone, 20);
    expect(s.left).toHaveLength(4);
    expect(s.right).toHaveLength(4);
    // every roof point sits above (smaller screen-y than) its base point
    for (let i = 0; i < 4; i++) {
      expect(s.top[i].y).toBeCloseTo(s.base[i].y - 20);
      expect(s.top[i].x).toBeCloseTo(s.base[i].x);
    }
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

  it('serializes points as SVG polygon coordinates', () => {
    const s = zoneSolid(siteZones[0], 5);
    const str = svgPoints(s.top);
    expect(str.split(' ')).toHaveLength(4);
    expect(str).toMatch(/^-?\d/);
  });
});
