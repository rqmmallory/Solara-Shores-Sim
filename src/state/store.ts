/**
 * Persisted app state — one JSON blob in AsyncStorage, versioned so the
 * shape can migrate later. React context provides it app-wide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurveballFrequency } from '../engine/sim';
import type { MathStats, ModuleStats, SimRecord } from '../engine/progress';
import { emptyMathStats } from '../engine/progress';
import { DISTRICTS, DistrictProgress, initialProgress } from '../engine/districts';
import type { PrincipleRetention } from '../engine/principles';
import type { SrsItem } from '../engine/spacedRepetition';

/** the latest completed run of a phase — the canonical "what you did",
 * carried into later phases as flags + open risk */
export interface SimRunSnapshot {
  phaseId: string;
  decisions: { stepId: string; optionId: string }[];
  flags: string[];
  finalRisk: number;
  score: number;
}

export interface PersistedState {
  version: 1;
  /**
   * when the player last DID something (ms). Stamped by player actions only,
   * never by the background construction clock, so cross-device sync can
   * pick the save holding the most recent real decision (see cloudSync).
   */
  updatedAt: number;
  moduleStats: Record<string, ModuleStats>;
  mathStats: MathStats;
  srsQueue: SrsItem[];
  simRecords: SimRecord[];
  /** keyed by phaseId — latest completed run per phase */
  simRuns: Record<string, SimRunSnapshot>;
  /**
   * CM Capital (B$) — the spendable currency. Earned by every learning
   * activity (B$1 per 2 XP), spent inside sim runs on advisor actions
   * (QS reviews, reserve releases, acceleration workshops). Learning
   * literally funds better building.
   */
  capital: number;
  /** ids of achievements the player has unlocked (see engine/achievements) */
  achievements: string[];
  /** last claimed daily challenge — { key: day-key, id } — one claim per day */
  dailyClaim: { key: string; id: string } | null;
  /** last claimed weekly contract — { key: week-key, id } */
  weeklyClaim: { key: string; id: string } | null;
  /**
   * live construction progress per work front (see engine/districts). Each
   * district fills toward the ceiling its decisions authorise, over elapsed
   * real time — so the estate keeps building while the app is closed.
   */
  districts: Record<string, DistrictProgress>;
  /**
   * per-principle retention (engine/principles) — how well each recurring law
   * is holding up, so spacing can resurface a weak/stale law in a new disguise.
   */
  principleRetention: PrincipleRetention;
  settings: {
    curveballFrequency: CurveballFrequency;
  };
}

function freshDistricts(now: number): Record<string, DistrictProgress> {
  return Object.fromEntries(DISTRICTS.map((d) => [d.id, initialProgress(now)]));
}

export function emptyState(): PersistedState {
  return {
    version: 1,
    updatedAt: 0,
    moduleStats: {},
    mathStats: emptyMathStats(),
    srsQueue: [],
    simRecords: [],
    simRuns: {},
    capital: 0,
    achievements: [],
    dailyClaim: null,
    weeklyClaim: null,
    districts: freshDistricts(Date.now()),
    principleRetention: {},
    settings: { curveballFrequency: 'realistic' },
  };
}

const KEY = 'solara.state.v1';

/**
 * A parsed save (from this device or the cloud) merged over an empty state so
 * fields added since it was written get defaults. null if it isn't a v1 save.
 */
export function hydrate(parsed: unknown): PersistedState | null {
  if (!parsed || typeof parsed !== 'object' || (parsed as PersistedState).version !== 1) return null;
  const p = parsed as PersistedState;
  const base = emptyState();
  return {
    ...base,
    ...p,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0,
    mathStats: { ...base.mathStats, ...p.mathStats },
    districts: { ...base.districts, ...(p.districts ?? {}) },
    principleRetention: { ...base.principleRetention, ...(p.principleRetention ?? {}) },
    settings: { ...base.settings, ...p.settings },
  };
}

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    return hydrate(JSON.parse(raw)) ?? emptyState();
  } catch {
    return emptyState();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveStateDebounced(state: PersistedState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, 400);
}

export async function resetState(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
