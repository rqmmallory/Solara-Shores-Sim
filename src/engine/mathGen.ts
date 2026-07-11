/**
 * Math/budget problem generator.
 *
 * Formulas live here; every NUMBER lives in module content JSON
 * (mathVariables + mathProblems). A template names a generator and binds
 * its params to variables, literals, or {min,max} ranges — so content
 * authors add problems without touching code.
 *
 * Every generated problem carries a full worked solution (`steps`) so the
 * app can teach the method after every attempt, right or wrong.
 */
import type { ContentModule, MathProblemTemplate, MathVariable } from '../content/schema';
import { fmtMoney, fmtNum, fmtWithUnit } from './format';
import { randBetween, Rng, roundNice } from './rng';

export interface GeneratedProblem {
  key: string; // unique per generation
  moduleId: string;
  templateId: string;
  difficulty: 1 | 2 | 3;
  title: string;
  context?: string;
  prompt: string;
  unit: string;
  answer: number;
  /** accept answers within ±tolerancePct of `answer` */
  tolerancePct: number;
  steps: string[];
}

type ParamSpec = string | number | { min: number; max: number };

interface ResolveCtx {
  module: ContentModule;
  rng: Rng;
  /** resolved values, so a prompt can reference what was sampled */
  samples: Record<string, { value: number; label: string; unit: string }>;
}

function resolve(ctx: ResolveCtx, spec: ParamSpec, fallbackLabel: string, fallbackUnit = ''): number {
  if (typeof spec === 'number') {
    ctx.samples[fallbackLabel] = { value: spec, label: fallbackLabel, unit: fallbackUnit };
    return spec;
  }
  if (typeof spec === 'string') {
    const v = ctx.module.mathVariables.find((mv) => mv.id === spec);
    if (!v) throw new Error(`unknown math variable "${spec}" in module ${ctx.module.id}`);
    const value = sample(ctx.rng, v);
    ctx.samples[spec] = { value, label: v.label, unit: v.unit };
    return value;
  }
  const value = roundNice(randBetween(ctx.rng, spec.min, spec.max));
  ctx.samples[fallbackLabel] = { value, label: fallbackLabel, unit: fallbackUnit };
  return value;
}

function sample(rng: Rng, v: MathVariable): number {
  if (v.min === v.max) return v.min;
  return roundNice(randBetween(rng, v.min, v.max));
}

// ------------------------------------------------------------ generators

type P = Record<string, unknown>;

function str(p: P, key: string, dflt: string): string {
  return typeof p[key] === 'string' ? (p[key] as string) : dflt;
}

function genUnitRate(t: MathProblemTemplate, ctx: ResolveCtx): Omit<GeneratedProblem, 'key' | 'moduleId' | 'templateId' | 'difficulty' | 'title' | 'context'> {
  const p = t.params as P;
  const qtyLabel = str(p, 'qtyLabel', 'quantity');
  const rateLabel = str(p, 'rateLabel', 'unit rate');
  const qtyUnit = str(p, 'qtyUnit', '');
  const rateUnit = str(p, 'rateUnit', '$');
  const answerUnit = str(p, 'answerUnit', '$');
  const answerLabel = str(p, 'answerLabel', 'total');
  const qty = resolve(ctx, p.qty as ParamSpec, qtyLabel, qtyUnit);
  const rate = resolve(ctx, p.rate as ParamSpec, rateLabel, rateUnit);
  const wastePct = p.wastePct !== undefined ? resolve(ctx, p.wastePct as ParamSpec, 'waste/shrinkage', '%') : 0;

  const base = qty * rate;
  const answer = base * (1 + wastePct / 100);
  const steps = [
    `${qtyLabel}: ${fmtWithUnit(qty, qtyUnit)} × ${rateLabel}: ${fmtWithUnit(rate, rateUnit)} = ${fmtMoney(base)}`,
  ];
  if (wastePct > 0) steps.push(`Add ${fmtNum(wastePct)}% waste/shrinkage: ${fmtMoney(base)} × ${fmtNum(1 + wastePct / 100)} = ${fmtMoney(answer)}`);
  steps.push(`${answerLabel}: ${fmtWithUnit(answer, answerUnit)}`);
  return {
    prompt:
      `${qtyLabel[0].toUpperCase()}${qtyLabel.slice(1)} is ${fmtWithUnit(qty, qtyUnit)} at a ${rateLabel} of ${fmtWithUnit(rate, rateUnit)}` +
      (wastePct > 0 ? `, plus a ${fmtNum(wastePct)}% waste/shrinkage allowance` : '') +
      `. What is the ${answerLabel}?`,
    unit: answerUnit,
    answer,
    tolerancePct: 1,
    steps,
  };
}

