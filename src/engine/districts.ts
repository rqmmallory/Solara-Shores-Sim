/**
 * District-level construction progress — the model that lets the estate emerge
 * continuously, one work front at a time, per the agreed design:
 *
 *   "Decisions set the ceiling; idle time fills up to it."
 *
 * The ~20 master-plan parcels are grouped into five work fronts (districts).
 * Each district owns an ordered vocabulary of real construction stages. Your
 * sim DECISIONS authorize how far a district may advance (its ceiling stage);
 * once authorized, work ACCRUES toward that ceiling on a clock — including
 * elapsed real time while the app is closed — but can never pass the ceiling.
 * Better play raises both the ceiling and the fill rate, so a well-run estate
 * visibly builds faster.
 *
 * This module is pure (no React, no clock of its own): callers pass timestamps
 * in, which makes the idle math fully unit-testable.
 */

export type DistrictId = 'enabling' | 'marine' | 'housing' | 'amenity' | 'condos';

/**
 * Master pacing knob. Base rates below are expressed in "stages per real day";
 * this multiplier compresses that so construction is perceptible in a play
 * session. At 300, a housing stage lands roughly every ~5 minutes and a whole
 * work front fills over ~1–2 hours of elapsed time. Lower it toward a
 * check-back-daily idle cadence, raise it for faster arcade-style building —
 * this one number sets the whole feel and is meant to be tuned to taste.
 */
export const GAME_SPEED = 300;

export interface DistrictStage {
  key: string;
  label: string;
  icon: string;
}

export interface District {
  id: DistrictId;
  name: string;
  /** master-plan zone ids that make up this work front */
  zoneIds: string[];
  /** ordered construction stages, index 0 = untouched land */
  stages: DistrictStage[];
  /**
   * decision checkpoints: completing `phaseId` authorises this district up to
   * `stage` (an index into `stages`). The ceiling is the furthest authorised
   * stage among completed phases.
   */
  checkpoints: { phaseId: string; stage: number }[];
  /** base fill rate in stages per day of elapsed time (before modifiers) */
  baseRatePerDay: number;
  /** stage index at which vertical structure begins to rise on the map —
   * before it, parcels read as ground; from it, buildings extrude. */
  structureStage: number;
}

export const DISTRICTS: District[] = [
  {
    id: 'enabling',
    name: 'Enabling works',
    zoneIds: ['road-frontage', 'security-gate', 'parking-fields', 'incoming-electrical'],
    stages: [
      { key: 'raw', label: 'Raw land', icon: '🌿' },
      { key: 'survey', label: 'Survey & set-out', icon: '📐' },
      { key: 'cleared', label: 'Cleared & fenced', icon: '🚧' },
      { key: 'earthworks', label: 'Earthworks', icon: '🚜' },
      { key: 'stormwater', label: 'Stormwater in', icon: '💧' },
      { key: 'roads', label: 'Roads formed', icon: '🛣️' },
      { key: 'services', label: 'Power & services', icon: '⚡' },
      { key: 'complete', label: 'Entrance complete', icon: '🏁' },
    ],
    checkpoints: [
      { phaseId: 'phase1-site-prep', stage: 6 },
      { phaseId: 'phase7-handover', stage: 7 },
    ],
    baseRatePerDay: 2.0,
    structureStage: 5,
  },
  {
    id: 'marine',
    name: 'Marine works',
    zoneIds: ['marina-basin', 'marina-fuel', 'canal-estates', 'beach-groins'],
    stages: [
      { key: 'raw', label: 'Raw shoreline', icon: '🌊' },
      { key: 'survey', label: 'Bathymetric survey', icon: '📐' },
      { key: 'dry-excavation', label: 'Excavated in the dry', icon: '🕳️' },
      { key: 'bulkheads', label: 'Bulkheads & structures', icon: '🧱' },
      { key: 'canal-cut', label: 'Canals cut', icon: '🪨' },
      { key: 'flooded', label: 'Flooded / wet', icon: '🌊' },
      { key: 'docks', label: 'Docks & boats', icon: '⛵' },
      { key: 'beach', label: 'Beach & groins', icon: '🏖️' },
      { key: 'complete', label: 'Estates released', icon: '⚓' },
    ],
    checkpoints: [
      { phaseId: 'phase2-marine-horizontal', stage: 4 },
      { phaseId: 'phase4-marine-window', stage: 7 },
      { phaseId: 'phase6-estates-senior-retail', stage: 8 },
    ],
    baseRatePerDay: 1.2,
    structureStage: 6,
  },
  {
    id: 'housing',
    name: 'Single-family housing',
    zoneIds: ['lots-wave-1', 'lots-wave-2', 'lots-wave-3'],
    stages: [
      { key: 'raw', label: 'Raw land', icon: '🌳' },
      { key: 'survey', label: 'Lots pegged', icon: '📐' },
      { key: 'cleared', label: 'Cleared', icon: '🟫' },
      { key: 'earthworks', label: 'Earthworks', icon: '🚜' },
      { key: 'stormwater', label: 'Stormwater', icon: '💧' },
      { key: 'roads', label: 'Roads', icon: '🛣️' },
      { key: 'services', label: 'Services in', icon: '🔌' },
      { key: 'slabs', label: 'Slabs poured', icon: '⬜' },
      { key: 'framing', label: 'Framing', icon: '🪵' },
      { key: 'roofing', label: 'Roofs on', icon: '🏠' },
      { key: 'brickwork', label: 'Blockwork & envelope', icon: '🧱' },
      { key: 'fitout', label: 'Fit-out', icon: '🎨' },
      { key: 'landscaping', label: 'Landscaping', icon: '🌳' },
      { key: 'occupancy', label: 'Residents moving in', icon: '🔑' },
      { key: 'complete', label: 'Wave complete', icon: '✅' },
    ],
    checkpoints: [
      { phaseId: 'phase2-marine-horizontal', stage: 6 },
      { phaseId: 'phase3-vertical-amenity', stage: 10 },
      { phaseId: 'phase5-production-condos', stage: 12 },
      { phaseId: 'phase6-estates-senior-retail', stage: 13 },
      { phaseId: 'phase7-handover', stage: 14 },
    ],
    baseRatePerDay: 1.0,
    structureStage: 7,
  },
  {
    id: 'amenity',
    name: 'Amenity core',
    zoneIds: ['lakes-amenity-core', 'clubhouse', 'senior-living', 'retail-block'],
    stages: [
      { key: 'raw', label: 'Raw land', icon: '🌳' },
      { key: 'cleared', label: 'Cleared', icon: '🟫' },
      { key: 'earthworks', label: 'Earthworks', icon: '🚜' },
      { key: 'lakes', label: 'Lakes shaped', icon: '💧' },
      { key: 'structures', label: 'Structures up', icon: '🏗️' },
      { key: 'fitout', label: 'Fit-out', icon: '🎨' },
      { key: 'landscaping', label: 'Landscaping', icon: '🌳' },
      { key: 'open', label: 'Amenities open', icon: '🏊' },
    ],
    checkpoints: [
      { phaseId: 'phase1-site-prep', stage: 3 },
      { phaseId: 'phase3-vertical-amenity', stage: 5 },
      { phaseId: 'phase6-estates-senior-retail', stage: 7 },
    ],
    baseRatePerDay: 1.0,
    structureStage: 4,
  },
  {
    id: 'condos',
    name: 'Condominiums',
    zoneIds: [
      'condo-1', 'condo-2', 'condo-3', 'condo-4', 'condo-5', 'condo-6', 'condo-7', 'condo-8',
      'condo-9', 'condo-10', 'condo-11', 'condo-12', 'condo-13', 'condo-14', 'condo-15',
    ],
    stages: [
      { key: 'raw', label: 'Raw land', icon: '🌳' },
      { key: 'cleared', label: 'Cleared', icon: '🟫' },
      { key: 'slabs', label: 'Piling & slabs', icon: '⬜' },
      { key: 'framing', label: 'Structure rising', icon: '🪵' },
      { key: 'model', label: 'Model building', icon: '🏗️' },
      { key: 'envelope', label: 'Envelope & glazing', icon: '🧱' },
      { key: 'fitout', label: 'Fit-out', icon: '🎨' },
      { key: 'complete', label: 'Buildings complete', icon: '🏢' },
    ],
    checkpoints: [
      { phaseId: 'phase3-vertical-amenity', stage: 4 },
      { phaseId: 'phase5-production-condos', stage: 7 },
    ],
    baseRatePerDay: 0.9,
    structureStage: 2,
  },
];

