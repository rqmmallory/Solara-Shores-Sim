import { mathModules } from '../../content';
import type { ContentModule } from '../../content/schema';
import { checkAnswer, generateProblem, pctError } from '../mathGen';
import { seededRng } from '../rng';

const stubModule: ContentModule = {
  id: 'm99-test',
  order: 99,
  title: 'Test',
  short: 'Test',
  status: 'ready',
  summary: 's',
  sections: [],
  quiz: [],
  mathVariables: [
    { id: 'm99_rate', label: 'rock excavation rate', unit: '$/cy', min: 15, max: 40 },
    { id: 'm99_pct', label: 'contingency', unit: '%', min: 10, max: 15 },
  ],
  mathProblems: [],
  decisionPoints: [],
};

describe('mathGen', () => {
  it('unitRate: qty × rate', () => {
    const p = generateProblem(
      stubModule,
      {
        id: 't1',
        generator: 'unitRate',
        difficulty: 1,
        title: 'Rock cut',
        params: { qty: 1000, rate: 'm99_rate', qtyUnit: 'cy', rateUnit: '$/cy' },
      },
      seededRng(1)
    );
    expect(p.answer).toBeGreaterThanOrEqual(15_000);
    expect(p.answer).toBeLessThanOrEqual(40_000);
    expect(p.steps.length).toBeGreaterThan(0);
    expect(checkAnswer(p, p.answer)).toBe(true);
    expect(checkAnswer(p, p.answer * 1.005)).toBe(true); // inside 1%
    expect(checkAnswer(p, p.answer * 1.05)).toBe(false);
  });

  it('percentOf: base × pct', () => {
    const p = generateProblem(
      stubModule,
      {
        id: 't2',
        generator: 'percentOf',
        difficulty: 1,
        title: 'Contingency',
        params: { base: 2_000_000, pct: 'm99_pct', baseLabel: 'hard cost' },
      },
      seededRng(2)
    );
    expect(p.answer).toBeGreaterThanOrEqual(200_000);
    expect(p.answer).toBeLessThanOrEqual(300_000);
  });

  it('landedCost stacks freight, duty, CPF, then VAT on the whole stack', () => {
    const p = generateProblem(
      stubModule,
      {
        id: 't3',
        generator: 'landedCost',
        difficulty: 2,
        title: 'Landed cost',
        params: { fob: 100_000, freightPct: 10, dutyPct: 20, cpfPct: 1, vatPct: 10 },
      },
      seededRng(3)
    );
    // CIF 110k; duty 22k; cpf 1.1k; preVAT 133.1k; VAT 13.31k; total 146.41k
    expect(p.answer).toBeCloseTo(146_410, 0);
  });

  it('takt rounds up crew-days', () => {
    const p = generateProblem(
      stubModule,
      {
        id: 't4',
        generator: 'takt',
        difficulty: 2,
        title: 'Block crews',
        params: { qty: 10, daysPerUnit: 12, crews: 4 },
      },
      seededRng(4)
    );
    expect(p.answer).toBe(30);
  });

  it('crewRatio uses exact match (tolerance 0)', () => {
    const p = generateProblem(
      stubModule,
      {
        id: 't5',
        generator: 'crewRatio',
        difficulty: 1,
        title: 'Supers',
        params: { active: 65, ratio: 20 },
      },
      seededRng(5)
    );
    expect(p.answer).toBe(4);
    expect(checkAnswer(p, 4)).toBe(true);
    expect(checkAnswer(p, 3)).toBe(false);
  });

  it('estimateBuildup sums lines then applies contingency', () => {
    const p = generateProblem(
      stubModule,
      {
        id: 't6',
        generator: 'estimateBuildup',
        difficulty: 3,
        title: 'Phase estimate',
        params: {
          scopeLabel: 'phase 2 vertical',
          contingencyPct: 12,
          lines: [
            { label: 'houses', qty: 40, rate: 250_000, rateUnit: '$' },
            { label: 'roads', qty: 2000, rate: 600, qtyUnit: 'lf', rateUnit: '$/lf' },
          ],
        },
      },
      seededRng(6)
    );
    expect(p.answer).toBeCloseTo((40 * 250_000 + 2000 * 600) * 1.12, 0);
  });

  it('pctError is signed', () => {
    const p = generateProblem(
      stubModule,
      { id: 't7', generator: 'percentOf', difficulty: 1, title: 'x', params: { base: 1000, pct: 10 } },
      seededRng(7)
    );
    expect(pctError(p, 110)).toBeCloseTo(10);
    expect(pctError(p, 90)).toBeCloseTo(-10);
  });

  it('every authored template in every module generates without throwing', () => {
    const rng = seededRng(42);
    for (const m of mathModules) {
      for (const t of m.mathProblems) {
        const p = generateProblem(m, t, rng);
        expect(isFinite(p.answer)).toBe(true);
        expect(p.prompt.length).toBeGreaterThan(10);
        expect(p.steps.length).toBeGreaterThan(0);
      }
    }
  });
});