function genPercentOf(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const baseLabel = str(p, 'baseLabel', 'base amount');
  const baseUnit = str(p, 'baseUnit', '$');
  const answerLabel = str(p, 'answerLabel', 'amount');
  const answerUnit = str(p, 'answerUnit', baseUnit);
  const base = resolve(ctx, p.base as ParamSpec, baseLabel, baseUnit);
  const pct = resolve(ctx, p.pct as ParamSpec, 'percentage', '%');
  const answer = (base * pct) / 100;
  return {
    prompt: `The ${baseLabel} is ${fmtWithUnit(base, baseUnit)}. At ${fmtNum(pct)}%, what is the ${answerLabel}?`,
    unit: answerUnit,
    answer,
    tolerancePct: 1,
    steps: [
      `${fmtWithUnit(base, baseUnit)} × ${fmtNum(pct)}% = ${fmtWithUnit(base, baseUnit)} × ${fmtNum(pct / 100)}`,
      `${answerLabel}: ${fmtWithUnit(answer, answerUnit)}`,
    ],
  };
}

function genLandedCost(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const itemLabel = str(p, 'itemLabel', 'materials order');
  const fob = resolve(ctx, p.fob as ParamSpec, 'FOB value', '$');
  const freightPct = resolve(ctx, (p.freightPct ?? { min: 8, max: 15 }) as ParamSpec, 'freight', '%');
  const dutyPct = resolve(ctx, (p.dutyPct ?? { min: 0, max: 45 }) as ParamSpec, 'duty', '%');
  const cpfPct = resolve(ctx, (p.cpfPct ?? 1) as ParamSpec, 'customs processing fee', '%');
  const vatPct = resolve(ctx, (p.vatPct ?? 10) as ParamSpec, 'VAT', '%');

  const cif = fob * (1 + freightPct / 100);
  const duty = cif * (dutyPct / 100);
  const cpf = cif * (cpfPct / 100);
  const preVat = cif + duty + cpf;
  const vat = preVat * (vatPct / 100);
  const answer = preVat + vat;
  return {
    prompt:
      `A ${itemLabel} has an FOB value of ${fmtMoney(fob)}. Freight and insurance add ${fmtNum(freightPct)}%, duty is ${fmtNum(dutyPct)}% on the CIF value, ` +
      `the customs processing fee is ${fmtNum(cpfPct)}% of CIF, and VAT is ${fmtNum(vatPct)}% on the whole landed stack. What is the landed cost?`,
    unit: '$',
    answer,
    tolerancePct: 1,
    steps: [
      `CIF = FOB + freight = ${fmtMoney(fob)} × ${fmtNum(1 + freightPct / 100)} = ${fmtMoney(cif)}`,
      `Duty = ${fmtNum(dutyPct)}% × CIF = ${fmtMoney(duty)}`,
      `Processing fee = ${fmtNum(cpfPct)}% × CIF = ${fmtMoney(cpf)}`,
      `Subtotal before VAT = ${fmtMoney(preVat)}`,
      `VAT = ${fmtNum(vatPct)}% × subtotal = ${fmtMoney(vat)}`,
      `Landed cost = ${fmtMoney(answer)} — ${fmtNum(((answer - fob) / fob) * 100)}% above FOB. This is why island estimates run far above Florida.`,
    ],
  };
}

