/**
 * Scene dressing for the living site map: pure geometry, no rendering.
 *
 * Turns each parcel's plan footprint plus its work front's live construction
 * stage into what a building-sim player expects to see: bush that gets
 * cleared, pads poured, house frames that go up one by one, roofs, pastel
 * blockwork, palms and parked cars; condo frames that rise floor by floor
 * under tower cranes; lakes that fill; boats once the marina floods.
 *
 * Everything is deterministic (seeded by zone id) so the scene never
 * reshuffles between renders, and output is pre-projected SVG path data.
 * Faces of the same colour are merged into one path per parcel, so the whole
 * estate draws as a few hundred SVG nodes, light enough for Expo Go.
 */
import type { SiteZone } from '../content/siteMap';
import { District, DistrictProgress, districtById, districtOfZone } from './districts';
import { IsoBounds, isoProject, Pt, zonePlanPolygon } from './iso';

// ---- palette (Nassau light: limestone, sea, bush, pastel blockwork) --------

export const PAL = {
  bush: '#3D6A34',
  bushDark: '#2C5127',
  bushLight: '#5A8F45',
  scrub: '#B9A56E',
  dirt: '#9B7A4C',
  dirtDark: '#7A5D38',
  pit: '#5B4630',
  gravel: '#8C7B5C',
  asphalt: '#3A3F47',
  marking: '#E9E2C9',
  concrete: '#B7BCC2',
  stone: '#CDBFA4',
  lawn: '#5C9A45',
  lawnLight: '#6FAE52',
  sand: '#ECD9A0',
  sandRaw: '#C9B27A',
  water: '#2A8FB5',
  waterLight: '#5FBEDD',
  frame: '#C8A06A',
  glassDay: '#8DBBD6',
  glassNight: '#FFD27A',
  trunk: '#6B4E2E',
  palm: '#3E8A3A',
  palmLight: '#62B04F',
  limestone: '#D8CBA4',
  earth: '#8A7552',
  earthDark: '#5E5138',
  dock: '#D9CFB8',
  condoWall: '#ECE7DC',
  roofFlat: '#D7D3CB',
};

const PASTELS = ['#F2D16B', '#F4A7B9', '#8FD1E0', '#B7E3A1', '#F6C89F', '#ECE7DC', '#C9B6E4'];
const ROOFS = ['#C75B3A', '#E9E6DF', '#6B7F8F', '#B4553A'];
const CARS = ['#D64545', '#3A6FD8', '#EDEDED', '#2B2B2B', '#E3B23C'];

/** shadow direction per unit of height, in plan units (falls to screen-right) */
const SUN = { x: 0.55, y: -0.22 };

// ---- small deterministic helpers -------------------------------------------

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG seeded from a string: same seed, same sequence, every render */
export function seeded(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function polygonArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
  return Math.abs(s) / 2;
}

function centroid(poly: Pt[]): Pt {
  return {
    x: poly.reduce((a, p) => a + p.x, 0) / poly.length,
    y: poly.reduce((a, p) => a + p.y, 0) / poly.length,
  };
}

/** Andrew's monotone chain; returns the hull counter-clockwise */
export function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** push every vertex away from the centroid by `by` (negative shrinks) */
function inflate(poly: Pt[], by: number): Pt[] {
  const c = centroid(poly);
  return poly.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * by, y: p.y + (dy / d) * by };
  });
}

function scaleAbout(poly: Pt[], k: number): Pt[] {
  const c = centroid(poly);
  return poly.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }));
}

function bbox(poly: Pt[]) {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function rectFits(poly: Pt[], cx: number, cy: number, hw: number, hd: number): boolean {
  return (
    pointInPolygon({ x: cx - hw, y: cy - hd }, poly) &&
    pointInPolygon({ x: cx + hw, y: cy - hd }, poly) &&
    pointInPolygon({ x: cx + hw, y: cy + hd }, poly) &&
    pointInPolygon({ x: cx - hw, y: cy + hd }, poly)
  );
}

/** the longest inside-interval of the polygon along a line of constant x (axis 'y') or y (axis 'x') */
function spanAt(poly: Pt[], at: number, axis: 'x' | 'y'): [number, number] | null {
  const hits: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const [ak, bk, av, bv] = axis === 'y' ? [a.x, b.x, a.y, b.y] : [a.y, b.y, a.x, b.x];
    if (ak > at !== bk > at) hits.push(av + ((at - ak) / (bk - ak)) * (bv - av));
  }
  hits.sort((m, n) => m - n);
  let best: [number, number] | null = null;
  for (let i = 0; i + 1 < hits.length; i += 2) {
    if (!best || hits[i + 1] - hits[i] > best[1] - best[0]) best = [hits[i], hits[i + 1]];
  }
  return best;
}

/** rejection-sampled points inside a polygon, at least `minDist` apart */
function scatter(poly: Pt[], count: number, minDist: number, rand: () => number, avoid: Pt[][] = []): Pt[] {
  const b = bbox(poly);
  const out: Pt[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const p = { x: b.x0 + rand() * (b.x1 - b.x0), y: b.y0 + rand() * (b.y1 - b.y0) };
    if (!rectFits(poly, p.x, p.y, 0.4, 0.4)) continue;
    if (avoid.some((a) => pointInPolygon(p, a))) continue;
    if (out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < minDist)) continue;
    out.push(p);
  }
  return out;
}

// ---- projection + path strings ----------------------------------------------

const r2 = (n: number) => Math.round(n * 100) / 100;

/** plan (x, y) at height z → screen */
function proj(x: number, y: number, z = 0): Pt {
  const s = isoProject(x, y);
  return { x: s.x, y: s.y - z };
}

export function polyD(pts: Pt[]): string {
  return 'M' + pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join('L') + 'Z';
}

