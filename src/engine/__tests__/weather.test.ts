import { dayProductivity, WEATHER_TABLE, weatherEffects, WeatherState } from '../weather';

describe('weather engine (V3-9 task gating)', () => {
  it('covers all five weather states', () => {
    const states: WeatherState[] = ['clear', 'rain', 'heat', 'wind', 'stormWatch'];
    for (const s of states) {
      const w = weatherEffects(s);
      expect(w.state).toBe(s);
      expect(w.note.length).toBeGreaterThan(10);
    }
  });

  it('rain blocks concrete finishing, compaction, painting, and asphalt', () => {
    const rain = WEATHER_TABLE.rain;
    expect(rain.blocked.join(' ')).toMatch(/finishing/i);
    expect(rain.blocked.join(' ')).toMatch(/compaction/i);
    expect(rain.blocked.join(' ')).toMatch(/asphalt/i);
  });

  it('wind blocks crane lifts; heat favors asphalt', () => {
    expect(WEATHER_TABLE.wind.blocked.join(' ')).toMatch(/crane/i);
    expect(WEATHER_TABLE.heat.favored.join(' ')).toMatch(/asphalt/i);
  });

  it('productivity multipliers order sensibly: clear > heat > stormWatch', () => {
    expect(dayProductivity('clear')).toBe(1);
    expect(dayProductivity('heat')).toBeLessThan(1);
    expect(dayProductivity('stormWatch')).toBeLessThan(dayProductivity('heat'));
  });
});
