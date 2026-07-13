/**
 * Isometric projection math for the living site map. Pure geometry — no
 * rendering — so it can be unit-tested. Zones project a top-down plan
 * footprint (either a simple rectangle, or an arbitrary hand-traced polygon —
 * a marina outline, a condo silhouette, a lake) into a 2.5D isometric scene:
 * flat parcels become ground shapes and built parcels extrude into shaded
 * volumes that rise out of the ground.
 *
 * Plan space: X is 0..100 (canvas width %), Y is scaled by 1/CANVAS_ASPECT
 * so the tall New Providence wedge keeps its real proportions in iso.
 */
import { CANVAS_ASPECT, SiteZone, ZoneCategory } from '../content/siteMap';

export interface Pt {
  x: number;
  y: number;
}

// 2:1 isometric: one plan unit east is (ISO_X, ISO_Y), one unit south is
// (-ISO_X, ISO_Y). Screen scaling is handled by the SVG viewBox, so these
// are unitless.
export const ISO_X = 1;
export const ISO_Y = 0.5;

/** project a top-down plan point into isometric screen space */
export function isoProject(px: number, py: number): Pt {
  return { x: (px - py) * ISO_X, y: (px + py) * ISO_Y };
}

/**
 * Extrusion height (plan units) a parcel reaches once BUILT. 0 = stays flat
 * (roads, water, beach, greens read as ground textures, not volumes).
 */
export const ZONE_HEIGHT: Record<ZoneCategory, number> = {
  road: 0,
  retail: 11,
  senior: 14,
  infra: 5,
  lots: 7,
  green: 0,
  amenity: 4,
  estate: 7,
  marina: 0,
  condo: 24,
  clubhouse: 18,
  beach: 0,
};

/** one visible wall face: its projected quad and a 0..1 shade factor */
export interface WallFace {
  pts: Pt[];
  shade: number;
}

export interface ZoneSolid {
  /** roof / ground-footprint polygon, N points (matches the footprint) */
  top: Pt[];
  /** ground footprint polygon — the base shadow the volume sits on */
  base: Pt[];
  /** visible (camera-facing) wall quads, empty when flat */
  walls: WallFace[];
  height: number;
  /** centroid of the roof, for labels/icons */
  center: Pt;
  /** painter's-order depth: larger = nearer the viewer, drawn later */
  depth: number;
}

/** convert a zone's plan Y percentage into proportional plan units */
function planY(pct: number): number {
  return pct / CANVAS_ASPECT;
}

/**
 * Extrude an arbitrary plan-space polygon (already in iso plan units — Y
 * pre-scaled by planY) to `height` plan units. Works for any simple polygon,
 * not just rectangles: a triangle, an L-shape, a hand-traced building outline.
 *
 * Wall visibility: for a 2:1 isometric camera looking from the south-east, an
 * edge is camera-facing if its midpoint lies south-east of the polygon's
 * centroid (i.e. `(mx - cx) + (my - cy) > 0`) — the same test that already
 * identified exactly the two near-side walls of a rectangle, generalized to N
 * edges. Each visible wall is shaded toward whichever axis (east/south) its
 * outward direction dominates, matching the existing two-tone convention.
 */
export function extrudePolygon(planPoints: Pt[], height: number): ZoneSolid {
  const n = planPoints.length;
  const base = planPoints.map((p) => isoProject(p.x, p.y));
  const lift = (p: Pt): Pt => ({ x: p.x, y: p.y - height });
  const top = base.map(lift);

  const cx = planPoints.reduce((a, p) => a + p.x, 0) / n;
  const cy = planPoints.reduce((a, p) => a + p.y, 0) / n;

  const walls: WallFace[] = [];
  if (height > 0) {
    for (let i = 0; i < n; i++) {
      const p1 = planPoints[i];
      const p2 = planPoints[(i + 1) % n];
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = mx - cx;
      const dy = my - cy;
      if (dx + dy <= 0) continue; // back-facing — hidden behind the roof/near walls
      const b1 = base[i];
      const b2 = base[(i + 1) % n];
      const t1 = top[i];
      const t2 = top[(i + 1) % n];
      const shade = Math.abs(dx) > Math.abs(dy) ? 0.78 : 0.55; // east-ish : south-ish
      walls.push({ pts: [b1, b2, t2, t1], shade });
    }
  }

  const center = {
    x: top.reduce((a, p) => a + p.x, 0) / n,
    y: top.reduce((a, p) => a + p.y, 0) / n,
  };
  const depth = cx + cy;

  return { top, base, walls, height, center, depth };
}

/**
 * Build the projected solid for a content zone, extruded to `height` plan
 * units. Zones with a hand-traced `footprint` extrude that polygon directly;
 * legacy rectangle zones (`x`/`y`/`w`/`h` only) extrude their bounding box.
 */
export function zoneSolid(zone: SiteZone, height: number): ZoneSolid {
  const planPoints: Pt[] = zone.footprint
    ? zone.footprint.map((p) => ({ x: p.x, y: planY(p.y) }))
    : rectCorners(zone.x, zone.y, zone.w, zone.h);
  return extrudePolygon(planPoints, height);
}

function rectCorners(x: number, y: number, w: number, h: number): Pt[] {
  const x0 = x;
  const x1 = x + w;
  const y0 = planY(y);
  const y1 = planY(y + h);
  return [
    { x: x0, y: y0 }, // N
    { x: x1, y: y0 }, // E
    { x: x1, y: y1 }, // S
    { x: x0, y: y1 }, // W
  ];
}

export interface IsoBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** tight bounding box over every point of every solid, for the SVG viewBox */
export function solidsBounds(solids: ZoneSolid[], pad = 4): IsoBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const eat = (pts: Pt[]) => {
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  };
  for (const s of solids) {
    eat(s.base);
    eat(s.top);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, width: 1, height: 1 };
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

/** serialize projected points into an SVG `points` string */
export function svgPoints(pts: Pt[]): string {
  return pts.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
