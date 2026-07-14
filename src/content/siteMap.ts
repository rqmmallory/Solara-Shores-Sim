/**
 * Illustrated site map geometry, traced from the real Solara Shores master
 * plan (Lotus Design, 18 May 2026, sheets A1-A4).
 *
 * ORIENTATION — matches Sheet A1: this is a WIDE east-west wedge. The MARINA
 * point (marina basin, 15 condos, clubhouse, marine fuel, beach + groins) is
 * at the WEST end (left); the wide commercial/road end (Yamacraw Rd frontage,
 * retail, senior living, parking, incoming electrical) is at the EAST end
 * (right); the single-family lot grid, lakes/green space and amenity/court
 * core fill the centre.
 *
 * AUTHORING NOTE: the zone data below is authored in a readable "road-at-top,
 * marina-at-bottom" portrait frame, then rotated 90° by `toEastWest()` on
 * export so `siteZones` comes out in Sheet A1's landscape orientation. This
 * keeps every hand-traced footprint arithmetic-error-free (one tested
 * transform instead of 46 re-typed coordinate sets). Consumers only ever see
 * the rotated `siteZones`.
 *
 * Positions are percentages of a fixed-aspect canvas (CANVAS_ASPECT =
 * width:height). Zones without a `footprint` render as their x/y/w/h bounding
 * box; zones WITH a footprint render that hand-traced polygon — real building
 * silhouettes, the marina's branching basin, organic ponds, and lot "waves"
 * that follow the block outline. Game-legible proportions, not a survey.
 */

// wide landscape wedge (Sheet A1). The authored portrait frame is ~0.52 tall;
// rotating it 90° inverts the aspect to ~1.92 wide.
export const CANVAS_ASPECT = 1.92;

export type ZoneCategory =
  | 'road'
  | 'retail'
  | 'senior'
  | 'infra'
  | 'lots'
  | 'green'
  | 'amenity'
  | 'estate'
  | 'marina'
  | 'condo'
  | 'clubhouse'
  | 'beach';

export interface SiteZoneStage {
  /** completing this sim phase advances the zone to this stage */
  phaseId: string;
  icon: string;
  label: string;
}

export interface SiteZone {
  id: string;
  name: string;
  category: ZoneCategory;
  /**
   * percentage bounding box on the illustrated canvas: 0,0 = top-left
   * (road/north). Always required as a fallback footprint and for simple
   * hit-test/label sizing; when `footprint` is present it defines the real
   * shape and `x/y/w/h` should just be its bounding box.
   */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * an explicit hand-traced polygon (percentage coordinates, same space as
   * x/y) for zones whose real footprint isn't a rectangle — a marina
   * outline, a condo silhouette, a lake, a road spine. Optional: zones
   * without one render as their x/y/w/h rectangle.
   */
  footprint?: { x: number; y: number }[];
  /** shown before Phase 1 completes */
  rawIcon: string;
  /** shown once Phase 1 (site prep) completes but before this zone's own first stage */
  clearedIcon: string;
  /** ordered by build sequence; the latest stage whose phase is complete applies */
  stages: SiteZoneStage[];
}

