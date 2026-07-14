/**
 * Runtime shape validation for content JSON. Run in unit tests so a bad
 * content drop fails CI instead of crashing the app on a phone.
 */
import type { ConceptBlock, ContentModule, QuizQuestion, SimPhase } from './schema';
import { isPrinciple } from './principles';

const GENERATORS = new Set([
  'unitRate',
  'percentOf',
  'landedCost',
  'takt',
  'massBalance',
  'retainage',
  'crewRatio',
  'estimateBuildup',
]);

export function validateModule(m: ContentModule): string[] {
  const errs: string[] = [];
  const where = m.id ?? '<missing id>';
  if (!m.id) errs.push('module missing id');
  if (typeof m.order !== 'number') errs.push(`${where}: order must be a number`);
  if (!m.title) errs.push(`${where}: missing title`);
  if (!['ready', 'partial', 'placeholder'].includes(m.status))
    errs.push(`${where}: bad status "${m.status}"`);

  if (m.status !== 'placeholder') {
    if (m.sections.length === 0) errs.push(`${where}: non-placeholder module has no sections`);
    if (m.quiz.length === 0) errs.push(`${where}: non-placeholder module has no quiz`);
  }

  const qIds = new Set<string>();
  for (const q of m.quiz) {
    if (!q.id) errs.push(`${where}: quiz question missing id`);
    if (qIds.has(q.id)) errs.push(`${where}: duplicate question id ${q.id}`);
    qIds.add(q.id);
    if (!q.explanation) errs.push(`${where}/${q.id}: missing explanation — every question must teach`);
    errs.push(...validateQuestion(q, `${where}/${q.id}`));
  }

  const varIds = new Set(m.mathVariables.map((v) => v.id));
  for (const v of m.mathVariables) {
    if (v.min > v.max) errs.push(`${where}/${v.id}: min > max`);
  }
  for (const p of m.mathProblems) {
    if (!GENERATORS.has(p.generator))
      errs.push(`${where}/${p.id}: unknown generator "${p.generator}"`);
    if (![1, 2, 3].includes(p.difficulty))
      errs.push(`${where}/${p.id}: difficulty must be 1|2|3`);
    // every string param that names a variable must resolve in this module
    for (const [key, val] of Object.entries(p.params)) {
      if (typeof val === 'string' && /^m\d\d_/.test(val) && !varIds.has(val))
        errs.push(`${where}/${p.id}: param ${key} references unknown variable "${val}"`);
    }
  }

  for (const d of m.decisionPoints) {
    if (!d.options?.length) errs.push(`${where}/${d.id}: decision has no options`);
    else if (!d.options.some((o) => o.optimal))
      errs.push(`${where}/${d.id}: no option marked optimal`);
    if (!d.debrief) errs.push(`${where}/${d.id}: missing debrief`);
  }

  for (const c of m.concepts ?? []) errs.push(...validateConcept(c, `${where}/${c.id}`));

  // every question that tags a principle must name a real one
  for (const q of m.quiz) {
    for (const pid of q.principleIds ?? [])
      if (!isPrinciple(pid)) errs.push(`${where}/${q.id}: unknown principleId "${pid}"`);
  }

  return errs;
}

/**
 * A concept block is the four-beat teaching unit. The learner model's hard
 * rules become validation: a mechanism with no visual, or no applied decision,
 * is an incomplete concept and fails CI.
 */
function validateConcept(c: ConceptBlock, where: string): string[] {
  const errs: string[] = [];
  if (!c.id) errs.push(`${where}: concept missing id`);
  if (!isPrinciple(c.principleId)) errs.push(`${where}: unknown principleId "${c.principleId}"`);
  if (!c.mechanism) errs.push(`${where}: BEAT 1 missing mechanism text`);
  if (!c.diagramId) errs.push(`${where}: BEAT 1 missing diagramId — every mechanism needs a visual`);
  if (!c.hook) errs.push(`${where}: BEAT 2 missing hook`);
  if (!c.applied) errs.push(`${where}: BEAT 3 missing applied decision`);
  else {
    if (!c.applied.prompt) errs.push(`${where}: applied decision missing prompt`);
    if (!c.applied.options?.length) errs.push(`${where}: applied decision has no options`);
    else if (!c.applied.options.some((o) => o.optimal))
      errs.push(`${where}: applied decision has no optimal option`);
    if (!c.applied.debrief) errs.push(`${where}: applied decision missing debrief`);
  }
  return errs;
}

