/**
 * Illustrated site map geometry, traced from the real Solara Shores
 * master plan (Lotus Design, 18 May 2026, sheets A1-A4) and the
 * property aerial. North (Yamacraw Hill Rd) is the top of the map;
 * south (the ocean/beach) is the bottom — matching both the aerial
 * photo and the KB's own "bounded by Yamacraw Hill Rd (north) and the
 * ocean (south)" framing. The marine-civil half (marina, 15 condo
 * buildings, clubhouse, canal-front estates, beach) sits at the south
 * end; the conventional land-development half (lot grid, amenity core,
 * senior living, retail) fills the rest, matching Module 0's own
 * "west/south = marine-civil, east/north = conventional" split.
 *
 * Sheet A1 is drawn rotated ~90-110° on the page (standard drafting
 * practice for fitting a diagonal parcel onto a landscape sheet) — its
 * own left/right is NOT compass east/west. The property aerial is the
 * ground truth for true orientation (road along the entire top edge,
 * beach along the entire bottom); this file's coordinate space follows
 * the aerial's north-up frame, while feature SHAPES (marina, condo
 * footprints, ponds, courts, road spine) are traced from the sheets'
 * proportions and adjacency, un-rotated to match.
 *
 * Positions are percentages of a fixed-aspect illustrated canvas
 * (CANVAS_ASPECT = width:height). Zones without a `footprint` render as
 * their x/y/w/h bounding box (a plain rectangle); zones WITH a footprint
 * render that hand-traced polygon instead — real building silhouettes,
 * the marina's branching basin, organic pond shapes, and lot "waves"
 * that follow the actual block outline rather than an abstract box.
 * Still game-legible proportions, not a survey.
 */

export const CANVAS_ASPECT = 0.52; // width / height — tall wedge, like the real parcel

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

export const siteZones: SiteZone[] = [
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
  {
    id: 'condos-1-2',
    name: 'Condo 1–2 (model building)',
    category: 'condo',
    x: 6,
    y: 76,
    w: 12,
    h: 8,
    // two distinct rectangular condo footprints (Condo 1 smaller, Condo 2
    // larger — Sheet A4's stated 14,000/56,000 sf totals), stepped, not one box
    footprint: [
      { x: 6, y: 76 }, { x: 12, y: 76 }, { x: 12, y: 80 }, { x: 18, y: 80 },
      { x: 18, y: 84 }, { x: 6, y: 84 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [
      { phaseId: 'phase3-vertical-amenity', icon: '🏗️', label: 'Model building open' },
      { phaseId: 'phase5-production-condos', icon: '🏢', label: 'Complete' },
    ],
  },
  {
    id: 'condos-3-6',
    name: 'Condos 3–6',
    category: 'condo',
    x: 20,
    y: 75,
    w: 20,
    h: 7,
    // 4 buildings along the marina's north edge — a zigzag outline suggests
    // separate footprints rather than one slab
    footprint: [
      { x: 20, y: 75 }, { x: 26, y: 75 }, { x: 26, y: 77 }, { x: 30, y: 77 },
      { x: 30, y: 75 }, { x: 36, y: 75 }, { x: 36, y: 78 }, { x: 20, y: 78 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Buildings complete' }],
  },
  {
    id: 'condos-7-11',
    name: 'Condos 7–11',
    category: 'condo',
    x: 36,
    y: 80,
    w: 10,
    h: 10,
    // 5 buildings down the marina's west side — a tall stepped cluster
    footprint: [
      { x: 46, y: 80 }, { x: 50, y: 81 }, { x: 49, y: 85 }, { x: 46, y: 86 },
      { x: 44, y: 89 }, { x: 39, y: 88 }, { x: 40, y: 83 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Buildings complete' }],
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
    id: 'condos-12-15',
    name: 'Condos 12–15',
    category: 'condo',
    x: 34,
    y: 90,
    w: 14,
    h: 8,
    // 4 buildings flanking the clubhouse near the south/beach end
    footprint: [
      { x: 35, y: 90 }, { x: 41, y: 90 }, { x: 41, y: 94 }, { x: 46, y: 94 },
      { x: 46, y: 97 }, { x: 34, y: 97 }, { x: 34, y: 93 },
    ],
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Buildings complete' }],
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
