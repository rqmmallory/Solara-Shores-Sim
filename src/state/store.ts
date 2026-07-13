/**
 * Persisted app state — one JSON blob in AsyncStorage, versioned so the
 * shape can migrate later. React context provides it app-wide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurveballFrequency } from '../engine/sim';
import type { MathStats, ModuleStats, SimRecord } from '../engine/progress';
import { emptyMathStats } from '../engine/progress';
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
  settings: {
    curveballFrequency: CurveballFrequency;
  };
}

export function emptyState(): PersistedState {
  return {
    version: 1,
    moduleStats: {},
    mathStats: emptyMathStats(),
    srsQueue: [],
    simRecords: [],
    simRuns: {},
    capital: 0,
    achievements: [],
    settings: { curveballFrequency: 'realistic' },
  };
}

const KEY = 'solara.state.v1';

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1) return emptyState();
    // merge over empty so newly added fields get defaults
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      mathStats: { ...base.mathStats, ...parsed.mathStats },
      settings: { ...base.settings, ...parsed.settings },
    };
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
