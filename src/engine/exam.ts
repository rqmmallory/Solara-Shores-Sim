/**
 * Mixed readiness exam: a cross-module question sample, weighted toward
 * the modules where the learner is weakest — because the September test
 * is on the whole project, not one chapter at a time.
 */
import type { ContentModule, QuizQuestion } from '../content/schema';
import type { ModuleStats } from './progress';
import { moduleProficiency } from './progress';
import { Rng, shuffle } from './rng';

export interface ExamItem {
  moduleId: string;
  question: QuizQuestion;
}

export const EXAM_SIZE = 12;

/**
 * Sample up to `size` questions across ready modules without repeats.
 * Each module contributes at least one question where possible; the
 * remaining slots go to the weakest modules first.
 */
export function buildMixedExam(
  modules: ContentModule[],
  moduleStats: Record<string, ModuleStats>,
  rng: Rng,
  size: number = EXAM_SIZE
): ExamItem[] {
  const pool = modules.filter((m) => m.status !== 'placeholder' && m.quiz.length > 0);
  if (pool.length === 0) return [];

  // weakest first — lowest proficiency gets extra slots
  const ranked = pool
    .map((m) => ({ m, prof: moduleProficiency(m, moduleStats[m.id]) }))
    .sort((a, b) => a.prof - b.prof);

  const perModule = new Map<string, QuizQuestion[]>(
    ranked.map(({ m }) => [m.id, shuffle(rng, m.quiz)])
  );

  // slot quotas: the weakest quarter gets 2 slots each, then 1 slot each
  // down the ranked list, then round-robin whatever remains
  const quota = new Map<string, number>();
  let remaining = size;
  for (const { m } of ranked.slice(0, Math.max(1, Math.floor(size / 4)))) {
    if (remaining < 2) break;
    quota.set(m.id, 2);
    remaining -= 2;
  }
  for (const { m } of ranked) {
    if (remaining <= 0) break;
    if (!quota.has(m.id)) {
      quota.set(m.id, 1);
      remaining -= 1;
    }
  }
  while (remaining > 0) {
    let progressed = false;
    for (const { m } of ranked) {
      if (remaining <= 0) break;
      const q = quota.get(m.id) ?? 0;
      if (q < perModule.get(m.id)!.length) {
        quota.set(m.id, q + 1);
        remaining -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const items: ExamItem[] = [];
  for (const { m } of ranked) {
    const n = Math.min(quota.get(m.id) ?? 0, perModule.get(m.id)!.length);
    for (let i = 0; i < n; i++) {
      items.push({ moduleId: m.id, question: perModule.get(m.id)!.pop()! });
    }
  }

  return shuffle(rng, items);
}