function circleD(c: Pt, r: number): string {
  return `M${r2(c.x - r)},${r2(c.y)}a${r2(r)},${r2(r)} 0 1,0 ${r2(2 * r)},0a${r2(r)},${r2(r)} 0 1,0 ${r2(-2 * r)},0Z`;
}

function lineD(a: Pt, b: Pt): string {
  return `M${r2(a.x)},${r2(a.y)}L${r2(b.x)},${r2(b.y)}`;
}

/** a plan polygon at height z, projected to a path */
function planD(poly: Pt[], z = 0): string {
  return polyD(poly.map((p) => proj(p.x, p.y, z)));
}

function rect(x0: number, y0: number, x1: number, y1: number): Pt[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export function shadeHex(hex: string, k: number): string {
  const h = hex.replace('#', '');
  const c = (i: number) =>
    Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * k)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(0)}${c(2)}${c(4)}`;
}

// ---- merged-path batches -----------------------------------------------------

export type Prim =
  | { t: 'fill'; d: string; fill: string; op?: number }
  | { t: 'stroke'; d: string; stroke: string; sw: number; dash?: string; op?: number };

/**
 * Collects many sub-shapes and emits one path per (layer, style). Layers are
 * the painter's order inside one parcel (walls before roofs, roofs before
 * windows...), so merging never puts a back face over a front one.
 */
class Batch {
  private groups = new Map<string, { layer: number; seq: number; prim: Prim; parts: string[] }>();
  private seq = 0;
  fill(layer: number, fill: string, d: string, op?: number) {
    this.add(layer, `f|${fill}|${op ?? 1}`, { t: 'fill', d: '', fill, op }, d);
  }
  stroke(layer: number, stroke: string, sw: number, d: string, dash?: string, op?: number) {
    this.add(layer, `s|${stroke}|${sw}|${dash ?? ''}|${op ?? 1}`, { t: 'stroke', d: '', stroke, sw, dash, op }, d);
  }
  private add(layer: number, style: string, prim: Prim, d: string) {
    const key = `${layer}|${style}`;
    const g = this.groups.get(key);
    if (g) g.parts.push(d);
    else this.groups.set(key, { layer, seq: this.seq++, prim, parts: [d] });
  }
  prims(): Prim[] {
    return [...this.groups.values()]
      .sort((a, b) => a.layer - b.layer || a.seq - b.seq)
      .map((g) => ({ ...g.prim, d: g.parts.join('') }));
  }
}

// layer numbers within a parcel
const L = { ground: 0, detail: 1, pad: 2, mark: 3, wall: 10, roofBack: 11, gable: 12, roofFront: 13, window: 14, top: 15, topDetail: 16, tree: 20, treeTop: 21 };

// ---- building blocks -------------------------------------------------------

/** an axis-aligned box: south + east faces (the camera-facing ones) */
function boxWalls(b: Batch, x0: number, y0: number, x1: number, y1: number, z0: number, h: number, color: string) {
  const z1 = z0 + h;
  b.fill(L.wall, shadeHex(color, 0.66), polyD([proj(x0, y1, z0), proj(x1, y1, z0), proj(x1, y1, z1), proj(x0, y1, z1)]));
  b.fill(L.wall, shadeHex(color, 0.84), polyD([proj(x1, y0, z0), proj(x1, y1, z0), proj(x1, y1, z1), proj(x1, y0, z1)]));
}

/** windows in rows × cols on one wall (plan edge a→b, from z0 up h) */
function wallWindows(b: Batch, a: Pt, c: Pt, z0: number, h: number, rows: number, color: string) {
  const len = Math.hypot(c.x - a.x, c.y - a.y);
  const cols = Math.max(1, Math.round(len / 1.1));
  const at = (u: number, z: number) => proj(a.x + (c.x - a.x) * u, a.y + (c.y - a.y) * u, z);
  let d = '';
  for (let r = 0; r < rows; r++) {
    const v0 = z0 + (h * (r + 0.3)) / rows;
    const v1 = z0 + (h * (r + 0.72)) / rows;
    for (let k = 0; k < cols; k++) {
      const u0 = (k + 0.22) / cols;
      const u1 = (k + 0.78) / cols;
      d += polyD([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
    }
  }
  if (d) b.fill(L.window, color, d);
}

/** camera-facing walls of an arbitrary prism, with windows if asked */
function prismWalls(b: Batch, poly: Pt[], h: number, color: string, windows?: { rows: number; color: string }) {
  const c = centroid(poly);
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const dx = (p1.x + p2.x) / 2 - c.x;
    const dy = (p1.y + p2.y) / 2 - c.y;
    if (dx + dy <= 0) continue;
    const k = Math.abs(dx) > Math.abs(dy) ? 0.84 : 0.66;
    b.fill(L.wall, shadeHex(color, k), polyD([proj(p1.x, p1.y, 0), proj(p2.x, p2.y, 0), proj(p2.x, p2.y, h), proj(p1.x, p1.y, h)]));
    if (windows) wallWindows(b, p1, p2, 0, h, windows.rows, windows.color);
  }
}

/** a hip roof: every top edge slopes up to one apex over the centroid */
function hipRoof(b: Batch, poly: Pt[], zt: number, rise: number, color: string) {
  const c = centroid(poly);
  const apex = proj(c.x, c.y, zt + rise);
  for (const front of [false, true]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const dx = (p1.x + p2.x) / 2 - c.x;
      const dy = (p1.y + p2.y) / 2 - c.y;
      if (dx + dy > 0 !== front) continue;
      const k = front ? (Math.abs(dx) > Math.abs(dy) ? 0.88 : 1) : 0.74;
      b.fill(front ? L.roofFront : L.roofBack, shadeHex(color, k), polyD([proj(p1.x, p1.y, zt), proj(p2.x, p2.y, zt), apex]));
    }
  }
}

/** flat roof with a parapet line, for condos and retail */
function flatRoof(b: Batch, poly: Pt[], zt: number, color: string) {
  b.fill(L.top, color, planD(poly, zt));
  b.fill(L.topDetail, shadeHex(color, 0.9), planD(inflate(poly, -0.28), zt));
}

/** a shadow footprint: the prism's base swept along the sun direction */
function shadowOf(poly: Pt[], h: number): string {
  const shifted = poly.map((p) => ({ x: p.x + SUN.x * h, y: p.y + SUN.y * h }));
  return planD(convexHull([...poly, ...shifted]));
}

function treeShadow(p: Pt, h: number, r: number): string {
  const c = { x: p.x + SUN.x * h, y: p.y + SUN.y * h };
  const ring: Pt[] = [];
  for (let i = 0; i < 8; i++) ring.push({ x: c.x + Math.cos((i / 8) * Math.PI * 2) * r, y: c.y + Math.sin((i / 8) * Math.PI * 2) * r });
  return planD(ring);
}

// ---- the scene ----------------------------------------------------------------

export interface SceneObject {
  zoneId: string;
  /** painter's depth: larger = nearer the viewer, drawn later */
  depth: number;
  prims: Prim[];
}

export interface Scene {
  island: Prim[];
  /** per-parcel ground, drawn first; `outline` is the selection ring */
  ground: { zoneId: string; prims: Prim[]; outline: string }[];
  /** every cast shadow as one path, drawn translucent over the ground */
  shadows: string;
  objects: SceneObject[];
  /** screen anchors for the animated layer */
  excavators: Pt[];
  cranes: { base: Pt; height: number }[];
  boats: Pt[];
  bounds: IsoBounds;
  stats: { homesBuilt: number; homesTotal: number };
}

interface Ctx {
  night: boolean;
  shadows: string[];
  objects: SceneObject[];
  excavators: Pt[];
  cranes: { base: Pt; height: number }[];
  boats: Pt[];
  homesBuilt: number;
  homesTotal: number;
}

function stageIx(d: District, key: string): number {
  const i = d.stages.findIndex((s) => s.key === key);
  return i < 0 ? Infinity : i;
}

/** the stage one house in a wave has reached: the wave's stage, or the next one for the first fraction of houses */
export function houseStage(i: number, n: number, pos: number, last: number): number {
  const base = Math.floor(pos);
  const ahead = (i + 0.5) / n < pos - base ? 1 : 0;
  return Math.min(last, base + ahead);
}

/** untouched land: bush (or shoreline scrub) ground, plus its trees as standing objects */
function rawGround(g: Batch, b: Batch, zone: SiteZone, poly: Pt[], scrubby = false) {
  g.fill(L.ground, scrubby ? PAL.scrub : PAL.bush, planD(poly));
  const rand = seeded(`${zone.id}:bush`);
  const count = Math.min(scrubby ? 8 : 26, Math.max(3, Math.round(polygonArea(poly) / (scrubby ? 40 : 14))));
  for (const p of scatter(poly, count, 1.5, rand)) {
    const r = 0.55 + rand() * 0.35;
    const top = proj(p.x, p.y, 0.9 + r);
    b.fill(L.tree, scrubby ? '#7C8A4A' : PAL.bushDark, circleD(top, r));
    b.fill(L.treeTop, scrubby ? '#9AAA5E' : PAL.bushLight, circleD({ x: top.x - r * 0.3, y: top.y - r * 0.3 }, r * 0.55));
  }
}

function palm(b: Batch, ctx: Ctx, p: Pt, lean: number) {
  const base = proj(p.x, p.y, 0);
  const top = proj(p.x + lean * 0.3, p.y - lean * 0.2, 2.1);
  b.stroke(L.tree, PAL.trunk, 0.22, lineD(base, top));
  let fronds = '';
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2 + lean;
    const tip = { x: top.x + Math.cos(ang) * 0.95, y: top.y + Math.sin(ang) * 0.45 + 0.45 };
    const mid = { x: top.x + Math.cos(ang) * 0.5, y: top.y + Math.sin(ang) * 0.25 - 0.25 };
    fronds += `M${r2(top.x)},${r2(top.y)}Q${r2(mid.x)},${r2(mid.y)} ${r2(tip.x)},${r2(tip.y)}`;
  }
  b.stroke(L.treeTop, PAL.palm, 0.32, fronds);
  b.fill(L.treeTop, PAL.palmLight, circleD(top, 0.2));
  ctx.shadows.push(treeShadow(p, 2.1, 0.7));
}

/** one single-family house: pad → frame → roof → pastel blockwork → fit-out → yard → car */
function house(b: Batch, ctx: Ctx, d: District, p: Pt, w: number, dd: number, hs: number, rand: () => number, big: boolean) {
  const x0 = p.x - w / 2;
  const x1 = p.x + w / 2;
  const y0 = p.y - dd / 2;
  const y1 = p.y + dd / 2;
  const S = (k: string) => stageIx(d, k);
  const pastel = PASTELS[Math.floor(rand() * PASTELS.length)];
  const roof = ROOFS[Math.floor(rand() * ROOFS.length)];
  const car = CARS[Math.floor(rand() * CARS.length)];
  const yardTree = rand() < 0.4;
  if (hs < S('slabs')) return;
  if (hs >= S('landscaping')) b.fill(L.pad, PAL.lawnLight, planD(rect(x0 - 0.45, y0 - 0.4, x1 + 0.45, y1 + 0.45)));
  b.fill(L.pad, PAL.concrete, planD(rect(x0 - 0.12, y0 - 0.12, x1 + 0.12, y1 + 0.12)));
  if (big && hs >= S('fitout')) b.fill(L.mark, PAL.waterLight, planD(rect(x0 + 0.1, y1 + 0.25, x1 - 0.3, y1 + 0.75)));
  if (hs < S('framing')) return;
  const wallH = big ? 1.05 : 0.9;
  const framing = hs < S('roofing');
  const h = framing ? wallH * 0.6 : wallH;
  boxWalls(b, x0, y0, x1, y1, 0, h, hs >= S('brickwork') ? pastel : PAL.frame);
  ctx.shadows.push(shadowOf(rect(x0, y0, x1, y1), h + (framing ? 0 : 0.5)));
  if (framing) {
    b.fill(L.top, shadeHex(PAL.frame, 1.1), planD(rect(x0, y0, x1, y1), h));
    return;
  }
  // gable roof, ridge east-west
  const zt = wallH;
  const zr = wallH + (big ? 0.7 : 0.55);
  const ov = 0.1;
  const rx0 = x0 - ov;
  const rx1 = x1 + ov;
  b.fill(L.roofBack, shadeHex(roof, 0.76), polyD([proj(rx0, y0 - ov, zt), proj(rx1, y0 - ov, zt), proj(rx1, p.y, zr), proj(rx0, p.y, zr)]));
  b.fill(L.gable, shadeHex(hs >= S('brickwork') ? pastel : PAL.frame, 0.84), polyD([proj(x1, y0, zt), proj(x1, y1, zt), proj(x1, p.y, zr)]));
  b.fill(L.roofFront, roof, polyD([proj(rx0, y1 + ov, zt), proj(rx1, y1 + ov, zt), proj(rx1, p.y, zr), proj(rx0, p.y, zr)]));
  if (hs >= S('fitout')) {
    const glass = ctx.night ? PAL.glassNight : PAL.glassDay;
    wallWindows(b, { x: x0, y: y1 }, { x: x1, y: y1 }, 0, wallH, 1, glass);
    wallWindows(b, { x: x1, y: y1 }, { x: x1, y: y0 }, 0, wallH, 1, glass);
  }
  if (hs >= S('landscaping') && yardTree) palm(b, ctx, { x: x1 + 0.35, y: y0 - 0.15 }, rand() * 6);
  if (hs >= S('occupancy')) {
    const cx = x0 - 0.15;
    boxWalls(b, cx - 0.5, y1 + 0.1, cx, y1 + 0.38, 0, 0.28, car);
    b.fill(L.top, car, planD(rect(cx - 0.5, y1 + 0.1, cx, y1 + 0.38), 0.28));
  }
}

/** streets + house sites for a subdivision wave; streets run along the parcel's long axis */
function subdivide(poly: Pt[], slot: number, houseW: number, houseD: number, rowPitch: number) {
  const bb = bbox(poly);
  const vertical = bb.x1 - bb.x0 <= bb.y1 - bb.y0;
  // work in a frame where streets run along v (the long axis)
  const toPlan = (u: number, v: number): Pt => (vertical ? { x: u, y: v } : { x: v, y: u });
  const [u0, u1, v0, v1] = vertical ? [bb.x0, bb.x1, bb.y0, bb.y1] : [bb.y0, bb.y1, bb.x0, bb.x1];
  const streetW = 1.5;
  const margin = 0.7;
  const houseCols: number[] = [];
  const streetCols: number[] = [];
  let cur = u0 + margin;
  for (let k = 0; cur < u1 - margin; k++) {
    if (k % 3 === 2) {
      if (cur + streetW > u1 - margin) break;
      streetCols.push(cur + streetW / 2);
      cur += streetW;
    } else {
      if (cur + slot > u1 - margin) break;
      houseCols.push(cur + slot / 2);
      cur += slot;
    }
  }
  const sites: Pt[] = [];
  const crossRows: number[] = [];
  let row = 0;
  for (let v = v0 + margin + rowPitch / 2; v < v1 - margin; v += rowPitch, row++) {
    if (row % 9 === 8) {
      crossRows.push(v);
      continue;
    }
    for (const u of houseCols) {
      const p = toPlan(u, v);
      const [hw, hd] = vertical ? [houseW / 2 + 0.3, houseD / 2 + 0.3] : [houseD / 2 + 0.3, houseW / 2 + 0.3];
      if (rectFits(poly, p.x, p.y, hw, hd)) sites.push(p);
    }
  }
  const streets: Pt[][] = [];
  for (const u of streetCols) {
    const s = spanAt(poly, u, vertical ? 'y' : 'x');
    if (!s) continue;
    const a = s[0] + 0.3;
    const z = s[1] - 0.3;
    streets.push([toPlan(u - streetW / 2, a), toPlan(u + streetW / 2, a), toPlan(u + streetW / 2, z), toPlan(u - streetW / 2, z)]);
  }
  for (const v of crossRows) {
    const s = spanAt(poly, v, vertical ? 'x' : 'y');
    if (!s) continue;
    const a = s[0] + 0.3;
    const z = s[1] - 0.3;
    streets.push([toPlan(a, v - streetW / 2), toPlan(z, v - streetW / 2), toPlan(z, v + streetW / 2), toPlan(a, v + streetW / 2)]);
  }
  // build order: from the parcel's start along the long axis, then across
  sites.sort((p, q) => (vertical ? p.y - q.y || p.x - q.x : p.x - q.x || p.y - q.y));
  return { sites, streets, centerlines: streetCols.map((u) => spanAt(poly, u, vertical ? 'y' : 'x')).map((s, i) => (s ? [toPlan(streetCols[i], s[0] + 0.6), toPlan(streetCols[i], s[1] - 0.6)] : null)) };
}

function streetsOf(b: Batch, sub: ReturnType<typeof subdivide>, paved: boolean, marked: boolean) {
  for (const s of sub.streets) b.fill(L.detail, paved ? PAL.asphalt : PAL.dirtDark, planD(s));
  if (paved && marked) {
    for (const c of sub.centerlines) if (c) b.stroke(L.mark, PAL.marking, 0.12, lineD(proj(c[0].x, c[0].y), proj(c[1].x, c[1].y)), '0.6 0.6', 0.8);
  }
}

function storeysOf(zone: SiteZone): number {
  const m = zone.name.match(/\((\d+)\s*st\)/);
  return m ? Number(m[1]) : 3;
}

function centroidScreen(poly: Pt[]): Pt {
  const c = centroid(poly);
  return proj(c.x, c.y);
}

function dressZone(zone: SiteZone, districts: Record<string, DistrictProgress>, ctx: Ctx): { ground: Prim[]; objects: SceneObject[] } {
  const poly = zonePlanPolygon(zone);
  const g = new Batch(); // ground-level: drawn before every object
  const o = new Batch(); // standing objects for this parcel
  const objects: SceneObject[] = [];
  const dId = districtOfZone(zone.id);
  const d = dId ? districtById(dId) : undefined;
  const pos = d ? districts[d.id]?.pos ?? 0 : 0;
  const S = (k: string) => (d ? stageIx(d, k) : Infinity);
  const at = (k: string) => pos >= S(k);
  const c = centroid(poly);
  const depth = c.x + c.y;
  const rand = seeded(zone.id);
  const working = (from: string, until: string) => at(from) && !at(until);

  if (!d) {
    rawGround(g, o, zone, poly);
    return { ground: g.prims(), objects: [{ zoneId: zone.id, depth, prims: o.prims() }] };
  }

  switch (d.id) {
    case 'housing': {
      const sub = subdivide(poly, 2.3, 1.3, 1.0, 2.1);
      if (!at('cleared')) rawGround(g, o, zone, poly);
      else g.fill(L.ground, at('landscaping') ? PAL.lawn : PAL.dirt, planD(poly));
      if (at('earthworks')) streetsOf(g, sub, at('roads'), at('services'));
      const last = d.stages.length - 1;
      ctx.homesTotal += sub.sites.length;
      sub.sites.forEach((p, i) => {
        const hs = houseStage(i, sub.sites.length, pos, last);
        if (hs >= S('brickwork')) ctx.homesBuilt += 1;
        house(o, ctx, d, p, 1.3, 1.0, hs, seeded(`${zone.id}:${i}`), false);
      });
      if (working('cleared', 'services')) ctx.excavators.push(centroidScreen(poly));
      break;
    }
    case 'marine': {
      if (zone.id === 'canal-estates') {
        if (!at('dry-excavation')) rawGround(g, o, zone, poly);
        else g.fill(L.ground, at('docks') ? PAL.lawn : PAL.dirt, planD(poly));
        const sub = subdivide(poly, 2.9, 1.8, 1.4, 2.8);
        if (at('canal-cut')) streetsOf(g, sub, at('docks'), at('beach'));
        // estates are released at the end of the marine programme: pads on the docks stage, houses through the beach stage
        const lastIx = d.stages.length - 1;
        const prog = Math.max(0, Math.min(1, pos - S('beach')));
        ctx.homesTotal += sub.sites.length;
        sub.sites.forEach((p, i) => {
          const r = seeded(`${zone.id}:${i}`);
          const H = (k: string) => stageIx(districtById('housing')!, k);
          let hs = -1;
          if (pos >= lastIx || (i + 0.5) / sub.sites.length < prog) hs = H('occupancy');
          else if (at('docks')) hs = H('slabs');
          if (hs >= H('brickwork')) ctx.homesBuilt += 1;
          if (hs >= 0) house(o, ctx, districtById('housing')!, p, 1.8, 1.4, hs, r, true);
        });
        break;
      }
      if (zone.id === 'beach-groins') {
        if (!at('beach')) rawGround(g, o, zone, poly, true);
        else {
          g.fill(L.ground, PAL.sand, planD(poly));
          g.stroke(L.mark, '#FFFFFF', 0.25, planD(poly), undefined, 0.35);
        }
        break;
      }
      if (zone.id === 'marina-fuel') {
        if (!at('dry-excavation')) rawGround(g, o, zone, poly, true);
        else g.fill(L.ground, at('docks') ? PAL.stone : PAL.dirt, planD(poly));
        if (at('docks')) {
          const bb = bbox(poly);
          const cx = (bb.x0 + bb.x1) / 2;
          const cy = (bb.y0 + bb.y1) / 2;
          boxWalls(o, cx - 0.9, cy - 0.6, cx + 0.3, cy + 0.6, 0, 0.9, '#E8E2D2');
          flatRoof(o, rect(cx - 0.9, cy - 0.6, cx + 0.3, cy + 0.6), 0.9, '#C75B3A');
          ctx.shadows.push(shadowOf(rect(cx - 0.9, cy - 0.6, cx + 0.3, cy + 0.6), 0.9));
        }
        break;
      }
      // marina basin: shoreline → dug in the dry → bulkheads → flooded → docks + boats
      if (!at('dry-excavation')) {
        rawGround(g, o, zone, poly, true);
        break;
      }
      const wet = at('flooded');
      g.fill(L.ground, wet ? PAL.water : PAL.pit, planD(poly));
      if (!wet) g.fill(L.detail, shadeHex(PAL.pit, 0.8), planD(inflate(poly, -1.2)));
      if (at('bulkheads')) g.stroke(L.mark, PAL.concrete, 0.4, planD(poly));
      if (wet) {
        const wr = seeded(`${zone.id}:ripple`);
        let ripples = '';
        for (const p of scatter(poly, 14, 2.4, wr)) {
          const a = proj(p.x, p.y);
          ripples += `M${r2(a.x - 0.8)},${r2(a.y)}q0.4,-0.3 0.8,0t0.8,0`;
        }
        g.stroke(L.mark, PAL.waterLight, 0.14, ripples, undefined, 0.8);
      }
      if (at('docks')) {
        const bb = bbox(poly);
        let piers = '';
        for (let x = bb.x0 + 2.2; x < bb.x1 - 1.5; x += 3.6) {
          for (let y = bb.y0 + 2; y < bb.y1 - 2; y += 4.6) {
            if (!rectFits(poly, x, y, 0.3, 1.6)) continue;
            piers += planD(rect(x - 0.18, y - 1.5, x + 0.18, y + 1.5));
            ctx.boats.push(proj(x + 0.9, y));
          }
        }
        if (piers) g.fill(L.pad, PAL.dock, piers);
      }
      if (working('dry-excavation', 'flooded')) ctx.excavators.push(centroidScreen(poly));
      break;
    }
    case 'enabling': {
      const paved = at('roads');
      if (!at('cleared')) {
        rawGround(g, o, zone, poly);
        break;
      }
      g.fill(L.ground, paved ? PAL.asphalt : at('earthworks') ? PAL.gravel : PAL.dirt, planD(poly));
      const bb = bbox(poly);
      if (zone.id === 'road-frontage' && paved && at('services')) {
        const vertical = bb.x1 - bb.x0 <= bb.y1 - bb.y0;
        const mid = vertical ? (bb.x0 + bb.x1) / 2 : (bb.y0 + bb.y1) / 2;
        const s = spanAt(poly, mid, vertical ? 'y' : 'x');
        if (s) {
          const a = vertical ? { x: mid, y: s[0] + 0.6 } : { x: s[0] + 0.6, y: mid };
          const z = vertical ? { x: mid, y: s[1] - 0.6 } : { x: s[1] - 0.6, y: mid };
          g.stroke(L.mark, PAL.marking, 0.14, lineD(proj(a.x, a.y), proj(z.x, z.y)), '0.7 0.7', 0.85);
        }
      }
      if (zone.id === 'parking-fields' && at('services')) {
        let stalls = '';
        for (let x = bb.x0 + 0.8; x < bb.x1 - 0.5; x += 0.9) {
          for (let y = bb.y0 + 0.8; y < bb.y1 - 0.8; y += 2.6) {
            if (pointInPolygon({ x, y }, poly)) stalls += lineD(proj(x, y - 0.7), proj(x, y + 0.7));
          }
        }
        g.stroke(L.mark, PAL.marking, 0.08, stalls, undefined, 0.7);
      }
      if (zone.id === 'incoming-electrical' && at('services')) {
        const cx = (bb.x0 + bb.x1) / 2;
        const cy = (bb.y0 + bb.y1) / 2;
        g.fill(L.pad, PAL.concrete, planD(inflate(poly, -0.5)));
        g.stroke(L.mark, '#9AA3AD', 0.1, planD(inflate(poly, -0.5)), '0.25 0.2');
        for (const [dx, dy] of [[-1.4, -0.6], [0, -0.6], [1.4, -0.6]]) {
          const r = rect(cx + dx - 0.4, cy + dy - 0.35, cx + dx + 0.4, cy + dy + 0.35);
          boxWalls(o, r[0].x, r[0].y, r[2].x, r[2].y, 0, 0.7, '#7D8792');
          o.fill(L.top, '#9AA3AD', planD(r, 0.7));
          ctx.shadows.push(shadowOf(r, 0.7));
        }
      }
      if (zone.id === 'security-gate' && at('complete')) {
        const cx = (bb.x0 + bb.x1) / 2;
        const cy = (bb.y0 + bb.y1) / 2;
        const r = rect(cx - 0.6, cy - 0.5, cx + 0.6, cy + 0.5);
        boxWalls(o, r[0].x, r[0].y, r[2].x, r[2].y, 0, 0.9, '#ECE7DC');
        hipRoof(o, r, 0.9, 0.5, '#C75B3A');
        ctx.shadows.push(shadowOf(r, 1.3));
      }
      if (zone.id === 'road-frontage' && working('cleared', 'roads')) ctx.excavators.push(centroidScreen(poly));
      break;
    }
    case 'amenity': {
      if (!at('cleared')) {
        rawGround(g, o, zone, poly);
        break;
      }
      const landscaped = at('landscaping');
      const finished = at('fitout');
      const rise = Math.max(0, Math.min(1, pos - S('structures')));
      const glass = ctx.night ? PAL.glassNight : PAL.glassDay;
      if (zone.id === 'lakes-amenity-core') {
        g.fill(L.ground, landscaped ? PAL.lawn : PAL.dirt, planD(poly));
        const bb = bbox(poly);
        const vertical = bb.x1 - bb.x0 <= bb.y1 - bb.y0;
        const along = (f: number): Pt =>
          vertical ? { x: (bb.x0 + bb.x1) / 2, y: bb.y0 + (bb.y1 - bb.y0) * f } : { x: bb.x0 + (bb.x1 - bb.x0) * f, y: (bb.y0 + bb.y1) / 2 };
        const across = vertical ? bb.x1 - bb.x0 : bb.y1 - bb.y0;
        const ponds: Pt[][] = [];
        if (at('lakes')) {
          [0.17, 0.39, 0.6].forEach((f, k) => {
            const c0 = along(f);
            const rx = across * (0.3 + 0.04 * k);
            const ry = (vertical ? bb.y1 - bb.y0 : bb.x1 - bb.x0) * 0.08;
            const ring: Pt[] = [];
            for (let i = 0; i < 18; i++) {
              const t = (i / 18) * Math.PI * 2;
              const wob = 1 + 0.12 * Math.sin(t * 3 + k);
              const ex = Math.cos(t) * rx * wob;
              const ey = Math.sin(t) * ry * wob;
              ring.push(vertical ? { x: c0.x + ex, y: c0.y + ey } : { x: c0.x + ey, y: c0.y + ex });
            }
            ponds.push(ring);
            g.fill(L.detail, PAL.water, planD(ring));
            g.stroke(L.mark, landscaped ? '#3F7F35' : PAL.dirtDark, 0.25, planD(ring));
          });
        }
        if (at('structures')) {
          // pool, two courts and the gym, along the parcel's far end
          const pool = along(0.74);
          const courts = along(0.84);
          const gym = along(0.94);
          const pr = vertical ? rect(pool.x - 1.6, pool.y - 0.9, pool.x + 1.6, pool.y + 0.9) : rect(pool.x - 0.9, pool.y - 1.6, pool.x + 0.9, pool.y + 1.6);
          g.fill(L.pad, PAL.stone, planD(inflate(pr, 0.5)));
          if (finished) g.fill(L.mark, PAL.waterLight, planD(pr));
          for (const off of [-1.3, 1.3]) {
            const cc = vertical ? { x: courts.x + off, y: courts.y } : { x: courts.x, y: courts.y + off };
            const cr = rect(cc.x - 1.0, cc.y - 1.6, cc.x + 1.0, cc.y + 1.6);
            g.fill(L.pad, finished ? '#3C7D5A' : PAL.concrete, planD(cr));
            if (finished) {
              g.stroke(L.mark, '#FFFFFF', 0.08, planD(inflate(cr, -0.2)) + lineD(proj(cc.x - 0.8, cc.y), proj(cc.x + 0.8, cc.y)), undefined, 0.9);
            }
          }
          const gr = rect(gym.x - 1.6, gym.y - 1.1, gym.x + 1.6, gym.y + 1.1);
          const h = 1.5 * (finished ? 1 : rise);
          if (h > 0.05) {
            boxWalls(o, gr[0].x, gr[0].y, gr[2].x, gr[2].y, 0, h, finished ? '#E8E2D2' : PAL.concrete);
            if (finished) {
              hipRoof(o, gr, h, 0.7, '#6B7F8F');
              wallWindows(o, gr[3], gr[2], 0, h, 1, glass);
            } else o.fill(L.top, PAL.concrete, planD(gr, h));
            ctx.shadows.push(shadowOf(gr, h + (finished ? 0.7 : 0)));
          }
        }
        if (landscaped) {
          const avoid = ponds.map((p) => inflate(p, 0.6));
          scatter(poly, 14, 2.2, seeded(`${zone.id}:palms`), avoid).forEach((p, i) => palm(o, ctx, p, i * 1.7));
        }
        if (working('cleared', 'lakes')) ctx.excavators.push(centroidScreen(poly));
        break;
      }
      // clubhouse, senior living, retail: buildings that rise under a crane, then finish
      const isRetail = zone.id === 'retail-block';
      const isSenior = zone.id === 'senior-living';
      g.fill(L.ground, landscaped ? (isRetail ? PAL.asphalt : isSenior ? PAL.lawn : PAL.stone) : PAL.dirt, planD(poly));
      const footprint = scaleAbout(poly, isRetail ? 0.62 : isSenior ? 0.72 : 0.6);
      if (zone.id === 'clubhouse' && at('fitout')) {
        const bb = bbox(poly);
        const pc = { x: (bb.x0 + bb.x1) / 2, y: bb.y0 + (bb.y1 - bb.y0) * 0.86 };
        const pr = rect(pc.x - 1.2, pc.y - 0.7, pc.x + 1.2, pc.y + 0.7);
        if (rectFits(poly, pc.x, pc.y, 1.3, 0.8)) g.fill(L.mark, PAL.waterLight, planD(pr));
      }
      if (isRetail && landscaped) {
        const bb = bbox(poly);
        let stalls = '';
        for (let x = bb.x0 + 0.6; x < bb.x1 - 0.4; x += 0.9) {
          for (const y of [bb.y0 + 1.0, bb.y1 - 1.0]) if (pointInPolygon({ x, y }, poly)) stalls += lineD(proj(x, y - 0.6), proj(x, y + 0.6));
        }
        g.stroke(L.mark, PAL.marking, 0.08, stalls, undefined, 0.7);
      }
      if (at('structures')) {
        g.fill(L.pad, PAL.concrete, planD(inflate(footprint, 0.2)));
        const fullH = isSenior ? 3.0 : isRetail ? 1.6 : 2.2;
        const h = fullH * (finished ? 1 : rise);
        if (h > 0.05) {
          const color = finished ? (isSenior ? '#F2D9A8' : isRetail ? '#E9E4F2' : '#F4E3E8') : PAL.concrete;
          prismWalls(o, footprint, h, color, finished ? { rows: isSenior ? 3 : isRetail ? 1 : 2, color: glass } : undefined);
          if (finished && !isRetail) hipRoof(o, footprint, h, isSenior ? 1.0 : 0.9, isSenior ? '#B4553A' : '#6B7F8F');
          else flatRoof(o, footprint, h, finished ? PAL.roofFlat : PAL.concrete);
          ctx.shadows.push(shadowOf(footprint, h + (finished && !isRetail ? 0.9 : 0)));
          if (!finished) {
            const cs = centroidScreen(footprint);
            ctx.cranes.push({ base: cs, height: fullH + 3.2 });
          }
        }
      }
      if (landscaped && !isRetail) {
        scatter(poly, 6, 2, seeded(`${zone.id}:palms`), [inflate(footprint, 0.6)]).forEach((p, i) => palm(o, ctx, p, i * 2.3));
      }
      break;
    }
    case 'condos': {
      if (!at('cleared')) {
        rawGround(g, o, zone, poly);
        break;
      }
      g.fill(L.ground, at('complete') ? PAL.stone : PAL.dirt, planD(poly));
      if (!at('slabs')) {
        if (zone.id === 'condo-1') ctx.excavators.push(centroidScreen(poly));
        break;
      }
      const bb = bbox(poly);
      const fp = rect(bb.x0 + 0.5, bb.y0 + 0.3, bb.x1 - 0.5, bb.y1 - 0.3);
      g.fill(L.pad, PAL.concrete, planD(fp));
      const storeys = storeysOf(zone);
      const fullH = storeys * 0.9;
      const model = zone.id === 'condo-1';
      const h = !at('framing') ? 0 : at('model') || (model && pos >= S('framing') + 0.5) ? fullH : fullH * (pos - S('framing'));
      const finished = at('envelope') || (model && at('model'));
      if (h > 0.05) {
        const glass = ctx.night && at('fitout') ? PAL.glassNight : PAL.glassDay;
        boxWalls(o, fp[0].x, fp[0].y, fp[2].x, fp[2].y, 0, h, finished ? PAL.condoWall : PAL.concrete);
        if (finished) {
          wallWindows(o, fp[3], fp[2], 0, h, storeys, glass);
          wallWindows(o, fp[2], fp[1], 0, h, storeys, glass);
        } else {
          // bare frame: floor slabs read as lines
          let floors = '';
          for (let s = 1; s * 0.9 < h; s++) floors += lineD(proj(fp[3].x, fp[3].y, s * 0.9), proj(fp[2].x, fp[2].y, s * 0.9)) + lineD(proj(fp[2].x, fp[2].y, s * 0.9), proj(fp[1].x, fp[1].y, s * 0.9));
          if (floors) o.stroke(L.window, '#7D8792', 0.1, floors);
        }
        flatRoof(o, fp, h, finished ? PAL.roofFlat : PAL.concrete);
        if (at('complete')) {
          const cx = (fp[0].x + fp[2].x) / 2;
          const cy = (fp[0].y + fp[2].y) / 2;
          const u = rect(cx - 0.5, cy - 0.3, cx + 0.3, cy + 0.3);
          boxWalls(o, u[0].x, u[0].y, u[2].x, u[2].y, h, 0.35, '#9AA3AD');
          o.fill(L.topDetail + 1, '#B7BCC2', planD(u, h + 0.35));
        }
        ctx.shadows.push(shadowOf(fp, h));
      }
      if (!finished && at('framing') && ['condo-1', 'condo-4', 'condo-8', 'condo-12'].includes(zone.id)) {
        ctx.cranes.push({ base: proj(bb.x1 + 0.3, bb.y0 + 0.4), height: fullH + 3.4 });
      }
      break;
    }
  }
  objects.push({ zoneId: zone.id, depth, prims: o.prims() });
  return { ground: g.prims(), objects };
}

/** the island the estate sits on: hull of every parcel, with limestone strata on the camera-facing sides */
function islandPrims(zones: SiteZone[]): { prims: Prim[]; pts: Pt[] } {
  const hull = inflate(convexHull(zones.flatMap((z) => zonePlanPolygon(z))), 2.4);
  const c = centroid(hull);
  const b = new Batch();
  const pts: Pt[] = [];
  const DEPTH = 3.4;
  const BAND = 1.1;
  for (let i = 0; i < hull.length; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % hull.length];
    const dx = (p1.x + p2.x) / 2 - c.x;
    const dy = (p1.y + p2.y) / 2 - c.y;
    if (dx + dy <= 0) continue;
    const k = Math.abs(dx) > Math.abs(dy) ? 0.92 : 0.74;
    b.fill(L.wall, shadeHex(PAL.earthDark, k), polyD([proj(p1.x, p1.y, -BAND), proj(p2.x, p2.y, -BAND), proj(p2.x, p2.y, -DEPTH), proj(p1.x, p1.y, -DEPTH)]));
    b.fill(L.wall, shadeHex(PAL.limestone, k), polyD([proj(p1.x, p1.y, 0), proj(p2.x, p2.y, 0), proj(p2.x, p2.y, -BAND), proj(p1.x, p1.y, -BAND)]));
    pts.push(proj(p1.x, p1.y, -DEPTH), proj(p2.x, p2.y, -DEPTH));
  }
  b.fill(L.ground, PAL.bush, planD(hull));
  b.stroke(L.mark, PAL.sand, 0.5, planD(hull), undefined, 0.9);
  for (const p of hull) pts.push(proj(p.x, p.y));
  return { prims: b.prims(), pts };
}

/**
 * Build the whole estate scene for the current construction progress.
 * `night` swaps glazing for lit windows.
 */
export function buildScene(zones: SiteZone[], districts: Record<string, DistrictProgress>, opts: { night: boolean }): Scene {
  const ctx: Ctx = { night: opts.night, shadows: [], objects: [], excavators: [], cranes: [], boats: [], homesBuilt: 0, homesTotal: 0 };
  const island = islandPrims(zones);
  const ground: Scene['ground'] = [];
  const objects: SceneObject[] = [];
  const ordered = [...zones].sort((a, b) => {
    const ca = centroid(zonePlanPolygon(a));
    const cb = centroid(zonePlanPolygon(b));
    return ca.x + ca.y - (cb.x + cb.y);
  });
  for (const z of ordered) {
    const dressed = dressZone(z, districts, ctx);
    ground.push({ zoneId: z.id, prims: dressed.ground, outline: planD(zonePlanPolygon(z)) });
    objects.push(...dressed.objects);
  }
  objects.sort((a, b) => a.depth - b.depth);

  // view box: the island's full extent plus headroom for the tallest things and a ring of sea
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of island.pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const SEA = 5;
  const HEADROOM = 7;
  const bounds: IsoBounds = { minX: minX - SEA, minY: minY - SEA - HEADROOM, width: maxX - minX + SEA * 2, height: maxY - minY + SEA * 2 + HEADROOM };

  return {
    island: island.prims,
    ground,
    shadows: ctx.shadows.join(''),
    objects,
    excavators: ctx.excavators,
    cranes: ctx.cranes,
    boats: ctx.boats,
    bounds,
    stats: { homesBuilt: ctx.homesBuilt, homesTotal: ctx.homesTotal },
  };
}
