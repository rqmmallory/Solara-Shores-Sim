/**
 * Resolves each site zone's current icon/label/tier from completed sim
 * runs. A zone advances through its `stages` in phase order; before
 * Phase 1 it shows raw land, after Phase 1 (but before its own first
 * stage) it shows the cleared state.
 */
import { simPhases } from '../content';
import type { SiteZone } from '../content/siteMap';

export type ZoneTier = 'raw' | 'cleared' | number; // number = index into stages reached

export interface ZoneVisual {
  icon: string;
  label: string;
  tier: 'raw' | 'cleared' | 'built';
  /** 0..1 — how far through this zone's own stage list, for a mini progress dot */
  progress: number;
}

const PHASE_ORDER = new Map(simPhases.map((p) => [p.id, p.order]));

export function resolveZoneVisual(zone: SiteZone, completedPhaseIds: Set<string>): ZoneVisual {
  const sitePrepDone = completedPhaseIds.has('phase1-site-prep');

  let reached = -1;
  for (let i = 0; i < zone.stages.length; i++) {
    if (completedPhaseIds.has(zone.stages[i].phaseId)) reached = i;
  }

  if (reached === -1) {
    if (sitePrepDone) {
      return { icon: zone.clearedIcon, label: 'Cleared, awaiting build', tier: 'cleared', progress: 0 };
    }
    return { icon: zone.rawIcon, label: 'Raw land', tier: 'raw', progress: 0 };
  }

  const stage = zone.stages[reached];
  return {
    icon: stage.icon,
    label: stage.label,
    tier: 'built',
    progress: zone.stages.length <= 1 ? 1 : (reached + 1) / zone.stages.length,
  };
}

/** sanity helper used by content validation: every stage's phaseId must exist */
export function unknownPhaseRefs(zones: SiteZone[]): string[] {
  const errs: string[] = [];
  for (const z of zones) {
    for (const s of z.stages) {
      if (!PHASE_ORDER.has(s.phaseId)) errs.push(`${z.id}: unknown phase "${s.phaseId}"`);
    }
    // stages should be in non-decreasing phase order so "latest completed" logic is meaningful
    let lastOrder = -1;
    for (const s of z.stages) {
      const ord = PHASE_ORDER.get(s.phaseId) ?? -1;
      if (ord < lastOrder) errs.push(`${z.id}: stages out of phase order at "${s.phaseId}"`);
      lastOrder = ord;
    }
  }
  return errs;
}
