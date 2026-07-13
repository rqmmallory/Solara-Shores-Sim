import { modules, simPhases } from '../../content';
import {
  MENTORS,
  mentorById,
  mentorForModule,
  mentorReaction,
  phaseHost,
  PHASE_HOST,
} from '../../content/mentors';
import { ADVISORS } from '../sim';

describe('mentor roster integrity', () => {
  it('has unique ids and every field populated', () => {
    const ids = MENTORS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MENTORS) {
      expect(m.name).toBeTruthy();
      expect(m.avatar).toBeTruthy();
      expect(m.greeting.length).toBeGreaterThan(10);
      expect(m.reactions.good.length).toBeGreaterThan(0);
      expect(m.reactions.warn.length).toBeGreaterThan(0);
      expect(m.reactions.bad.length).toBeGreaterThan(0);
    }
  });
});

describe('mentor wiring', () => {
  it('every advisor names a real mentor', () => {
    for (const a of ADVISORS) expect(mentorById(a.mentorId)).toBeDefined();
  });

  it('every sim phase has a host mentor that resolves', () => {
    for (const p of simPhases) {
      expect(PHASE_HOST[p.id]).toBeDefined();
      expect(phaseHost(p.id)).toBeTruthy();
    }
  });

  it('routes every module to a valid mentor', () => {
    for (const m of modules) {
      const mentor = mentorForModule(m.id);
      expect(mentor).toBeTruthy();
      expect(MENTORS.includes(mentor)).toBe(true);
    }
  });

  it('routes ground/water/structure topics to the right specialists', () => {
    expect(mentorForModule('s01-soils-compaction').id).toBe('geotech');
    expect(mentorForModule('m04-marina').id).toBe('marine');
    expect(mentorForModule('s02-concrete').id).toBe('engineer');
  });
});

describe('mentorReaction', () => {
  it('is deterministic and always returns an in-set line', () => {
    const m = MENTORS[0];
    for (let seed = 0; seed < 10; seed++) {
      const line = mentorReaction(m, 'good', seed);
      expect(m.reactions.good).toContain(line);
      expect(mentorReaction(m, 'good', seed)).toBe(line); // stable
    }
  });
});
