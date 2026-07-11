/**
 * Simulation engine — a pure reducer over data-driven phase content.
 *
 * Consequence-based learning, not punishment: there is no game-over.
 * Choices move four meters (days, dollars, quality, risk exposure) and
 * can ARM or DEFUSE curveballs. The debrief grades the run against the
 * phase's contingency allowances and explains every decision.
 */
import type { Curveball, SimEffects, SimOption, SimPhase, SimStep } from '../content/schema';
import type { Rng } from './rng';

export type CurveballFrequency = 'gentle' | 'realistic' | 'chaotic';

export const FREQUENCY_MULTIPLIER: Record<CurveballFrequency, number> = {
  gentle: 0.5,
  realistic: 1,
  chaotic: 1.6,
};

export interface SimLogEntry {
  kind: 'decision' | 'curveball' | 'info';
  title: string;
  detail: string;
  effects?: SimEffects;
  optimal?: boolean;
  acceptable?: boolean;
}

export interface SimState {
  phaseId: string;
  stepIndex: number;
  /** total working days added beyond plan (can go negative) */
  slipDays: number;
  /** dollars of variance added beyond baseline (can go negative) */
  costVariance: number;
  /** 0..100, starts at 70 — "how well built is what you built" */
  quality: number;
  /** open risk exposure, starts at 0 — unresolved liabilities you carry */
  risk: number;
  /** curveballs armed (probability boosted) by choices */
  armed: string[];
  /** curveballs defused (removed from pool) by choices */
  defused: string[];
  /** curveballs already fired (never repeat) */
  fired: string[];
  /** curveball currently awaiting the player's response, if any */
  pendingCurveball: string | null;
  log: SimLogEntry[];
  finished: boolean;
  decisions: { stepId: string; optionId: string }[];
}

export function initialSimState(phase: SimPhase): SimState {
  return {
    phaseId: phase.id,
    stepIndex: 0,
    slipDays: 0,
    costVariance: 0,
    quality: 70,
    risk: 0,
    armed: [],
    defused: [],
    fired: [],
    pendingCurveball: null,
    log: [],
    finished: false,
    decisions: [],
  };
}