// authored in a portrait "road at top, marina at bottom" frame for readability
const AUTHORED_ZONES: SiteZone[] = [
  // ---- north edge: the road ----
  {
    id: 'road-frontage',
    name: 'Yamacraw Hill Rd frontage & entrance',
    category: 'road',
    x: 5,
    y: 1,
    w: 90,
    h: 4,
    // a thin frontage strip with a wider gap for the entrance drive, traced
    // off Sheet A2's entrance road cutting through the frontage
    footprint: [
      { x: 5, y: 1 }, { x: 44, y: 1 }, { x: 44, y: 3.2 }, { x: 56, y: 3.2 },
      { x: 56, y: 1 }, { x: 95, y: 1 }, { x: 95, y: 5 }, { x: 5, y: 5 },
    ],
    rawIcon: '🌿',
    clearedIcon: '🚧',
    stages: [
      { phaseId: 'phase1-site-prep', icon: '🛣️', label: 'Construction access open' },
      { phaseId: 'phase7-handover', icon: '🏁', label: 'Finished entrance & signage' },
    ],
  },
  // ---- north band: parking / senior living / retail / electrical ----
  {
    id: 'parking-fields',
    name: 'Parking fields',
    category: 'infra',
    x: 5,
    y: 6,
    w: 22,
    h: 12,
    // Sheet A2: a clean rectangular parking grid, slightly trapezoidal to
    // hug the property's west taper
    footprint: [
      { x: 6, y: 6 }, { x: 27, y: 6 }, { x: 26, y: 18 }, { x: 5, y: 18 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase3-vertical-amenity', icon: '🅿️', label: 'Paved parking' }],
  },
  {
    id: 'senior-living',
    name: 'Senior retirement living campus',
    category: 'senior',
    x: 29,
    y: 6,
    w: 26,
    h: 14,
    // Sheet A2: 3 senior-living buildings clustered in a wedge around a
    // shared courtyard/walking path — a pentagon cluster, not a plain box
    footprint: [
      { x: 31, y: 6 }, { x: 50, y: 6 }, { x: 55, y: 12 }, { x: 48, y: 20 },
      { x: 33, y: 20 }, { x: 29, y: 13 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase3-vertical-amenity', icon: '🚧', label: 'Under construction' },
      { phaseId: 'phase6-estates-senior-retail', icon: '🏥', label: 'Senior living open' },
    ],
  },
  {
    id: 'retail-block',
    name: 'Retail buildings',
    category: 'retail',
    x: 57,
    y: 6,
    w: 24,
    h: 12,
    // Sheet A2: two rectangular retail buildings side by side with a gap
    footprint: [
      { x: 57, y: 7 }, { x: 68, y: 7 }, { x: 68, y: 16 }, { x: 57, y: 16 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase3-vertical-amenity', icon: '🚧', label: 'Shell under construction' },
      { phaseId: 'phase6-estates-senior-retail', icon: '🏬', label: 'Retail open' },
    ],
  },
  {
    id: 'incoming-electrical',
    name: 'Incoming electrical service & substation',
    category: 'infra',
    x: 83,
    y: 6,
    w: 12,
    h: 8,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase2-marine-horizontal', icon: '⚡', label: 'BPL primary energized' },
    ],
  },
  {
    id: 'security-gate',
    name: 'Security gate',
    category: 'road',
    x: 44,
    y: 20,
    w: 12,
    h: 3,
    rawIcon: '🌿',
    clearedIcon: '🚧',
    stages: [{ phaseId: 'phase3-vertical-amenity', icon: '🚪', label: 'Gatehouse staffed' }],
  },

  // ---- middle band: single-family lot grid, split into 3 production waves ----
  // the property tapers narrower at both the road (north) and marina (south)
  // ends and bulges through the middle — waves follow that real block shape,
  // not a plain rectangle
  {
    id: 'lots-wave-1',
    name: 'Single-family Wave 1 (first ~60 houses)',
    category: 'lots',
    x: 5,
    y: 24,
    w: 90,
    h: 13,
    footprint: [
      { x: 7, y: 24 }, { x: 93, y: 24 }, { x: 95, y: 30 }, { x: 94, y: 37 }, { x: 6, y: 37 }, { x: 5, y: 30 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase2-marine-horizontal', icon: '🚧', label: 'Roads & utilities in' },
      { phaseId: 'phase3-vertical-amenity', icon: '🏠', label: 'Wave 1 built & sold' },
    ],
  },
  {
    id: 'lakes-amenity-core',
    name: 'Lakes, green space & amenity core (pool, gym, courts)',
    category: 'amenity',
    x: 5,
    y: 38,
    w: 90,
    h: 12,
    // Sheet A3: a winding pond chain through the "Green Space" (~200,000 sf)
    // plus the clubhouse/gym + tennis/pickleball/basketball court cluster —
    // an organic, multi-lobed footprint, not a rectangle
    footprint: [
      { x: 10, y: 39 }, { x: 30, y: 38 }, { x: 42, y: 41 }, { x: 38, y: 46 },
      { x: 46, y: 48 }, { x: 40, y: 50 }, { x: 22, y: 49 }, { x: 8, y: 46 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase1-site-prep', icon: '💧', label: 'Lakes shaping' },
      { phaseId: 'phase3-vertical-amenity', icon: '🏊', label: 'Amenity core open' },
    ],
  },
  {
    id: 'lots-wave-2',
    name: 'Single-family Wave 2',
    category: 'lots',
    x: 5,
    y: 51,
    w: 44,
    h: 13,
    footprint: [
      { x: 6, y: 51 }, { x: 49, y: 51 }, { x: 48, y: 64 }, { x: 5, y: 64 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏠', label: 'Wave 2 built & sold' }],
  },
  {
    id: 'lots-wave-3',
    name: 'Single-family Wave 3',
    category: 'lots',
    x: 51,
    y: 51,
    w: 44,
    h: 13,
    footprint: [
      { x: 51, y: 51 }, { x: 95, y: 51 }, { x: 94, y: 63 }, { x: 52, y: 64 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏠', label: 'Wave 3 built & sold' }],
  },

  // ---- south band: canal-front estates ----
  {
    id: 'canal-estates',
    name: 'Canal-front estate lots & docks',
    category: 'estate',
    x: 5,
    y: 65,
    w: 90,
    h: 9,
    // finger canals cut back from the marina into the estate lots — traced
    // as a comb-like edge rather than a straight band
    footprint: [
      { x: 6, y: 65 }, { x: 20, y: 65 }, { x: 20, y: 68 }, { x: 28, y: 68 }, { x: 28, y: 65 },
      { x: 45, y: 65 }, { x: 45, y: 68 }, { x: 53, y: 68 }, { x: 53, y: 65 },
      { x: 94, y: 65 }, { x: 94, y: 74 }, { x: 5, y: 74 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase2-marine-horizontal', icon: '🪨', label: 'Canals cut, bulkheads in' },
      { phaseId: 'phase6-estates-senior-retail', icon: '🏡', label: 'Estates released & sold' },
    ],
  },

  // ---- south end: marina, condos, clubhouse, beach ----
  {
    id: 'marina-basin',
    name: 'Marina basin',
    category: 'marina',
    x: 5,
    y: 75,
    w: 55,
    h: 20,
    // Sheet A4: the basin branches into slip fingers rather than a single
    // rectangle of water — traced as an irregular, lobed water body
    footprint: [
      { x: 8, y: 75 }, { x: 22, y: 75 }, { x: 22, y: 80 }, { x: 33, y: 80 }, { x: 33, y: 76 },
      { x: 45, y: 76 }, { x: 45, y: 82 }, { x: 38, y: 84 }, { x: 40, y: 90 }, { x: 30, y: 92 },
      { x: 30, y: 86 }, { x: 20, y: 86 }, { x: 20, y: 91 }, { x: 10, y: 91 }, { x: 6, y: 84 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🪨',
    stages: [
      { phaseId: 'phase2-marine-horizontal', icon: '🕳️', label: 'Excavated in the dry' },
      { phaseId: 'phase4-marine-window', icon: '⛵', label: 'Wet, boats docked' },
    ],
  },
  {
    id: 'marina-fuel',
    name: 'Marine fuel station',
    category: 'marina',
    x: 5,
    y: 90,
    w: 12,
    h: 6,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase4-marine-window', icon: '⛽', label: 'Fuel dock commissioned' }],
  },
  // ---- the 15 individual condo buildings (Sheet A4), ringing the marina ----
  // Condo 1 is the model building (opens early, at vertical/amenity phase);
  // the rest complete in the production-condos phase. Storeys per Sheet A4.
  {
    id: 'condo-1',
    name: 'Condo 1 — model building (3 st)',
    category: 'condo',
    x: 6, y: 76, w: 6, h: 6,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase3-vertical-amenity', icon: '🏗️', label: 'Model building open' },
      { phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' },
    ],
  },
  {
    id: 'condo-2',
    name: 'Condo 2 (4 st)',
    category: 'condo',
    x: 13, y: 76, w: 6, h: 6,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-3',
    name: 'Condo 3 (3 st)',
    category: 'condo',
    x: 21, y: 75, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-4',
    name: 'Condo 4 (3 st)',
    category: 'condo',
    x: 27, y: 75, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-5',
    name: 'Condo 5 (4 st)',
    category: 'condo',
    x: 33, y: 75, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-6',
    name: 'Condo 6 (3 st)',
    category: 'condo',
    x: 39, y: 75, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-7',
    name: 'Condo 7 (3 st)',
    category: 'condo',
    x: 47, y: 76, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-8',
    name: 'Condo 8 (4 st)',
    category: 'condo',
    x: 47, y: 82, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-9',
    name: 'Condo 9 (5 st)',
    category: 'condo',
    x: 40, y: 82, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-10',
    name: 'Condo 10 (4 st)',
    category: 'condo',
    x: 40, y: 88, w: 5, h: 4,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-11',
    name: 'Condo 11 (3 st)',
    category: 'condo',
    x: 47, y: 88, w: 5, h: 4,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'clubhouse',
    name: 'Clubhouse, restaurant & main pool',
    category: 'clubhouse',
    x: 20,
    y: 91,
    w: 15,
    h: 7,
    // a compact cross/compound footprint (clubhouse building + a pool
    // fronting it), distinct from the condo boxes around it
    footprint: [
      { x: 22, y: 91 }, { x: 30, y: 91 }, { x: 30, y: 93 }, { x: 33, y: 93 },
      { x: 33, y: 96 }, { x: 26, y: 97 }, { x: 20, y: 96 }, { x: 20, y: 93 },
      { x: 22, y: 93 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase3-vertical-amenity', icon: '🏛️', label: 'Clubhouse & main pool open' },
      { phaseId: 'phase6-estates-senior-retail', icon: '🍹', label: 'Sports bar & beach club fit-out' },
    ],
  },
  {
    id: 'condo-12',
    name: 'Condo 12 (4 st)',
    category: 'condo',
    x: 36, y: 90, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-13',
    name: 'Condo 13 (3 st)',
    category: 'condo',
    x: 42, y: 90, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-14',
    name: 'Condo 14 (4 st)',
    category: 'condo',
    x: 48, y: 90, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'condo-15',
    name: 'Condo 15 (3 st)',
    category: 'condo',
    x: 54, y: 90, w: 5, h: 5,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' }],
  },
  {
    id: 'beach-groins',
    name: 'Converted beach & ocean groins',
    category: 'beach',
    x: 5,
    y: 96,
    w: 90,
    h: 4,
    // a wavy shoreline with a few thin rock groins projecting into the
    // water (Sheet A4 shows exactly this along the southwest shore)
    footprint: [
      { x: 5, y: 97 }, { x: 15, y: 96 }, { x: 15, y: 99 }, { x: 18, y: 99 }, { x: 18, y: 96.5 },
      { x: 45, y: 97.5 }, { x: 45, y: 100 }, { x: 48, y: 100 }, { x: 48, y: 97.5 },
      { x: 70, y: 98 }, { x: 70, y: 100 }, { x: 73, y: 100 }, { x: 73, y: 98 },
      { x: 95, y: 97 }, { x: 95, y: 100 }, { x: 5, y: 100 },
    ],
    rawIcon: '🪨',
    clearedIcon: '🪨',
    stages: [{ phaseId: 'phase4-marine-window', icon: '🏖️', label: 'Beach converted, groins in' }],
  },
];

/**
 * Rotate one authored point 90° clockwise from the portrait frame into Sheet
 * A1's landscape frame: the road end (authored top, y≈0) swings to the EAST
 * (x≈100); the marina end (authored bottom, y≈100) swings to the WEST (x≈0);
 * the authored cross-axis (x) becomes north-south (y). Bounds stay within
 * 0..100 because the authored data already satisfies x+w≤100 and y+h≤100.
 */
function rotatePoint(p: { x: number; y: number }): { x: number; y: number } {
  return { x: 100 - p.y, y: p.x };
}

/** rotate a whole authored zone (bounding box + optional footprint) east-west */
export function toEastWest(z: SiteZone): SiteZone {
  return {
    ...z,
    // the rotated bounding box: new origin is the rotated far corner,
    // width/height swap axes
    x: 100 - (z.y + z.h),
    y: z.x,
    w: z.h,
    h: z.w,
    footprint: z.footprint?.map(rotatePoint),
  };
}

/** the exported map — Sheet A1 orientation (marina west, road/retail east) */
export const siteZones: SiteZone[] = AUTHORED_ZONES.map(toEastWest);
