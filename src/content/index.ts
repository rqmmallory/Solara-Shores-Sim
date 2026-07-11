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

import phase1 from './sim/phase1-site-prep.json';

// JSON imports widen literal unions to string; the runtime validator
// (validate.ts, exercised in tests) is the real guarantee.
const raw = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13, m14];

export const modules: ContentModule[] = (raw as unknown as ContentModule[])
  .slice()
  .sort((a, b) => a.order - b.order);

export const moduleById = new Map(modules.map((m) => [m.id, m]));

export const simPhases: SimPhase[] = ([phase1] as unknown as SimPhase[])
  .slice()
  .sort((a, b) => a.order - b.order);

export const simPhaseById = new Map(simPhases.map((p) => [p.id, p]));

/** modules with at least their explainer + quiz ready */
export const readyModules = modules.filter((m) => m.status !== 'placeholder');

/** modules that can feed the math engine */
export const mathModules = modules.filter((m) => m.mathProblems.length > 0);
