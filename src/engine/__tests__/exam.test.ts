import { modules } from '../../content';
import { buildMixedExam, EXAM_SIZE } from '../exam';
import { emptyModuleStats } from '../progress';
import { seededRng } from '../rng';

describe('mixed readiness exam', () => {
  it('samples EXAM_SIZE questions across modules with no duplicates', () => {
    const exam = buildMixedExam(modules, {}, seededRng(1));
    expect(exam).toHaveLength(EXAM_SIZE);
    const ids = exam.map((e) => `${e.moduleId}/${e.question.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('spreads coverage: at least 8 distinct modules represented', () => {
    const exam = buildMixedExam(modules, {}, seededRng(2));
    const distinct = new Set(exam.map((e) => e.moduleId));
    expect(distinct.size).toBeGreaterThanOrEqual(8);
  });

  it('weights extra slots toward weaker modules', () => {
    // make every module "strong" except m04-marina
    const stats: Record<string, ReturnType<typeof emptyModuleStats>> = {};
    for (const m of modules) {
      if (m.id === 'm04-marina') continue;
      const s = emptyModuleStats();
      for (const q of m.quiz) s.questions[q.id] = { attempts: 1, correct: 1, everCorrect: true };
      for (const d of m.decisionPoints) s.decisionsSeen.push(d.id);
      stats[m.id] = s;
    }
    // run several seeds; the weak module should on average get > 1 slot
    let weakSlots = 0;
    const runs = 10;
    for (let seed = 0; seed < runs; seed++) {
      const exam = buildMixedExam(modules, stats, seededRng(seed));
      weakSlots += exam.filter((e) => e.moduleId === 'm04-marina').length;
    }
    expect(weakSlots / runs).toBeGreaterThan(1);
  });

  it('handles a single ready module gracefully', () => {
    const one = modules.filter((m) => m.id === 'm01-site-conditions');
    const exam = buildMixedExam(one, {}, seededRng(3));
    expect(exam.length).toBeGreaterThan(0);
    expect(exam.length).toBeLessThanOrEqual(one[0].quiz.length);
  });
});
