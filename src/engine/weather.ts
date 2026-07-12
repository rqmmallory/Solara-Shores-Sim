/**
 * Weather engine — V3-9's weather-vs-climate table as a lookup:
 * weather state → blocked tasks, degraded tasks (productivity
 * multipliers), and the teaching note. Climate sets the specs; weather
 * sets the day. Used by the Weather Desk reference and available to sim
 * phases as they move to day-based ticks.
 */

export type WeatherState = 'clear' | 'rain' | 'heat' | 'wind' | 'stormWatch';

export interface WeatherEffects {
  state: WeatherState;
  label: string;
  /** task categories that cannot proceed */
  blocked: string[];
  /** task categories that proceed at reduced productivity */
  degraded: { task: string; multiplier: number }[];
  /** task categories that actually benefit */
  favored: string[];
  note: string;
}

export const WEATHER_TABLE: Record<WeatherState, WeatherEffects> = {
  clear: {
    state: 'clear',
    label: 'Clear, moderate',
    blocked: [],
    degraded: [],
    favored: [],
    note: 'Full production day — the day the schedule assumes.',
  },
  rain: {
    state: 'rain',
    label: 'Rain',
    blocked: [
      'Concrete finishing (surface ruins)',
      'Compaction of fill (pumping)',
      'Painting / render',
      'Asphalt placement (wet base)',
    ],
    degraded: [
      { task: 'Earthwork generally', multiplier: 0.6 },
      { task: 'Exterior trades', multiplier: 0.5 },
    ],
    favored: [],
    note: 'Trench safety review required; May–October this is baseline, not bad luck — schedules carry weather days.',
  },
  heat: {
    state: 'heat',
    label: 'Extreme heat',
    blocked: [],
    degraded: [
      { task: 'Outdoor labor (heat stress)', multiplier: 0.75 },
      { task: 'Concrete pours (evaporation limits)', multiplier: 0.8 },
    ],
    favored: ['Asphalt compaction (longer window)'],
    note: 'Hydration/shade/schedule shifts are safety AND productivity — output drops 10–30% on peak afternoons. Big slabs move to dawn or night with the S2 hot-weather kit.',
  },
  wind: {
    state: 'wind',
    label: 'High wind (20–30+ mph)',
    blocked: ['Crane lifts', 'Membrane / sheet work'],
    degraded: [
      { task: 'Concrete finishing (plastic-shrinkage risk multiplies)', multiplier: 0.7 },
      { task: 'Dust-generating work (complaints)', multiplier: 0.8 },
    ],
    favored: [],
    note: 'The crane-killer and the slab-surface killer. Frame cycles that ignore wind forecasts idle crane crews at full rate.',
  },
  stormWatch: {
    state: 'stormWatch',
    label: 'Named-storm watch',
    blocked: ['All new weather-vulnerable work'],
    degraded: [{ task: 'Everything else (crews securing site)', multiplier: 0.4 }],
    favored: [],
    note: 'The 72/48/24-hour preparedness ladder executes: tie-downs, staged-material securing, demobilization triggers, crane laydown. Mechanical, not emotional (M1).',
  },
};

export function weatherEffects(state: WeatherState): WeatherEffects {
  return WEATHER_TABLE[state];
}

/** aggregate productivity multiplier for a general working day */
export function dayProductivity(state: WeatherState): number {
  const w = WEATHER_TABLE[state];
  if (w.degraded.length === 0) return 1;
  return w.degraded.reduce((acc, d) => Math.min(acc, d.multiplier), 1);
}
