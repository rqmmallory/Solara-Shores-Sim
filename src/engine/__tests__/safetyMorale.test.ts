import { simPhases } from '../../content';
import { chooseOption, debrief, initialSimState } from '../sim';
import type { Rng } from '../rng';

const phase = simPhases[0];
// rng that returns its ceiling never triggers a curveball, isolating effects
const noCurveballs: Rng = () => 1;

/** apply a single option's effects in isolation via the reducer */
function afterChoice(effectsOverride: Record<string, number>) {
  const s = initialSimState(phase);
  const step = phase.steps[0];
  const opt = { ...step.options[0], effects: effectsOverride };
  return chooseOption(phase, s, opt, noCurveballs, 'gentle');
}

describe('safety + morale meters', () => {
  it('start at 90 / 75', () => {
    const s = initialSimState(phase);
    expect(s.safety).toBe(90);
    expect(s.morale).toBe(75);
  });

  it('explicit deltas move them and clamp to 0..100', () => {
    const up = afterChoice({ safety: 5, morale: 30 });
    expect(up.safety).toBe(95);
    expect(up.morale).toBe(100); // 75 + 30 clamps
    const down = afterChoice({ safety: -100 });
    expect(down.safety).toBe(0);
  });

  it('taking on risk erodes safety automatically even with no explicit safety', () => {
    const s = afterChoice({ risk: 6 });
    expect(s.safety).toBe(84); // 90 - 6
    expect(s.risk).toBe(6);
  });

  it('defusing risk does not auto-restore safety (must be invested in)', () => {
    const s = afterChoice({ risk: -3 });
    expect(s.safety).toBe(90); // unchanged; negative risk gives no safety credit
  });
});

describe('debrief safety guard', () => {
  it('does not penalise a safe job (>=60)', () => {
    const s = { ...initialSimState(phase), safety: 90, finished: true };
    expect(debrief(phase, s).safetyPenalty).toBe(0);
  });

  it('penalises the grade when safety falls below 60', () => {
    const safe = debrief(phase, { ...initialSimState(phase), safety: 90, finished: true });
    const unsafe = debrief(phase, { ...initialSimState(phase), safety: 30, finished: true });
    expect(unsafe.safetyPenalty).toBeGreaterThan(0);
    expect(unsafe.score).toBeLessThan(safe.score);
  });
});
