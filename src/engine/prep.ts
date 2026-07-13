/**
 * Prep-bonus interlock: each sim phase has linked study modules. Reach
 * an average proficiency of PREP_THRESHOLD across them BEFORE running
 * the phase, and you start with reduced risk exposure — the sim
 * develops as you complete learning tasks, and studying the right
 * material has a concrete in-game payoff (exactly like real life).
 */
import { moduleById } from '../content';
import type { ModuleStats } from './progress';
import { moduleProficiency } from './progress';

export const PREP_THRESHOLD = 60; // average proficiency % to qualify
export const PREP_RISK_RELIEF = 2; // starting risk reduction when qualified

export const PHASE_PREP: Record<string, string[]> = {
  'phase1-site-prep': ['m01-site-conditions', 'm02-permitting', 's01-soils-compaction'],
  'phase2-marine-horizontal': ['m03-horizontal', 'm04-marina', 'v33-water-buoyancy'],
  'phase3-vertical-amenity': ['m06-single-family', 's02-concrete', 's04-masonry', 's06-roofing-wind'],
  'phase4-marine-window': ['m05-beach', 'v37-coastal', 's09-marine-durability'],
  'phase5-production-condos': ['m07-condos', 's03-reinforcement', 's05-formwork'],
  'phase6-estates-senior-retail': ['m11-design', 'v38-fire-egress', 's10-surveying'],
  'phase7-handover': ['m09-budgeting', 'm12-risk', 'v36-cracks'],
};

export interface PrepStatus {
  qualified: boolean;
  avgProficiency: number;
  modules: { id: string; short: string; proficiency: number }[];
}

export function prepStatus(
  phaseId: string,
  moduleStats: Record<string, ModuleStats>
): PrepStatus {
  const ids = PHASE_PREP[phaseId] ?? [];
  const mods = ids
    .map((id) => moduleById.get(id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => ({
      id: m.id,
      short: m.short,
      proficiency: moduleProficiency(m, moduleStats[m.id]),
    }));
  const avg =
    mods.length === 0 ? 0 : Math.round(mods.reduce((a, m) => a + m.proficiency, 0) / mods.length);
  return { qualified: mods.length > 0 && avg >= PREP_THRESHOLD, avgProficiency: avg, modules: mods };
}
