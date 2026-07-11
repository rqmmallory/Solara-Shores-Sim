/**
 * Persisted app state — one JSON blob in AsyncStorage, versioned so the
 * shape can migrate later. React context provides it app-wide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurveballFrequency } from '../engine/sim';
import type { MathStats, ModuleStats, SimRecord } from '../engine/progress';
import { emptyMathStats } from '../engine/progress';
import type { SrsItem } from '../engine/spacedRepetition';

export interface PersistedState {
  version: 1;
  moduleStats: Record<string, ModuleStats>;
  mathStats: MathStats;
  srsQueue: SrsItem[];
  simRecords: SimRecord[];
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
