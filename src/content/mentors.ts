/**
 * Mentor characters — the human face of the teaching. Every screen that
 * explains a "why" can put it in a named voice instead of a gray box:
 * the Foreman walks you round the site, the QS prices your options, the
 * Geotech reads the ground, the Marine Super owns the water, the Engineer
 * owns the structure. They add personality and a point of view; the actual
 * facts still come from the module/sim JSON — mentors frame, they don't
 * replace content.
 *
 * Deterministic pickers (no randomness) so the sim and its tests stay pure.
 */

export interface Mentor {
  id: string;
  name: string;
  role: string;
  /** emoji avatar — no image assets to bundle, reads instantly */
  avatar: string;
  /** persona accent colour (hex) */
  color: string;
  /** one-line character descriptor shown under the name */
  voice: string;
  /** home-screen greeting */
  greeting: string;
  /** reactions to a decision, keyed by how good the call was */
  reactions: {
    good: string[];
    warn: string[];
    bad: string[];
  };
}

export const MENTORS: Mentor[] = [
  {
    id: 'foreman',
    name: 'Deacon',
    role: 'Site Foreman',
    avatar: '👷🏾',
    color: '#F5A623',
    voice: 'Thirty years on Nassau job sites. Plain talk, no fluff.',
    greeting:
      "Morning, boss. The site's waiting on you — every decision you make in here is one you won't have to learn the hard way out there.",
    reactions: {
      good: [
        "That's the call I'd have made. Clean.",
        'Textbook. The crews will thank you for that one.',
        "See? You're starting to think like a builder.",
      ],
      warn: [
        "It'll work — but it'll cost you somewhere. Watch it.",
        "Not wrong, not free. Keep an eye on the fallout.",
        'We can live with that. Barely.',
      ],
      bad: [
        "Ooh. That one's gonna come back around, mark me.",
        "We'll fix it, but you just bought yourself a headache.",
        "Now you'll feel why we don't do it that way.",
      ],
    },
  },
  {
    id: 'qs',
    name: 'Marguerite',
    role: 'Quantity Surveyor',
    avatar: '📐',
    color: '#2EC4B6',
    voice: 'Prices everything before you sign it. Numbers never lie.',
    greeting:
      "Bring me your options and I'll bring you the real number. Studying the estimating side pays your consultant fees — literally.",
    reactions: {
      good: ['The figures back you up on that one.', 'Priced it — that saved you money you can see.'],
      warn: ['Within tolerance, but the variance is creeping.', "Affordable today. Ask me again next month."],
      bad: ["That'll blow the line item. I did warn you.", 'The contingency just took that hit for you.'],
    },
  },
  {
    id: 'geotech',
    name: 'Dr. Rolle',
    role: 'Geotechnical Engineer',
    avatar: '🪨',
    color: '#8FA3BC',
    voice: 'Reads the ground so it never surprises you.',
    greeting:
      'Everything you build sits on what I test. Know the soil and the karst before you trust them with a foundation.',
    reactions: {
      good: ['The ground will hold that. Good.', 'You respected the subsurface. It respects you back.'],
      warn: ['The ground tolerates it — for now.', 'Marginal bearing. Keep the boreholes handy.'],
      bad: ['You built on an assumption. The karst votes last.', 'That settlement bill is coming due.'],
    },
  },
  {
    id: 'marine',
    name: 'Cap',
    role: 'Marine Superintendent',
    avatar: '⚓',
    color: '#1A9AD4',
    voice: 'Owns everything below the tide line. The sea sets the schedule.',
    greeting:
      "Out here the weather window is boss, not you. Learn the water and it'll let you work.",
    reactions: {
      good: ['You worked with the tide, not against it. Smart.', 'That window held. Well timed.'],
      warn: ['Sea let you off light this time.', "Turbidity's up but we're inside the permit."],
      bad: ['You fought the ocean. The ocean is undefeated.', 'Standby charges start... now.'],
    },
  },
  {
    id: 'engineer',
    name: 'Ing. Adderley',
    role: 'Structural Engineer',
    avatar: '📏',
    color: '#B58BE0',
    voice: 'Traces every load to the ground. Wind is the enemy here.',
    greeting:
      'Every load has a path to the footing — or it finds one you did not design. Let me show you the physics before the storm does.',
    reactions: {
      good: ['The load path is continuous. That is how it should read.', 'Detailed for the wind. Good hands.'],
      warn: ['It carries the load — with less margin than I like.', 'Code-minimum. Legal, not generous.'],
      bad: ['That connection is the weak link now.', 'The uplift will find that gap.'],
    },
  },
  {
    id: 'owner',
    name: 'You',
    role: 'Owner-Developer',
    avatar: '🧭',
    color: '#4CAF7D',
    voice: 'The one who carries the whole thing. That is the job.',
    greeting:
      "This is your project. Nobody hands you the answers on site — so we practice the decisions here first.",
    reactions: {
      good: ['That protected the project. Good ownership.', 'You spent to save. That is the reserve working.'],
      warn: ['A judgement call. Own the trade-off.', 'You bought time. Note what it cost.'],
      bad: ['That is the money you cannot get back. Remember it.', 'The reserve exists for exactly what you just skipped.'],
    },
  },
];

const BY_ID = new Map(MENTORS.map((m) => [m.id, m]));

export function mentorById(id: string): Mentor | undefined {
  return BY_ID.get(id);
}

/** the mentor who hosts each sim phase's intro and debriefs */
export const PHASE_HOST: Record<string, string> = {
  'phase1-site-prep': 'geotech',
  'phase2-marine-horizontal': 'marine',
  'phase3-vertical-amenity': 'engineer',
  'phase4-marine-window': 'marine',
  'phase5-production-condos': 'foreman',
  'phase6-estates-senior-retail': 'qs',
  'phase7-handover': 'owner',
};

export function phaseHost(phaseId: string): Mentor {
  return mentorById(PHASE_HOST[phaseId] ?? 'foreman') ?? MENTORS[0];
}

/** keyword routing from a module id to the mentor who owns that topic */
const MODULE_ROUTES: { match: RegExp; mentorId: string }[] = [
  { match: /soil|compaction|geotech|settle|s01/, mentorId: 'geotech' },
  { match: /marina|marine|canal|coast|beach|buoyanc|durab|s09|s10|m04|v33|v37/, mentorId: 'marine' },
  { match: /concrete|rebar|reinforc|masonry|formwork|load|lateral|wind|crack|s02|s03|s04|s05|s06|v31|v32|v35|v36/, mentorId: 'engineer' },
  { match: /cost|budget|estimat|retain|procure|m09|m10|m11|m12|m13|m14/, mentorId: 'qs' },
];

/** which mentor should introduce/guide a given module */
export function mentorForModule(moduleId: string): Mentor {
  for (const r of MODULE_ROUTES) if (r.match.test(moduleId)) return mentorById(r.mentorId)!;
  return mentorById('foreman')!;
}

/** deterministic reaction line for a decision outcome */
export function mentorReaction(mentor: Mentor, tone: 'good' | 'warn' | 'bad', seed: number): string {
  const lines = mentor.reactions[tone];
  return lines[Math.abs(seed) % lines.length];
}
