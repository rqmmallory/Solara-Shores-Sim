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
 * Positions are percentages of a fixed-aspect illustrated canvas
 * (CANVAS_ASPECT = width:height), not to engineering scale — legible
 * game-map proportions, not a survey.
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
  /** percentage box on the illustrated canvas: 0,0 = top-left (road/north) */
  x: number;
  y: number;
  w: number;
  h: number;
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
  {
    id: 'lots-wave-1',
    name: 'Single-family Wave 1 (first ~60 houses)',
    category: 'lots',
    x: 5,
    y: 24,
    w: 90,
    h: 13,
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
    w: 30,
    h: 15,
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
    x: 36,
    y: 75,
    w: 12,
    h: 8,
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
    x: 36,
    y: 84,
    w: 20,
    h: 7,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Buildings complete' }],
  },
  {
    id: 'condos-7-11',
    name: 'Condos 7–11',
    category: 'condo',
    x: 49,
    y: 75,
    w: 18,
    h: 8,
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
    w: 22,
    h: 8,
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
    x: 68,
    y: 84,
    w: 18,
    h: 7,
    rawIcon: '🌳',
    clearedIcon: '🟫',
    stages: [{ phaseId: 'phase5-production-condos', icon: '🏢', label: 'Buildings complete' }],
  },
  {
    id: 'beach-groins',
    name: 'Converted beach & ocean groins',
    category: 'beach',
    x: 20,
    y: 96,
    w: 60,
    h: 3,
    rawIcon: '🪨',
    clearedIcon: '🪨',
    stages: [{ phaseId: 'phase4-marine-window', icon: '🏖️', label: 'Beach converted, groins in' }],
  },
];
