/**
 * Principles — the recurring causal laws the whole curriculum is built to
 * encode. A principle is bigger than any one module: `tension-location` shows
 * up in a beam diagram, a balcony decision, a dock deck, and a sim cantilever
 * failure. Tagging concepts, quiz questions and sim callbacks with a
 * `principleId` lets the retention engine resurface a LAW in a new disguise
 * rather than replaying an old question string (see engine/principles.ts).
 *
 * This is data, not logic — a registry app code validates content against.
 */

export type PrincipleDomain = 'physics' | 'trade' | 'management';

export interface Principle {
  id: string;
  name: string;
  /** the law in one child-clear sentence — the thing that must stick */
  statement: string;
  domain: PrincipleDomain;
}

export const PRINCIPLES: Principle[] = [
  {
    id: 'hydrostatic-uplift',
    name: 'Hydrostatic uplift',
    statement: 'Anything hollow in wet ground is pushed UP by the weight of the water it shoves aside — an empty pool floats.',
    domain: 'physics',
  },
  {
    id: 'load-path',
    name: 'Load path',
    statement: 'Every load has to find an unbroken road down to the ground; break the road and something bends or snaps.',
    domain: 'physics',
  },
  {
    id: 'tension-location',
    name: 'Tension location',
    statement: 'Steel only helps where the concrete is being pulled apart — put it on the stretching face or it does nothing.',
    domain: 'physics',
  },
  {
    id: 'differential-settlement',
    name: 'Differential settlement',
    statement: 'Even settling is fine; it is parts sinking by DIFFERENT amounts that cracks and tilts things.',
    domain: 'physics',
  },
  {
    id: 'wind-uplift',
    name: 'Wind uplift',
    statement: 'Wind lifts a roof off like an airplane wing — it does not push down; tie the roof to the ground all the way.',
    domain: 'physics',
  },
  {
    id: 'thermal-movement',
    name: 'Thermal movement',
    statement: 'Everything grows in heat and shrinks in cold; give it a joint to move or it cracks where you did not choose.',
    domain: 'physics',
  },
  {
    id: 'compaction',
    name: 'Compaction',
    statement: 'Air left in fill becomes tomorrow’s sinking; squeeze it out in thin layers at the right dampness.',
    domain: 'trade',
  },
  {
    id: 'concrete-curing',
    name: 'Concrete curing',
    statement: 'Concrete gets strong by staying WET, not by drying; water lost early is strength lost forever.',
    domain: 'trade',
  },
  {
    id: 'chloride-ingress',
    name: 'Chloride ingress',
    statement: 'Salt soaks in and rusts the hidden steel; thick, dense cover is the clock you are buying.',
    domain: 'trade',
  },
  {
    id: 'drainage',
    name: 'Drainage',
    statement: 'Water always wins unless you give it a planned way out; slope and drain everything.',
    domain: 'trade',
  },
  {
    id: 'waterproofing',
    name: 'Waterproofing',
    statement: 'Keeping water out is far cheaper than chasing it once it is in; detail the barrier before you bury it.',
    domain: 'trade',
  },
  {
    id: 'de-risk-early',
    name: 'De-risk early',
    statement: 'Money spent early to buy certainty is the cheapest money on the whole job.',
    domain: 'management',
  },
  {
    id: 'even-flow',
    name: 'Even flow',
    statement: 'Trades move like a train on one track: keep every crew at the same steady pace and the whole line rolls; let one bunch up and everyone behind it waits.',
    domain: 'management',
  },
  {
    id: 'sand-river',
    name: 'Sand river',
    statement: 'Sand travels along the shore like a slow river; block it with a wall and you feed one beach by starving the next one down the line.',
    domain: 'physics',
  },
  {
    id: 'fire-time',
    name: 'Fire buys time',
    statement: 'A building cannot beat a fire, only slow it down; every fire rule is really buying minutes for people to get out.',
    domain: 'trade',
  },
  {
    id: 'landed-cost',
    name: 'Landed cost',
    statement: 'The price on the invoice is never the cost; on an island every import stacks freight, duty, and tax on top before it is yours.',
    domain: 'management',
  },
  {
    id: 'zopa-overlap',
    name: 'ZOPA overlap',
    statement: "A deal only lives in the gap where both sides' walk-away lines overlap; know your walk-away or you will sign a bad one.",
    domain: 'management',
  },
];

const BY_ID = new Map(PRINCIPLES.map((p) => [p.id, p]));

export function principleById(id: string): Principle | undefined {
  return BY_ID.get(id);
}

export function isPrinciple(id: string): boolean {
  return BY_ID.has(id);
}