function genTakt(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const unitLabel = str(p, 'unitLabel', 'units');
  const crewLabel = str(p, 'crewLabel', 'crews');
  const qty = resolve(ctx, p.qty as ParamSpec, unitLabel, '');
  const daysPerUnit = resolve(ctx, p.daysPerUnit as ParamSpec, 'days per unit per crew', 'days');
  const crews = Math.max(1, Math.round(resolve(ctx, p.crews as ParamSpec, crewLabel, '')));
  const exact = (qty * daysPerUnit) / crews;
  const answer = Math.ceil(exact);
  return {
    prompt:
      `You must complete ${fmtNum(qty)} ${unitLabel}. Each takes one crew ${fmtNum(daysPerUnit)} working days, and you can run ${crews} ${crewLabel} in parallel. ` +
      `How many working days does the run take? (Round up.)`,
    unit: 'working days',
    answer,
    tolerancePct: 0.5,
    steps: [
      `Total crew-days = ${fmtNum(qty)} × ${fmtNum(daysPerUnit)} = ${fmtNum(qty * daysPerUnit)}`,
      `Split across ${crews} parallel crews: ${fmtNum(qty * daysPerUnit)} ÷ ${crews} = ${fmtNum(exact)}`,
      `Round up: ${answer} working days. This is takt math — release starts at the rate your slowest trade can absorb.`,
    ],
  };
}

function genMassBalance(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const cut = resolve(ctx, p.cutCy as ParamSpec, 'excavated volume', 'cy');
  const fill = resolve(ctx, p.fillCy as ParamSpec, 'fill demand', 'cy');
  const savedPerCy = resolve(ctx, p.savedPerCy as ParamSpec, 'avoided cost per cy reused', '$/cy');
  const reuse = Math.min(cut, fill);
  const answer = reuse * savedPerCy;
  return {
    prompt:
      `The canal and lake cuts produce ${fmtNum(cut)} cy of limestone; the roads and pads need ${fmtNum(fill)} cy of base/fill. ` +
      `Every cy of own spoil reused (crushed on site) avoids ${fmtWithUnit(savedPerCy, '$/cy')} versus hauling out and importing. ` +
      `What is the total avoided cost from reuse?`,
    unit: '$',
    answer,
    tolerancePct: 1,
    steps: [
      `Reusable volume = min(cut, fill) = min(${fmtNum(cut)}, ${fmtNum(fill)}) = ${fmtNum(reuse)} cy`,
      `Avoided cost = ${fmtNum(reuse)} cy × ${fmtWithUnit(savedPerCy, '$/cy')} = ${fmtMoney(answer)}`,
      `This is the cut-to-fill mass balance — one of the largest single cost levers on the project.`,
    ],
  };
}

function genRetainage(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const workLabel = str(p, 'workLabel', 'certified progress this month');
  const work = resolve(ctx, p.work as ParamSpec, workLabel, '$');
  const retPct = resolve(ctx, p.retainagePct as ParamSpec, 'retainage', '%');
  const held = work * (retPct / 100);
  const answer = work - held;
  return {
    prompt:
      `You certify ${fmtMoney(work)} of progress on a contract with ${fmtNum(retPct)}% retainage. ` +
      `How much is actually paid this draw?`,
    unit: '$',
    answer,
    tolerancePct: 1,
    steps: [
      `Retainage held = ${fmtMoney(work)} × ${fmtNum(retPct)}% = ${fmtMoney(held)}`,
      `Paid = ${fmtMoney(work)} − ${fmtMoney(held)} = ${fmtMoney(answer)}`,
      `Retainage (5–10% typical) is your performance security — released at substantial completion.`,
    ],
  };
}

function genCrewRatio(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const unitLabel = str(p, 'unitLabel', 'active units');
  const staffLabel = str(p, 'staffLabel', 'superintendents');
  const active = Math.round(resolve(ctx, p.active as ParamSpec, unitLabel, ''));
  const ratio = Math.round(resolve(ctx, p.ratio as ParamSpec, 'coverage ratio', ''));
  const answer = Math.ceil(active / ratio);
  return {
    prompt:
      `At peak you will have ${active} ${unitLabel}, and one of your ${staffLabel} can cover ${ratio} at a time. ` +
      `How many ${staffLabel} do you need? (Round up.)`,
    unit: staffLabel,
    answer,
    tolerancePct: 0,
    steps: [
      `${active} ÷ ${ratio} = ${fmtNum(active / ratio)}`,
      `You can't hire a fraction of a person: round up to ${answer}.`,
      `Understaffing supervision doesn't show up in the budget — it shows up in first-pass inspection rates.`,
    ],
  };
}