function applyEffects(s: SimState, e: SimEffects): SimState {
  return {
    ...s,
    slipDays: s.slipDays + (e.days ?? 0),
    costVariance: s.costVariance + (e.cost ?? 0),
    quality: clamp(s.quality + (e.quality ?? 0), 0, 100),
    risk: Math.max(0, s.risk + (e.risk ?? 0)),
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function currentStep(phase: SimPhase, s: SimState): SimStep | null {
  return phase.steps[s.stepIndex] ?? null;
}

export function getCurveball(phase: SimPhase, id: string): Curveball | undefined {
  return phase.curveballs.find((c) => c.id === id);
}

/**
 * Player picks an option at the current step. Applies effects, arms/
 * defuses events, then rolls the curveball pool. If a curveball with
 * choices fires, it becomes pending and must be resolved via
 * `resolveCurveball` before the next step.
 */
export function chooseOption(
  phase: SimPhase,
  s: SimState,
  option: SimOption,
  rng: Rng,
  frequency: CurveballFrequency = 'realistic'
): SimState {
  const step = currentStep(phase, s);
  if (!step || s.pendingCurveball || s.finished) return s;

  let next = applyEffects(s, option.effects);
  next = {
    ...next,
    armed: [...new Set([...next.armed, ...(option.arms ?? [])])],
    defused: [...new Set([...next.defused, ...(option.defuses ?? [])])],
    decisions: [...next.decisions, { stepId: step.id, optionId: option.id }],
    log: [
      ...next.log,
      {
        kind: 'decision',
        title: step.title,
        detail: `${option.label} — ${option.outcome}`,
        effects: option.effects,
        optimal: option.optimal,
        acceptable: option.acceptable,
      },
    ],
  };

  next = rollCurveball(phase, next, rng, frequency);
  return advanceIfClear(phase, next);
}

function rollCurveball(
  phase: SimPhase,
  s: SimState,
  rng: Rng,
  frequency: CurveballFrequency
): SimState {
  const mult = FREQUENCY_MULTIPLIER[frequency];
  const pool = phase.curveballs.filter(
    (c) => !s.fired.includes(c.id) && !s.defused.includes(c.id)
  );
  // spread event pressure across steps: roll each candidate independently,
  // fire at most one per step (the highest roller)
  let firing: Curveball | null = null;
  let bestMargin = -Infinity;
  for (const c of pool) {
    const armedBoost = s.armed.includes(c.id) ? Math.max(c.chance, 0.85) : c.chance;
    // per-step chance: pool chance is authored per-run; divide by step count
    const perStep = clamp((armedBoost * mult) / Math.max(1, phase.steps.length - 1), 0, 0.95);
    const roll = rng();
    const margin = perStep - roll;
    if (margin > 0 && margin > bestMargin) {
      bestMargin = margin;
      firing = c;
    }
  }
  if (!firing) return s;

  const fired = [...s.fired, firing.id];
  if (firing.choices?.length) {
    return { ...s, fired, pendingCurveball: firing.id };
  }
  const hit = applyEffects(s, firing.effects);
  return {
    ...hit,
    fired,
    log: [
      ...hit.log,
      {
        kind: 'curveball',
        title: firing.title,
        detail: `${firing.description} ${firing.lesson}`,
        effects: firing.effects,
      },
    ],
  };
}

/** Player responds to a pending curveball that carried choices. */
export function resolveCurveball(phase: SimPhase, s: SimState, option: SimOption): SimState {
  if (!s.pendingCurveball) return s;
  const cb = getCurveball(phase, s.pendingCurveball);
  if (!cb) return { ...s, pendingCurveball: null };
  let next = applyEffects(s, option.effects);
  next = {
    ...next,
    pendingCurveball: null,
    log: [
      ...next.log,
      {
        kind: 'curveball',
        title: cb.title,
        detail: `${option.label} — ${option.outcome} Lesson: ${cb.lesson}`,
        effects: option.effects,
        optimal: option.optimal,
        acceptable: option.acceptable,
      },
    ],
  };
  return advanceIfClear(phase, next);
}

function advanceIfClear(phase: SimPhase, s: SimState): SimState {
  if (s.pendingCurveball) return s;
  const nextIndex = s.stepIndex + 1;
  if (nextIndex >= phase.steps.length) {
    return { ...s, stepIndex: nextIndex, finished: true };
  }
  return { ...s, stepIndex: nextIndex };
}

// ---------------------------------------------------------------- debrief

export interface SimDebrief {
  grade: 'A' | 'B' | 'C' | 'D';
  score: number; // 0..100
  finalDays: number;
  plannedDays: number;
  slipAllowanceDays: number;
  spentVariance: number;
  contingencyAllowance: number;
  quality: number;
  risk: number;
  optimalCount: number;
  decisionCount: number;
  headline: string;
  notes: string[];
}

/**
 * Grade against allowances, the way a real phase is judged: a plan
 * carries ~8% weather/slip allowance and ~10% cost contingency — landing
 * inside them IS success, not perfection.
 */
export function debrief(phase: SimPhase, s: SimState): SimDebrief {
  const slipAllowance = Math.round(phase.plannedDays * 0.08);
  const contingency = Math.round(phase.startBudget * 0.1);

  const schedScore = clamp(100 - (Math.max(0, s.slipDays - slipAllowance) / phase.plannedDays) * 250, 0, 100);
  const costScore = clamp(100 - (Math.max(0, s.costVariance - contingency) / phase.startBudget) * 250, 0, 100);
  const qualScore = s.quality;
  const riskScore = clamp(100 - s.risk * 10, 0, 100);
  const score = Math.round(schedScore * 0.3 + costScore * 0.3 + qualScore * 0.25 + riskScore * 0.15);

  const optimalCount = s.log.filter((l) => l.optimal).length;
  const decisionCount = s.log.filter((l) => l.kind === 'decision' || (l.kind === 'curveball' && l.optimal !== undefined)).length;

  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';
  const notes: string[] = [];
  if (s.slipDays <= slipAllowance)
    notes.push(`Schedule: ${s.slipDays} days of slip against a ${slipAllowance}-day allowance — inside the plan. Slip inside allowance is normal life, not failure.`);
  else
    notes.push(`Schedule: ${s.slipDays} days of slip vs a ${slipAllowance}-day allowance. Every extra month burns general conditions ($150–400K/month at program scale).`);
  if (s.costVariance <= contingency)
    notes.push(`Cost: ${money(s.costVariance)} of variance against ${money(contingency)} contingency — contingency did its job.`);
  else
    notes.push(`Cost: ${money(s.costVariance)} of variance blew through the ${money(contingency)} contingency. Ask which decisions traded a visible cost now for an invisible one later.`);
  notes.push(`Quality ended at ${s.quality}/100 — quality only moves when you pay for systems (testing labs, geotech, rehearsals) before you need them.`);
  if (s.risk > 0)
    notes.push(`You finished carrying ${s.risk} points of open risk exposure — liabilities that didn't bite THIS phase but ride into the next one.`);
  else notes.push('You finished with no open risk exposure — nothing armed and left hanging.');

  const headline =
    grade === 'A'
      ? 'Job-site ready. You bought certainty early and it paid.'
      : grade === 'B'
        ? 'Solid phase. A real project would take this outcome.'
        : grade === 'C'
          ? 'The phase finished, but it cost more than it needed to.'
          : 'Rough phase — read the log and note where cheap-now beat cheap-overall.';

  return {
    grade,
    score,
    finalDays: phase.plannedDays + s.slipDays,
    plannedDays: phase.plannedDays,
    slipAllowanceDays: slipAllowance,
    spentVariance: s.costVariance,
    contingencyAllowance: contingency,
    quality: s.quality,
    risk: s.risk,
    optimalCount,
    decisionCount,
    headline,
    notes,
  };
}

function money(x: number): string {
  const sign = x < 0 ? '-' : '';
  const ax = Math.abs(x);
  return ax >= 1_000_000 ? `${sign}$${(ax / 1_000_000).toFixed(2)}M` : `${sign}$${Math.round(ax).toLocaleString('en-US')}`;
}
