import {
  BOX_INTERVALS_MS,
  dueItems,
  recordMiss,
  recordReviewPass,
} from '../spacedRepetition';

const NOW = 1_000_000_000_000;

describe('spacedRepetition (Leitner)', () => {
  it('a miss enters box 0, due in ~10 minutes', () => {
    const q = recordMiss([], 'm01', 'q1', NOW);
    expect(q).toHaveLength(1);
    expect(q[0].box).toBe(0);
    expect(q[0].dueAt).toBe(NOW + BOX_INTERVALS_MS[0]);
    expect(dueItems(q, NOW)).toHaveLength(0);
    expect(dueItems(q, NOW + BOX_INTERVALS_MS[0])).toHaveLength(1);
  });

  it('passes promote through boxes and graduate off the queue', () => {
    let q = recordMiss([], 'm01', 'q1', NOW);
    q = recordReviewPass(q, 'm01', 'q1', NOW); // -> box 1 (1 day)
    expect(q[0].box).toBe(1);
    q = recordReviewPass(q, 'm01', 'q1', NOW); // -> box 2
    q = recordReviewPass(q, 'm01', 'q1', NOW); // -> box 3
    expect(q[0].box).toBe(3);
    q = recordReviewPass(q, 'm01', 'q1', NOW); // graduates
    expect(q).toHaveLength(0);
  });

  it('a miss during review demotes to box 0 and counts a lapse', () => {
    let q = recordMiss([], 'm01', 'q1', NOW);
    q = recordReviewPass(q, 'm01', 'q1', NOW);
    q = recordMiss(q, 'm01', 'q1', NOW);
    expect(q[0].box).toBe(0);
    expect(q[0].lapses).toBe(2);
    expect(q).toHaveLength(1); // no duplicates
  });
});