interface BuildupLine {
  label: string;
  qty: ParamSpec;
  rate: ParamSpec;
  qtyUnit?: string;
  rateUnit?: string;
}

function genEstimateBuildup(t: MathProblemTemplate, ctx: ResolveCtx) {
  const p = t.params as P;
  const scopeLabel = str(p, 'scopeLabel', 'this scope');
  const lines = (p.lines as BuildupLine[]) ?? [];
  const contingencyPct = resolve(ctx, (p.contingencyPct ?? { min: 5, max: 15 }) as ParamSpec, 'contingency', '%');

  let subtotal = 0;
  const promptLines: string[] = [];
  const steps: string[] = [];
  for (const line of lines) {
    const qty = resolve(ctx, line.qty, `${line.label} quantity`, line.qtyUnit ?? '');
    const rate = resolve(ctx, line.rate, `${line.label} rate`, line.rateUnit ?? '$');
    const amt = qty * rate;
    subtotal += amt;
    promptLines.push(`• ${line.label}: ${fmtNum(qty)} ${line.qtyUnit ?? ''} @ ${fmtWithUnit(rate, line.rateUnit ?? '$')}`);
    steps.push(`${line.label}: ${fmtNum(qty)} × ${fmtWithUnit(rate, line.rateUnit ?? '$')} = ${fmtMoney(amt)}`);
  }
  const answer = subtotal * (1 + contingencyPct / 100);
  steps.push(`Subtotal = ${fmtMoney(subtotal)}`);
  steps.push(`Add ${fmtNum(contingencyPct)}% contingency: ${fmtMoney(subtotal)} × ${fmtNum(1 + contingencyPct / 100)} = ${fmtMoney(answer)}`);
  return {
    prompt:
      `Build the estimate for ${scopeLabel}:\n${promptLines.join('\n')}\n` +
      `Then add ${fmtNum(contingencyPct)}% contingency. What is the total?`,
    unit: '$',
    answer,
    tolerancePct: 1,
    steps,
  };
}

// -------------------------------------------------------------- dispatch

const GENERATOR_FNS = {
  unitRate: genUnitRate,
  percentOf: genPercentOf,
  landedCost: genLandedCost,
  takt: genTakt,
  massBalance: genMassBalance,
  retainage: genRetainage,
  crewRatio: genCrewRatio,
  estimateBuildup: genEstimateBuildup,
} as const;

let counter = 0;

export function generateProblem(
  module: ContentModule,
  template: MathProblemTemplate,
  rng: Rng
): GeneratedProblem {
  const ctx: ResolveCtx = { module, rng, samples: {} };
  const fn = GENERATOR_FNS[template.generator];
  if (!fn) throw new Error(`no generator "${template.generator}"`);
  const core = fn(template, ctx);
  counter += 1;
  return {
    key: `${template.id}-${counter}-${Date.now()}`,
    moduleId: module.id,
    templateId: template.id,
    difficulty: template.difficulty,
    title: template.title,
    context: template.context,
    ...core,
  };
}

/** true if the user's answer is close enough */
export function checkAnswer(problem: GeneratedProblem, input: number): boolean {
  if (!isFinite(input)) return false;
  if (problem.tolerancePct === 0) return input === problem.answer;
  const tol = Math.abs(problem.answer) * (problem.tolerancePct / 100);
  return Math.abs(input - problem.answer) <= Math.max(tol, 0.005);
}

/** signed % error for the estimating-accuracy stat */
export function pctError(problem: GeneratedProblem, input: number): number {
  if (problem.answer === 0) return input === 0 ? 0 : 100;
  return ((input - problem.answer) / Math.abs(problem.answer)) * 100;
}