const BY_ID = new Map(DISTRICTS.map((d) => [d.id, d]));
const ZONE_TO_DISTRICT = new Map<string, DistrictId>();
for (const d of DISTRICTS) for (const z of d.zoneIds) ZONE_TO_DISTRICT.set(z, d.id);

export function districtById(id: DistrictId): District | undefined {
  return BY_ID.get(id);
}

export function districtOfZone(zoneId: string): DistrictId | undefined {
  return ZONE_TO_DISTRICT.get(zoneId);
}

/** furthest stage the player's completed decisions authorise for a district */
export function ceilingStage(district: District, completedPhaseIds: Set<string>): number {
  let ceiling = 0;
  for (const cp of district.checkpoints) {
    if (completedPhaseIds.has(cp.phaseId)) ceiling = Math.max(ceiling, cp.stage);
  }
  return Math.min(ceiling, district.stages.length - 1);
}

/** live progress of one district: continuous position + last accrual time */
export interface DistrictProgress {
  /** continuous stage position, e.g. 6.4 = 40% through the 7th stage */
  pos: number;
  /** timestamp of the last accrual, for idle catch-up on next load */
  lastTickAt: number;
}

export function initialProgress(now: number): DistrictProgress {
  return { pos: 0, lastTickAt: now };
}

/**
 * Advance a district toward its ceiling by the time elapsed since its last
 * tick. Fills continuously and clamps at the ceiling — authorised work
 * proceeds without you, but never past what your decisions unlocked. Rate is
 * the district's base rate scaled by `rateMultiplier` (quality/morale/weather
 * modifiers live in the caller). Returns a new object; never mutates.
 */
export function accrue(
  p: DistrictProgress,
  district: District,
  ceiling: number,
  now: number,
  rateMultiplier = 1
): DistrictProgress {
  if (now <= p.lastTickAt) return { ...p, lastTickAt: Math.max(p.lastTickAt, now) };
  const elapsedDays = (now - p.lastTickAt) / 86_400_000;
  const gain = elapsedDays * district.baseRatePerDay * Math.max(0, rateMultiplier);
  const pos = Math.min(ceiling, p.pos + gain);
  return { pos: Math.max(p.pos, pos), lastTickAt: now };
}

/** resolve a continuous position to the stage the player currently sees */
export function stageAt(district: District, pos: number): DistrictStage {
  const idx = Math.max(0, Math.min(district.stages.length - 1, Math.floor(pos)));
  return district.stages[idx];
}

/** 0..1 fraction into the current stage, for a smooth progress bar */
export function stageFraction(pos: number): number {
  return pos - Math.floor(pos);
}

/** overall 0..100 completion of a district (position over its final stage) */
export function districtPercent(district: District, pos: number): number {
  const max = district.stages.length - 1;
  return max === 0 ? 0 : Math.round((Math.min(pos, max) / max) * 100);
}
