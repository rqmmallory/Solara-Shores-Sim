import {
  dueForResurface,
  pickDisguise,
  PrincipleRetention,
  principleStrength,
  recordPrincipleOutcome,
  resurfacePriority,
} from '../principles';

const DAY = 24 * 60 * 60 * 1000;

describe('recordPrincipleOutcome', () => {
  it('is a no-op when a question tags no principle', () => {
    const r: PrincipleRetention = {};
    expect(recordPrincipleOutcome(r, undefined, true, 0)).toBe(r);
    expect(recordPrincipleOutcome(r, [], false, 0)).toBe(r);
  });

  it('raises strength on correct, lowers on incorrect, and tracks lastSeen', () => {
    let r: PrincipleRetention = {};
    r = recordPrincipleOutcome(r, ['load-path'], true, 1000);
    expect(principleStrength(r, 'load-path')).toBe(60);
    expect(r['load-path'].lastSeen).toBe(1000);
    r = recordPrincipleOutcome(r, ['load-path'], true, 2000);
    expect(principleStrength(r, 'load-path')).toBeGreaterThan(60);
    const afterMiss = recordPrincipleOutcome(r, ['load-path'], false, 3000);
    expect(principleStrength(afterMiss, 'load-path')).toBeLessThan(principleStrength(r, 'load-path'));
    expect(afterMiss['load-path'].attempts).toBe(3);
  });

  it('updates every tagged principle at once', () => {
    const r = recordPrincipleOutcome({}, ['a', 'b'], true, 0);
    expect(r.a).toBeDefined();
    expect(r.b).toBeDefined();
  });
});

describe('resurface priority', () => {
  it('ranks weak principles above strong ones', () => {
    let r: PrincipleRetention = {};
    r = recordPrincipleOutcome(r, ['strong'], true, 0);
    r = recordPrincipleOutcome(r, ['strong'], true, 0);
    r = recordPrincipleOutcome(r, ['strong'], true, 0);
    r = recordPrincipleOutcome(r, ['weak'], false, 0);
    expect(resurfacePriority(r, 'weak', 0)).toBeGreaterThan(resurfacePriority(r, 'strong', 0));
  });

  it('escalates a mastered-but-stale principle as disuse grows', () => {
    const r = recordPrincipleOutcome({}, ['x'], true, 0);
    const fresh = resurfacePriority(r, 'x', 0);
    const stale = resurfacePriority(r, 'x', 10 * DAY);
    expect(stale).toBeGreaterThan(fresh);
  });

  it('dueForResurface returns weakest/stalest first', () => {
    let r: PrincipleRetention = {};
    r = recordPrincipleOutcome(r, ['mastered'], true, 0);
    r = recordPrincipleOutcome(r, ['mastered'], true, 0);
    r = recordPrincipleOutcome(r, ['shaky'], false, 0);
    const order = dueForResurface(r, ['mastered', 'shaky', 'unseen'], 0, 3);
    expect(order[0]).toBe('shaky');
  });
});

describe('pickDisguise', () => {
  const pool = [
    { moduleId: 'v33', questionId: 'v33-q1', principleIds: ['hydrostatic-uplift'] },
    { moduleId: 'm08', questionId: 'm08-q3', principleIds: ['hydrostatic-uplift'] },
    { moduleId: 'v31', questionId: 'v31-q1', principleIds: ['load-path'] },
  ];

  it('prefers a question the learner has not just seen (a new disguise)', () => {
    const pick = pickDisguise('hydrostatic-uplift', pool, new Set(['v33-q1']));
    expect(pick?.questionId).toBe('m08-q3');
  });

  it('falls back to the tagged pool when all have been seen', () => {
    const pick = pickDisguise('hydrostatic-uplift', pool, new Set(['v33-q1', 'm08-q3']));
    expect(pick).not.toBeNull();
    expect(pick!.principleIds).toContain('hydrostatic-uplift');
  });

  it('returns null when no question teaches the principle', () => {
    expect(pickDisguise('nonexistent', pool, new Set())).toBeNull();
  });
});
