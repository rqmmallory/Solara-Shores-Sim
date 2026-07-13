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
  /** 0..100, starts at 90 — site safety. The non-negotiable meter: a low
   * final safety score caps the phase grade (you can't buy back an unsafe
   * job). Adding risk erodes it automatically. */
  safety: number;
  /** 0..100, starts at 75 — crew/subcontractor morale. Colours the debrief
   * and rewards managing the workforce as a system. */
  morale: number;
  /** open risk exposure — unresolved liabilities you carry (seeds from
   * the previous phase's final risk: shortcuts ride forward) */
  risk: number;
  /** risk inherited from earlier phases, for the debrief narrative */
  carriedRisk: number;
  /** persistent decision flags — inherited from earlier phases' runs,
   * extended by choices made in this one */
  flags: string[];
  /** flags inherited (subset of flags), for narrative */
  inheritedFlags: string[];
  /** curveballs armed (probability boosted) by choices */
  armed: string[];
  /** curveballs defused (removed from pool) by choices */
  defused: string[];
  /** curveballs already fired (never repeat) */
  fired: string[];
  /** curveball currently awaiting the player's response, if any */
  pendingCurveball: string | null;
  /** advisor actions already purchased this run (each once per phase) */
  advisorsUsed: string[];
  /** QS engaged: option cost/schedule impacts shown before choosing */
  revealEffects: boolean;
  log: SimLogEntry[];
  finished: boolean;
  decisions: { stepId: string; optionId: string }[];
}

export interface SimCarry {
  /** flags earned across earlier phases' most recent completed runs */
  flags?: string[];
  /** open risk left over from the previous phase's run */
  risk?: number;
}

export function initialSimState(phase: SimPhase, carry?: SimCarry): SimState {
  const flags = [...new Set(carry?.flags ?? [])];
  const risk = Math.max(0, carry?.risk ?? 0);
  return {
    phaseId: phase.id,
    stepIndex: 0,
    slipDays: 0,
    costVariance: 0,
    quality: 70,
    safety: 90,
    morale: 75,
    risk,
    carriedRisk: risk,
    flags,
    inheritedFlags: flags,
    armed: [],
    defused: [],
    fired: [],
    pendingCurveball: null,
    advisorsUsed: [],
    revealEffects: false,
    log: [],
    finished: false,
    decisions: [],
  };
}

// ---------------------------------------------------------------- advisors

/**
 * Advisor actions — spend CM Capital (B$, earned by learning) on the
 * kind of help a real developer buys. Each usable once per phase run.
 * The teaching point IS the mechanic: money spent on certainty and
 * de-risking early is the cheapest money on a project.
 */
export interface Advisor {
  id: string;
  label: string;
  cost: number; // B$
  blurb: string;
  /** which mentor NPC delivers this advisor's help (see content/mentors) */
  mentorId: string;
}

export const ADVISORS: Advisor[] = [
  {
    id: 'qs-review',
    label: 'Bring in the QS',
    cost: 150,
    mentorId: 'qs',
    blurb:
      'Your quantity surveyor prices every option before you choose — cost and schedule impacts shown for the rest of this phase. Consultants cost money; flying blind costs more.',
  },
  {
    id: 'reserve-release',
    label: 'Release management reserve',
    cost: 250,
    mentorId: 'owner',
    blurb:
      'Board-approved reserve drawdown: −$300K of cost variance. Real projects hold reserves above the contingency for exactly this.',
  },
  {
    id: 'acceleration',
    label: 'Acceleration workshop',
    cost: 200,
    mentorId: 'foreman',
    blurb:
      'A resequencing workshop with your supers and key subs recovers 5 days of slip. Schedule is bought back with planning, not shouting.',
  },
];

export function advisorById(id: string): Advisor | undefined {
  return ADVISORS.find((a) => a.id === id);
}

/** Apply a purchased advisor. Assumes capital was already deducted. */
export function applyAdvisor(s: SimState, advisorId: string): SimState {
  if (s.advisorsUsed.includes(advisorId) || s.finished) return s;
  const base: SimState = { ...s, advisorsUsed: [...s.advisorsUsed, advisorId] };
  switch (advisorId) {
    case 'qs-review':
      return {
        ...base,
        revealEffects: true,
        log: [
          ...base.log,
          {
            kind: 'info',
            title: 'QS engaged',
            detail:
              'Option impacts are now priced before you choose, for the rest of this phase — the leveling-sheet view of every decision.',
          },
        ],
      };
    case 'reserve-release':
      return {
        ...base,
        costVariance: base.costVariance - 300000,
        log: [
          ...base.log,
          {
            kind: 'info',
            title: 'Management reserve released',
            detail: 'The board approves a $300K reserve drawdown against documented variances.',
          },
        ],
      };
    case 'acceleration':
      return {
        ...base,
        slipDays: base.slipDays - 5,
        log: [
          ...base.log,
          {
            kind: 'info',
            title: 'Acceleration workshop',
            detail: 'Resequencing with the trades recovers 5 working days of slip.',
          },
        ],
      };
    default:
      return s;
  }
}

/** options visible given the flags accumulated across phases */
export function availableOptions(options: SimOption[], s: SimState): SimOption[] {
  return options.filter((o) => {
    if (o.requiresFlag && !s.flags.includes(o.requiresFlag)) return false;
    if (o.hiddenIfFlag && s.flags.includes(o.hiddenIfFlag)) return false;
    return true;
  });
}

