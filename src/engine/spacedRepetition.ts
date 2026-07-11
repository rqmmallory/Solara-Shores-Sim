/**
 * Leitner-box spaced repetition for missed quiz questions.
 *
 * A miss puts the question in box 0 (due ~10 minutes later, i.e. "again
 * this session"). Each correct review promotes it one box; graduating
 * past the last box removes it. Any miss demotes back to box 0. Only
 * MISSED questions enter the queue — the app never gates content behind
 * repetition, it just brings weak spots back.
 */

export interface SrsItem {
  moduleId: string;
  questionId: string;
  box: number; // 0..BOX_INTERVALS.length-1
  dueAt: number; // epoch ms
  lapses: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** box -> delay until next review */
export const BOX_INTERVALS_MS = [10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY];

export function recordMiss(
  queue: SrsItem[],
  moduleId: string,
  questionId: string,
  now: number
): SrsItem[] {
  const rest = queue.filter((i) => !(i.moduleId === moduleId && i.questionId === questionId));
  const prev = queue.find((i) => i.moduleId === moduleId && i.questionId === questionId);
  return [
    ...rest,
    {
      moduleId,
      questionId,
      box: 0,
      dueAt: now + BOX_INTERVALS_MS[0],
      lapses: (prev?.lapses ?? 0) + 1,
    },
  ];
}

/** correct answer during a review: promote or graduate */
export function recordReviewPass(
  queue: SrsItem[],
  moduleId: string,
  questionId: string,
  now: number
): SrsItem[] {
  const item = queue.find((i) => i.moduleId === moduleId && i.questionId === questionId);
  if (!item) return queue;
  const rest = queue.filter((i) => i !== item);
  const nextBox = item.box + 1;
  if (nextBox >= BOX_INTERVALS_MS.length) return rest; // graduated
  return [...rest, { ...item, box: nextBox, dueAt: now + BOX_INTERVALS_MS[nextBox] }];
}

export function dueItems(queue: SrsItem[], now: number): SrsItem[] {
  return queue.filter((i) => i.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}

export function nextDueAt(queue: SrsItem[]): number | null {
  if (queue.length === 0) return null;
  return Math.min(...queue.map((i) => i.dueAt));
}
