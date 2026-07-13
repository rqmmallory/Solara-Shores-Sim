/**
 * Isometric projection math for the living site map. Pure geometry — no
 * rendering — so it can be unit-tested. The map reuses the real master-plan
 * zone rectangles from content/siteMap (top-down percentages) and projects
 * them into a 2.5D isometric scene: flat parcels become ground diamonds and
 * built parcels extrude into shaded 3D volumes that rise out of the ground.
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

export interface ZoneSolid {
  /** roof / ground-footprint diamond (4 pts) */
  top: Pt[];
  /** left visible wall (empty when flat) */
  left: Pt[];
  /** right visible wall (empty when flat) */
  right: Pt[];
  /** ground footprint diamond (4 pts) — the base shadow the volume sits on */
  base: Pt[];
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
 * Build the projected faces of one zone extruded to `height` plan units.
 * A height of 0 yields a flat diamond (top === base, no walls).
 */
export function zoneSolid(zone: SiteZone, height: number): ZoneSolid {
  const x0 = zone.x;
  const x1 = zone.x + zone.w;
  const y0 = planY(zone.y);
  const y1 = planY(zone.y + zone.h);

  // ground footprint corners, projected (N, E, S, W of the diamond)
  const gN = isoProject(x0, y0);
  const gE = isoProject(x1, y0);
  const gS = isoProject(x1, y1);
  const gW = isoProject(x0, y1);
  const base = [gN, gE, gS, gW];

  // up is negative screen-y
  const lift = (p: Pt): Pt => ({ x: p.x, y: p.y - height });
  const rN = lift(gN);
  const rE = lift(gE);
  const rS = lift(gS);
  const rW = lift(gW);
  const top = [rN, rE, rS, rW];

  // the two walls meeting at the front (nearest) corner gS
  const right = height > 0 ? [gE, gS, rS, rE] : [];
  const left = height > 0 ? [gS, gW, rW, rS] : [];

  const center = { x: (rN.x + rS.x) / 2, y: (rN.y + rS.y) / 2 };
  // depth by footprint centroid: farther parcels (small x+y) drawn first
  const depth = x0 + x1 + y0 + y1;

  return { top, left, right, base, height, center, depth };
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
