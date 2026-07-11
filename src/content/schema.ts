/**
 * Content schema for the Solara Shores CM training app.
 *
 * DESIGN CONTRACT: everything the app teaches lives in JSON files under
 * src/content/modules and src/content/sim — app code never hardcodes
 * project facts. New research drops in as data, validated by
 * src/content/__tests__/contentValidation.test.ts.
 *
 * Teaching-first rules encoded in the schema:
 *  - every quiz question carries a `teach` blurb (shown BEFORE answering)
 *    and an `explanation` (shown AFTER, right or wrong)
 *  - every choice may carry its own `why` so wrong answers teach too
 *  - modules may ship as `placeholder` so the app runs end-to-end
 *    before all research is in.
 */

export type ModuleStatus = 'ready' | 'partial' | 'placeholder';

export interface ContentModule {
  id: string;
  /** display + unlock order, mirrors the research doc module numbering */
  order: number;
  title: string;
  /** short label for cards / tabs */
  short: string;
  status: ModuleStatus;
  /** one-paragraph orientation shown at the top of the module */
  summary: string;
  /** explainer content, read before quizzing */
  sections: ContentSection[];
  quiz: QuizQuestion[];
  /** numeric planning variables — the math engine's raw material */
  mathVariables: MathVariable[];
  /** problem templates that bind generators to this module's variables */
  mathProblems: MathProblemTemplate[];
  /** narrative decision scenarios (also reused by the sim) */
  decisionPoints: DecisionPoint[];
}

export interface ContentSection {
  heading: string;
  body: string;
}

// ---------------------------------------------------------------- quiz

interface QuestionBase {
  id: string;
  /** short teaching setup shown before the user answers */
  teach?: string;
  prompt: string;
  /** the "why" — always shown after answering, never just right/wrong */
  explanation: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multipleChoice';
  choices: {
    text: string;
    correct?: boolean;
    /** per-choice feedback so a wrong pick still teaches */
    why?: string;
  }[];
}

/** items are authored in CORRECT order; the app shuffles at runtime */
export interface SequencingQuestion extends QuestionBase {
  type: 'sequencing';
  items: string[];
}

/** classify each scope: subcontract it, or direct-manage it yourself */
export interface SubOrManageQuestion extends QuestionBase {
  type: 'subOrManage';
  items: {
    scope: string;
    answer: 'subcontract' | 'direct';
    why: string;
  }[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | SequencingQuestion
  | SubOrManageQuestion;

// ---------------------------------------------------------------- math

export interface MathVariable {
  id: string;
  label: string;
  /** e.g. "$/cy", "$/sf", "%", "weeks" */
  unit: string;
  min: number;
  max: number;
  /** optional context line surfaced in problems and the reference sheet */
  note?: string;
}

/**
 * Generator ids implemented in src/engine/mathGen.ts.
 * Formulas live in code; the numbers live here in content.
 */
export type MathGeneratorId =
  | 'unitRate' // qty × rate (± waste/shrinkage)
  | 'percentOf' // base × pct (contingency, fees, reserves)
  | 'landedCost' // FOB + freight + duty + CPF + VAT stack
  | 'takt' // production throughput / duration
  | 'massBalance' // cut vs fill, avoided-cost math
  | 'retainage' // progress draw minus retainage
  | 'crewRatio' // ceil(active units / coverage ratio)
  | 'estimateBuildup'; // multi-line estimate + tiered contingency

export interface MathProblemTemplate {
  id: string;
  generator: MathGeneratorId;
  /** 1 = plug-in-the-formula, 2 = two-step, 3 = multi-step build-up */
  difficulty: 1 | 2 | 3;
  title: string;
  /** teaching preamble shown with the problem */
  context?: string;
  /**
   * generator parameters. String values name a MathVariable id (in this
   * module) to sample from; numbers are literals. Arrays configure
   * multi-line generators (see mathGen.ts per-generator docs).
   */
  params: Record<string, unknown>;
}

// ------------------------------------------------------------ decisions

export interface DecisionPoint {
  id: string;
  title: string;
  /** the situation, written as a scenario brief */
  scenario: string;
  options: DecisionOption[];
  /** debrief shown after choosing — the lesson, not just the verdict */
  debrief: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  /** what actually happens if you pick this */
  outcome: string;
  /** best available call given the scenario */
  optimal?: boolean;
  /** defensible but costs something; shown as "workable" */
  acceptable?: boolean;
}

// ------------------------------------------------------------------ sim

export interface SimPhase {
  id: string;
  order: number;
  title: string;
  status: ModuleStatus;
  intro: string;
  /** budget for the phase in USD */
  startBudget: number;
  /** planned duration in working days */
  plannedDays: number;
  steps: SimStep[];
  curveballs: Curveball[];
}

export interface SimStep {
  id: string;
  title: string;
  /** teaching brief for the decision gate */
  brief: string;
  options: SimOption[];
}

export interface SimEffects {
  /** working days added (+) or saved (−) */
  days?: number;
  /** dollars added to spend (+) or saved (−) */
  cost?: number;
  /** quality score delta, on a 0–100 scale */
  quality?: number;
  /** compliance/risk exposure delta; higher = more exposed */
  risk?: number;
}

export interface SimOption {
  id: string;
  label: string;
  effects: SimEffects;
  /** narrated consequence shown after choosing */
  outcome: string;
  optimal?: boolean;
  acceptable?: boolean;
  /**
   * ids of curveballs this choice arms (e.g. skipping geotech arms the
   * karst-void event) or defuses. Armed events get a probability boost.
   */
  arms?: string[];
  defuses?: string[];
}

export interface Curveball {
  id: string;
  title: string;
  description: string;
  /** base probability 0–1 of firing after any step (before tuning) */
  chance: number;
  /** applied if the event has no choices, or as the base hit */
  effects: SimEffects;
  /** optional response decision — curveballs teach too */
  choices?: SimOption[];
  /** the lesson attached to the event */
  lesson: string;
}
