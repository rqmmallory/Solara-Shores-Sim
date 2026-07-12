/**
 * Content registry. Modules are plain JSON — add a file, list it here,
 * and the whole app (learn, quiz, math, readiness score) picks it up.
 * Runtime shape checks live in validate.ts and run in unit tests.
 */
import type { ContentModule, SimPhase } from './schema';

import m01 from './modules/m01-site-conditions.json';
import m02 from './modules/m02-permitting.json';
import m03 from './modules/m03-horizontal.json';
import m04 from './modules/m04-marina.json';
import m05 from './modules/m05-beach.json';
import m06 from './modules/m06-single-family.json';
import m07 from './modules/m07-condos.json';
import m08 from './modules/m08-amenities.json';
import m09 from './modules/m09-budgeting.json';
import m10 from './modules/m10-contracts.json';
import m11 from './modules/m11-design.json';
import m12 from './modules/m12-risk.json';
import m13 from './modules/m13-soft-skills.json';
import m14 from './modules/m14-sequence.json';

// KB Volume 2 — construction science (trade level)
import s01 from './modules/s01-soils-compaction.json';
import s02 from './modules/s02-concrete.json';
import s03 from './modules/s03-reinforcement.json';
import s04 from './modules/s04-masonry.json';
import s05 from './modules/s05-formwork.json';
import s06 from './modules/s06-roofing-wind.json';
import s07 from './modules/s07-mep.json';
import s08 from './modules/s08-roads-asphalt.json';
import s09 from './modules/s09-marine-durability.json';
import s10 from './modules/s10-surveying.json';

// KB Volume 3 — physics backbone + climate & materials science
import v31 from './modules/v31-loads.json';
import v32 from './modules/v32-lateral.json';
import v33 from './modules/v33-water-buoyancy.json';
import v34 from './modules/v34-settlement.json';
import v35 from './modules/v35-thermal-moisture.json';
import v36 from './modules/v36-cracks.json';
import v37 from './modules/v37-coastal.json';
import v38 from './modules/v38-fire-egress.json';
import v39 from './modules/v39-climate-materials.json';

import phase1 from './sim/phase1-site-prep.json';
import phase2 from './sim/phase2-marine-horizontal.json';
import phase3 from './sim/phase3-vertical-amenity.json';
import phase4 from './sim/phase4-marine-window.json';
import phase5 from './sim/phase5-production-condos.json';
import phase6 from './sim/phase6-estates-senior-retail.json';
import phase7 from './sim/phase7-handover.json';

// JSON imports widen literal unions to string; the runtime validator
// (validate.ts, exercised in tests) is the real guarantee.
const raw = [
  m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14,
  s01, s02, s03, s04, s05, s06, s07, s08, s09, s10,
  v31, v32, v33, v34, v35, v36, v37, v38, v39,
];

export const modules: ContentModule[] = (raw as unknown as ContentModule[])
  .slice()
  .sort((a, b) => a.order - b.order);

export const moduleById = new Map(modules.map((m) => [m.id, m]));

export const simPhases: SimPhase[] = (
  [phase1, phase2, phase3, phase4, phase5, phase6, phase7] as unknown as SimPhase[]
)
  .slice()
  .sort((a, b) => a.order - b.order);

export const simPhaseById = new Map(simPhases.map((p) => [p.id, p]));

/** modules with at least their explainer + quiz ready */
export const readyModules = modules.filter((m) => m.status !== 'placeholder');

/** volume grouping for the Learn tab, by id prefix */
export function moduleVolume(m: ContentModule): 'project' | 'science' | 'physics' {
  if (m.id.startsWith('s')) return 'science';
  if (m.id.startsWith('v')) return 'physics';
  return 'project';
}

export const VOLUME_LABELS: Record<ReturnType<typeof moduleVolume>, string> = {
  project: 'Vol 1 — The Project (M1–M14)',
  science: 'Vol 2 — Construction Science (S1–S10)',
  physics: 'Vol 3 — Physics & Climate (V3-1–V3-9)',
};

/** modules that can feed the math engine */
export const mathModules = modules.filter((m) => m.mathProblems.length > 0);