function applyEffects(s: SimState, e: SimEffects): SimState {
  // safety erodes with explicit cuts AND with any risk you take on — an
  // exposed job is an unsafe job. Defusing risk (negative e.risk) does not
  // auto-restore safety; you have to actively invest in it.
  const safetyFromRisk = Math.max(0, e.risk ?? 0);
  return {
    ...s,
    slipDays: s.slipDays + (e.days ?? 0),
    costVariance: s.costVariance + (e.cost ?? 0),
    quality: clamp(s.quality + (e.quality ?? 0), 0, 100),
    safety: clamp(s.safety + (e.safety ?? 0) - safetyFromRisk, 0, 100),
    morale: clamp(s.morale + (e.morale ?? 0), 0, 100),
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
    flags: [...new Set([...next.flags, ...(option.flags ?? [])])],
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

function isArmed(c: Curveball, s: SimState): boolean {
  if (s.armed.includes(c.id)) return true;
  return (c.armedByFlags ?? []).some((f) => s.flags.includes(f));
}

function isDefused(c: Curveball, s: SimState): boolean {
  if (s.defused.includes(c.id)) return true;
  return (c.defusedByFlags ?? []).some((f) => s.flags.includes(f));
}

/** flag-conditional consequences: how an old decision changes this event */
function applyFlagModifiers(s: SimState, c: Curveball): { state: SimState; notes: string[] } {
  let state = s;
  const notes: string[] = [];
  for (const m of c.flagModifiers ?? []) {
    if (state.flags.includes(m.flag)) {
      state = applyEffects(state, m.extraEffects);
      notes.push(m.note);
    }
  }
  return { state, notes };
}

function rollCurveball(
  phase: SimPhase,
  s: SimState,
  rng: Rng,
  frequency: CurveballFrequency
): SimState {
  const mult = FREQUENCY_MULTIPLIER[frequency];
  const pool = phase.curveballs.filter((c) => !s.fired.includes(c.id) && !isDefused(c, s));
  // spread event pressure across steps: roll each candidate independently,
  // fire at most one per step (the highest roller)
  let firing: Curveball | null = null;
  let bestMargin = -Infinity;
  for (const c of pool) {
    const armedBoost = isArmed(c, s) ? Math.max(c.chance, 0.85) : c.chance;
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
  // old decisions change what this event costs — apply before any choice
  const { state: modified, notes } = applyFlagModifiers({ ...s, fired }, firing);
  const callbackNote = notes.length ? ` ${notes.join(' ')}` : '';

  if (firing.choices?.length) {
    const withNote = notes.length
      ? {
          ...modified,
          log: [
            ...modified.log,
            {
              kind: 'curveball' as const,
              title: `${firing.title} — an old decision surfaces`,
              detail: notes.join(' '),
            },
          ],
        }
      : modified;
    return { ...withNote, pendingCurveball: firing.id };
  }
  const hit = applyEffects(modified, firing.effects);
  return {
    ...hit,
    log: [
      ...hit.log,
      {
        kind: 'curveball',
        title: firing.title,
        detail: `${firing.description}${callbackNote} ${firing.lesson}`,
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
    flags: [...new Set([...next.flags, ...(option.flags ?? [])])],
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
  safety: number;
  morale: number;
  risk: number;
  /** points the low-safety guard subtracted from the weighted score */
  safetyPenalty: number;
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
  const weighted = schedScore * 0.3 + costScore * 0.3 + qualScore * 0.25 + riskScore * 0.15;
  // safety guard: below 60 it bites hard — you cannot buy back an unsafe job.
  // A well-run phase never reaches the threshold, so good play is unaffected.
  const safetyPenalty = s.safety >= 60 ? 0 : Math.round((60 - s.safety) * 0.6);
  const score = clamp(Math.round(weighted) - safetyPenalty, 0, 100);

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
  if (s.safety < 60)
    notes.push(`Safety ended at ${s.safety}/100 and cost you ${safetyPenalty} points off the grade. On a real site this is where people get hurt and the job gets shut down — safety is never the line item you trim.`);
  else if (s.safety < 80)
    notes.push(`Safety held at ${s.safety}/100 — acceptable, but every risk you took nibbled at it. The best CMs treat safety as the constraint, not the trade-off.`);
  else
    notes.push(`Safety stayed strong at ${s.safety}/100 — you didn't buy schedule or cost with exposure. That's how the job runs incident-free.`);
  if (s.morale < 55)
    notes.push(`Crew morale sank to ${s.morale}/100 — expect turnover, slower production and rework a real site would now be paying for. The workforce is a system you manage, not a cost you squeeze.`);
  else if (s.morale >= 85)
    notes.push(`Crew morale is high at ${s.morale}/100 — well-sequenced work and fair calls keep good subs coming back at good numbers.`);
  if (s.carriedRisk > 0)
    notes.push(`You entered this phase carrying ${s.carriedRisk} points of risk from earlier phases — the sim remembers, and so does a real project.`);
  if (s.risk > 0)
    notes.push(`You finished carrying ${s.risk} points of open risk exposure — liabilities that didn't bite THIS phase but ride into the next one.`);
  else notes.push('You finished with no open risk exposure — nothing armed and left hanging.');
  const newFlags = s.flags.filter((f) => !s.inheritedFlags.includes(f));
  if (newFlags.length > 0)
    notes.push(`${newFlags.length} decision${newFlags.length === 1 ? '' : 's'} from this phase will follow you into later phases — contract clauses, spec choices, and shortcuts all have long fuses here.`);

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
    safety: s.safety,
    morale: s.morale,
    risk: s.risk,
    safetyPenalty,
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