function validateQuestion(q: QuizQuestion, where: string): string[] {
  const errs: string[] = [];
  switch (q.type) {
    case 'multipleChoice': {
      if (q.choices.length < 2) errs.push(`${where}: needs >= 2 choices`);
      const correct = q.choices.filter((c) => c.correct).length;
      if (correct !== 1) errs.push(`${where}: needs exactly 1 correct choice, has ${correct}`);
      break;
    }
    case 'sequencing':
      if (q.items.length < 3) errs.push(`${where}: sequencing needs >= 3 items`);
      break;
    case 'subOrManage':
      if (q.items.length < 2) errs.push(`${where}: subOrManage needs >= 2 items`);
      for (const it of q.items) {
        if (!['subcontract', 'direct'].includes(it.answer))
          errs.push(`${where}: bad answer "${it.answer}" for scope "${it.scope}"`);
        if (!it.why) errs.push(`${where}: scope "${it.scope}" missing why`);
      }
      break;
    default:
      errs.push(`${where}: unknown question type "${(q as { type: string }).type}"`);
  }
  return errs;
}

/**
 * Cross-phase flag graph: every flag a phase REFERENCES (armedByFlags,
 * defusedByFlags, flagModifiers, requiresFlag, hiddenIfFlag) must be
 * SETTABLE by some option in a phase with order <= the referencing
 * phase's order — otherwise the callback can never fire.
 */
export function validateFlagGraph(phases: SimPhase[]): string[] {
  const errs: string[] = [];
  const setByOrder: { flag: string; order: number }[] = [];
  for (const p of phases) {
    const collect = (opts: { flags?: string[] }[] | undefined) => {
      for (const o of opts ?? []) for (const f of o.flags ?? []) setByOrder.push({ flag: f, order: p.order });
    };
    for (const s of p.steps) collect(s.options);
    for (const c of p.curveballs) collect(c.choices);
  }
  const settableBy = (flag: string, order: number) =>
    setByOrder.some((s) => s.flag === flag && s.order <= order);

  for (const p of phases) {
    const check = (flag: string, where: string) => {
      if (!settableBy(flag, p.order))
        errs.push(`${p.id}/${where}: flag "${flag}" is never set by any phase at order <= ${p.order}`);
    };
    for (const c of p.curveballs) {
      for (const f of c.armedByFlags ?? []) check(f, c.id);
      for (const f of c.defusedByFlags ?? []) check(f, c.id);
      for (const m of c.flagModifiers ?? []) check(m.flag, c.id);
      for (const o of c.choices ?? []) {
        if (o.requiresFlag) check(o.requiresFlag, `${c.id}/${o.id}`);
        if (o.hiddenIfFlag) check(o.hiddenIfFlag, `${c.id}/${o.id}`);
      }
    }
    for (const s of p.steps) {
      for (const o of s.options) {
        if (o.requiresFlag) check(o.requiresFlag, `${s.id}/${o.id}`);
        if (o.hiddenIfFlag) check(o.hiddenIfFlag, `${s.id}/${o.id}`);
      }
    }
  }
  return errs;
}

export function validateSimPhase(p: SimPhase): string[] {
  const errs: string[] = [];
  const where = p.id ?? '<missing sim phase id>';
  if (!p.id) errs.push('sim phase missing id');
  if (p.status === 'placeholder') return errs;
  if (p.startBudget <= 0) errs.push(`${where}: startBudget must be > 0`);
  if (p.plannedDays <= 0) errs.push(`${where}: plannedDays must be > 0`);
  if (p.steps.length === 0) errs.push(`${where}: no steps`);
  const cbIds = new Set(p.curveballs.map((c) => c.id));
  for (const s of p.steps) {
    if (!s.options?.length) errs.push(`${where}/${s.id}: step has no options`);
    else if (!s.options.some((o) => o.optimal))
      errs.push(`${where}/${s.id}: no option marked optimal`);
    for (const o of s.options ?? []) {
      for (const ref of [...(o.arms ?? []), ...(o.defuses ?? [])]) {
        if (!cbIds.has(ref)) errs.push(`${where}/${s.id}/${o.id}: references unknown curveball "${ref}"`);
      }
    }
  }
  for (const c of p.curveballs) {
    if (c.chance < 0 || c.chance > 1) errs.push(`${where}/${c.id}: chance must be 0..1`);
    if (!c.lesson) errs.push(`${where}/${c.id}: missing lesson`);
  }
  return errs;
}
