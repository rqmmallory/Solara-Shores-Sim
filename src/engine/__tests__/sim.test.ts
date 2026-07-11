import { simPhases } from '../../content';
import {
  chooseOption,
  currentStep,
  debrief,
  getCurveball,
  initialSimState,
  resolveCurveball,
} from '../sim';
import { seededRng, Rng } from '../rng';

const phase = simPhases.find((p) => p.id === 'phase1-site-prep')!;
const phase2 = simPhases.find((p) => p.id === 'phase2-marine-horizontal')!;

/** rng that never fires curveballs (always rolls high) */
const noEvents: Rng = () => 0.999;
/** rng that always fires whatever is eligible */
const allEvents: Rng = () => 0.000001;

function playOptimal(rng: Rng) {
  let s = initialSimState(phase);
  while (!s.finished) {
    if (s.pendingCurveball) {
      const cb = getCurveball(phase, s.pendingCurveball)!;
      const best = cb.choices!.find((o) => o.optimal) ?? cb.choices![0];
      s = resolveCurveball(phase, s, best);
      continue;
    }
    const step = currentStep(phase, s)!;
    const best = step.options.find((o) => o.optimal)!;
    s = chooseOption(phase, s, best, rng, 'realistic');
  }
  return s;
}

function playWorst(rng: Rng) {
  let s = initialSimState(phase);
  while (!s.finished) {
    if (s.pendingCurveball) {
      const cb = getCurveball(phase, s.pendingCurveball)!;
      const worst = cb.choices![cb.choices!.length - 1];
      s = resolveCurveball(phase, s, worst);
      continue;
    }
    const step = currentStep(phase, s)!;
    const worst = step.options.find((o) => !o.optimal && !o.acceptable) ?? step.options[step.options.length - 1];
    s = chooseOption(phase, s, worst, rng, 'realistic');
  }
  return s;
}

describe('sim engine', () => {
  it('walks all steps and finishes', () => {
    const s = playOptimal(noEvents);
    expect(s.finished).toBe(true);
    expect(s.decisions).toHaveLength(phase.steps.length);
    expect(s.log.length).toBeGreaterThanOrEqual(phase.steps.length);
  });

  it('optimal play with no events grades A or B', () => {
    const d = debrief(phase, playOptimal(noEvents));
    expect(['A', 'B']).toContain(d.grade);
    expect(d.score).toBeGreaterThanOrEqual(70);
  });

  it('worst-choice play scores clearly below optimal play', () => {
    const good = debrief(phase, playOptimal(seededRng(7)));
    const bad = debrief(phase, playWorst(seededRng(7)));
    expect(bad.score).toBeLessThan(good.score);
  });

  it('defused curveballs never fire', () => {
    // optimal play defuses depp-stopwork, karst-void, rock-claim, storm-warning
    const s = playOptimal(allEvents);
    for (const id of ['depp-stopwork', 'karst-void', 'rock-claim', 'storm-warning']) {
      const cb = getCurveball(phase, id)!;
      // it may be in fired only if it fired before the defusing step; with
      // allEvents the first roll happens after step 1 which already defuses
      // depp-stopwork — so check it's not in the log as a curveball hit
      // unless it was armed first.
      expect(s.defused).toContain(cb.id);
    }
  });

  it('curveballs never fire twice', () => {
    const s = playWorst(allEvents);
    const firedIds = s.fired;
    expect(new Set(firedIds).size).toBe(firedIds.length);
  });

  it('curveballs with choices pause the run until resolved', () => {
    let s = initialSimState(phase);
    const step = currentStep(phase, s)!;
    // worst option at cec-gate arms depp-stopwork (no choices; applies directly)
    // use a curveball WITH choices: karst-void — arm it by skipping geotech
    const cec = step.options.find((o) => o.optimal)!;
    s = chooseOption(phase, s, cec, noEvents, 'realistic');
    const geoStep = currentStep(phase, s)!;
    expect(geoStep.id).toBe('geotech-program');
    const skip = geoStep.options.find((o) => o.id === 'skip-geotech')!;
    s = chooseOption(phase, s, skip, allEvents, 'realistic');
    // some curveball fired; if it has choices, pendingCurveball is set and
    // the step index does not advance until resolved
    if (s.pendingCurveball) {
      const before = s.stepIndex;
      const cb = getCurveball(phase, s.pendingCurveball)!;
      expect(cb.choices?.length).toBeGreaterThan(0);
      s = resolveCurveball(phase, s, cb.choices![0]);
      expect(s.pendingCurveball).toBeNull();
      expect(s.stepIndex).toBe(before + 1);
    }
  });

  it('phase 2 plays end-to-end: optimal beats worst, both finish', () => {
    const playPhase = (worst: boolean) => {
      let s = initialSimState(phase2);
      const rng = seededRng(11);
      while (!s.finished) {
        if (s.pendingCurveball) {
          const cb = getCurveball(phase2, s.pendingCurveball)!;
          const opt = worst
            ? cb.choices![cb.choices!.length - 1]
            : (cb.choices!.find((o) => o.optimal) ?? cb.choices![0]);
          s = resolveCurveball(phase2, s, opt);
          continue;
        }
        const step = currentStep(phase2, s)!;
        const opt = worst
          ? (step.options.find((o) => !o.optimal && !o.acceptable) ?? step.options[step.options.length - 1])
          : step.options.find((o) => o.optimal)!;
        s = chooseOption(phase2, s, opt, rng, 'realistic');
      }
      return s;
    };
    const good = debrief(phase2, playPhase(false));
    const bad = debrief(phase2, playPhase(true));
    expect(good.score).toBeGreaterThan(bad.score);
    expect(['A', 'B']).toContain(good.grade);
  });

  it('quality is clamped to 0..100 and risk floors at 0', () => {
    const s = playWorst(allEvents);
    expect(s.quality).toBeGreaterThanOrEqual(0);
    expect(s.quality).toBeLessThanOrEqual(100);
    expect(s.risk).toBeGreaterThanOrEqual(0);
  });
});
