/**
 * The Learning Path: all 33 modules in pedagogical order — physics
 * intuition first, then the trade science that uses it, then the
 * project-management material that manages both. The "master's program
 * explained from first principles" sequencing: each module's PLAIN
 * register assumes only what earlier path entries taught.
 */
import { moduleById } from '../content';
import type { ModuleStats } from './progress';
import { moduleProficiency } from './progress';

/** proficiency at which a path step counts as done enough to move on */
export const PATH_THRESHOLD = 70;

export const LEARNING_PATH: string[] = [
  // 1) The site and the stakes — why this project is its own subject
  'm01-site-conditions',
  'm02-permitting',
  // 2) Physics you can hold in your hands
  'v31-loads', // where loads go
  'v32-lateral', // surviving sideways pushes
  'v33-water-buoyancy', // water pushes on everything
  'v34-settlement', // uneven sinking makes cracks
  'v35-thermal-moisture', // everything breathes
  // 3) Ground and structure, trade by trade
  's01-soils-compaction',
  's02-concrete',
  's03-reinforcement',
  's04-masonry',
  's05-formwork',
  's06-roofing-wind',
  // 4) Systems and skins
  's07-mep',
  's08-roads-asphalt',
  'v38-fire-egress',
  // 5) The coast — this project's specialist half
  'v37-coastal',
  's09-marine-durability',
  'm04-marina',
  'm05-beach',
  // 6) Reading the built work
  'v36-cracks',
  'v39-climate-materials',
  's10-surveying',
  // 7) Building at production scale
  'm03-horizontal',
  'm06-single-family',
  'm07-condos',
  'm08-amenities',
  // 8) Running the business of building
  'm09-budgeting',
  'm10-contracts',
  'm11-design',
  'm12-risk',
  'm13-soft-skills',
  'm14-sequence',
];

export interface PathStep {
  moduleId: string;
  short: string;
  title: string;
  proficiency: number;
  done: boolean;
}

export function pathProgress(moduleStats: Record<string, ModuleStats>): PathStep[] {
  return LEARNING_PATH.map((id) => {
    const m = moduleById.get(id)!;
    const proficiency = moduleProficiency(m, moduleStats[id]);
    return { moduleId: id, short: m.short, title: m.title, proficiency, done: proficiency >= PATH_THRESHOLD };
  });
}

/** the next module to study: first path step below threshold */
export function nextOnPath(moduleStats: Record<string, ModuleStats>): PathStep | null {
  return pathProgress(moduleStats).find((s) => !s.done) ?? null;
}
