import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from './theme';

/**
 * Diagram library — the visual half of every concept's MECHANISM beat. The
 * learner model makes this a hard rule: text-only physics does not stick, so
 * each mechanism references a `diagramId` here and gets a simple, labelled
 * cross-section drawn in SVG (Expo-Go-safe, no image assets).
 *
 * Diagrams are keyed by id so content references a drawing rather than each
 * concept hand-rolling one; a new mechanism reuses an existing diagram or adds
 * one function here. Unknown ids render a clearly-marked "pending" placeholder
 * so nothing crashes, and content validation flags any concept pointing at a
 * missing drawing.
 */

const VB_W = 220;
const VB_H = 150;

// ---- small drawing helpers -------------------------------------------------

/** an up-pointing arrow from (x, y0) to (x, y1<y0) */
function UpArrow({ x, y0, y1, color, w = 2 }: { x: number; y0: number; y1: number; color: string; w?: number }) {
  return (
    <G>
      <Line x1={x} y1={y0} x2={x} y2={y1 + 4} stroke={color} strokeWidth={w} />
      <Polygon points={`${x - 4},${y1 + 5} ${x + 4},${y1 + 5} ${x},${y1}`} fill={color} />
    </G>
  );
}

function DownArrow({ x, y0, y1, color, w = 2 }: { x: number; y0: number; y1: number; color: string; w?: number }) {
  return (
    <G>
      <Line x1={x} y1={y0} x2={x} y2={y1 - 4} stroke={color} strokeWidth={w} />
      <Polygon points={`${x - 4},${y1 - 5} ${x + 4},${y1 - 5} ${x},${y1}`} fill={color} />
    </G>
  );
}

function label(x: number, y: number, text: string, opts?: { size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: string }) {
  return (
    <SvgText
      x={x}
      y={y}
      fontSize={opts?.size ?? 9}
      fill={opts?.color ?? colors.text}
      textAnchor={opts?.anchor ?? 'start'}
      fontWeight={opts?.weight ?? '400'}
    >
      {text}
    </SvgText>
  );
}

// ---- the diagrams ----------------------------------------------------------

/** hydrostatic uplift: an empty pool shell in high groundwater floats */
function HydrostaticUplift() {
  const wt = 46; // water table y
  const poolL = 72;
  const poolR = 152;
  const poolTop = 40;
  const poolFloor = 104;
  return (
    <G>
      {/* sky + ground */}
      <Rect x={0} y={0} width={VB_W} height={30} fill="#0F2A44" />
      <Rect x={0} y={30} width={VB_W} height={VB_H - 30} fill="#4A3E20" />
      {/* saturated (below water table) tint */}
      <Rect x={0} y={wt} width={VB_W} height={VB_H - wt} fill="#1C77B0" opacity={0.28} />
      {/* water table line */}
      <Line x1={0} y1={wt} x2={VB_W} y2={wt} stroke="#4FC3F7" strokeWidth={1.5} strokeDasharray="5 3" />
      {label(4, wt - 3, 'water table (~5 ft down)', { color: '#8FD3F7', size: 8 })}
      {/* empty pool shell (air inside) */}
      <Path
        d={`M${poolL},${poolTop} L${poolL},${poolFloor} L${poolR},${poolFloor} L${poolR},${poolTop}`}
        fill="none"
        stroke="#E8EEF6"
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <Rect x={poolL + 3} y={poolTop} width={poolR - poolL - 6} height={poolFloor - poolTop - 3} fill="#10141B" opacity={0.35} />
      {label((poolL + poolR) / 2, poolTop + 20, 'EMPTY', { anchor: 'middle', size: 9, weight: '700', color: '#E8EEF6' })}
      {label((poolL + poolR) / 2, poolTop + 31, '(air inside)', { anchor: 'middle', size: 7.5, color: '#8FA3BC' })}
      {/* uplift arrows pushing the floor up */}
      {[90, 112, 134].map((x) => (
        <UpArrow key={x} x={x} y0={126} y1={poolFloor + 6} color="#4FC3F7" w={2} />
      ))}
      {/* the big net-uplift arrow */}
      <UpArrow x={poolR + 20} y0={120} y1={54} color={colors.accent} w={3.5} />
      {label(poolR + 26, 90, 'UPLIFT', { color: colors.accent, weight: '700', size: 10 })}
      {label(4, VB_H - 6, 'water it shoves aside pushes the empty shell UP → it floats', { size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** load path: a load must find a continuous road to the ground */
function LoadPath() {
  const ground = 128;
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* the load on the roof */}
      {[60, 110, 160].map((x) => (
        <DownArrow key={x} x={x} y0={12} y1={30} color={colors.warn} w={2} />
      ))}
      {label(110, 10, 'load (roof, wind, people)', { anchor: 'middle', size: 8, color: colors.warn })}
      {/* roof beam */}
      <Rect x={44} y={30} width={132} height={8} fill="#8FA3BC" />
      {/* two columns */}
      <Rect x={54} y={38} width={10} height={ground - 38} fill="#8FA3BC" />
      <Rect x={156} y={38} width={10} height={ground - 38} fill="#8FA3BC" />
      {/* footings */}
      <Rect x={44} y={ground} width={30} height={9} fill="#C99A5B" />
      <Rect x={146} y={ground} width={30} height={9} fill="#C99A5B" />
      {/* ground hatch */}
      <Line x1={0} y1={ground + 9} x2={VB_W} y2={ground + 9} stroke="#4A3E20" strokeWidth={3} />
      {/* the highlighted continuous load path down the left column */}
      <Path d={`M59,30 L59,${ground + 9}`} stroke={colors.good} strokeWidth={3} strokeDasharray="2 3" />
      {label(4, ground + 20, 'unbroken path → carries the load safely', { size: 8, color: colors.good })}
      {/* the broken path on the right (a bad connection) */}
      <Line x1={161} y1={70} x2={161} y2={74} stroke={colors.bad} strokeWidth={0} />
      <SvgText x={161} y={78} fontSize={13} fill={colors.bad} textAnchor="middle" fontWeight="700">✗</SvgText>
      {label(174, 66, 'gap here =', { size: 7.5, color: colors.bad })}
      {label(174, 75, 'it fails', { size: 7.5, color: colors.bad })}
    </G>
  );
}

/** tension location: steel belongs on the face that is being stretched */
function TensionLocation() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* supports */}
      <Polygon points="34,96 46,96 40,84" fill="#8FA3BC" />
      <Polygon points="174,96 186,96 180,84" fill="#8FA3BC" />
      {/* load in the middle */}
      <DownArrow x={110} y0={20} y1={40} color={colors.warn} w={2.5} />
      {label(110, 16, 'load', { anchor: 'middle', size: 8, color: colors.warn })}
      {/* sagging beam (a shallow downward arc) */}
      <Path d="M40,50 Q110,74 180,50 L180,66 Q110,90 40,66 Z" fill="#6C7BD6" opacity={0.9} />
      {/* top fibre: squeezed together (compression) */}
      {label(110, 47, 'top: squeezed', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
      {/* bottom fibre: pulled apart (tension) — where steel goes */}
      <Line x1={48} y1={80} x2={172} y2={80} stroke={colors.good} strokeWidth={2.5} strokeDasharray="4 3" />
      <Circle cx={48} cy={80} r={2.4} fill={colors.good} />
      <Circle cx={172} cy={80} r={2.4} fill={colors.good} />
      {label(110, 100, 'bottom: STRETCHED → put the steel here ✓', { anchor: 'middle', size: 8, color: colors.good, weight: '700' })}
      {/* ghost steel at the top with an X */}
      <Line x1={64} y1={44} x2={156} y2={44} stroke={colors.bad} strokeWidth={1.5} strokeDasharray="2 3" opacity={0.7} />
      <SvgText x={166} y={47} fontSize={11} fill={colors.bad} fontWeight="700">✗</SvgText>
      {label(4, VB_H - 6, 'steel on the wrong face does nothing — the concrete still cracks', { size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** compaction: air voids in loose fill become tomorrow's settlement */
function Compaction() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* LEFT — loose fill with voids, house sinking/tilting */}
      <Rect x={8} y={70} width={94} height={70} fill="#5A4A28" />
      {[[24, 90], [46, 84], [70, 96], [88, 78], [34, 112], [64, 118], [86, 108]].map(([x, y], k) => (
        <Circle key={k} cx={x} cy={y} r={5} fill="#0A1420" opacity={0.7} />
      ))}
      <Polygon points="30,70 74,70 66,58 38,58" fill="#CE9A63" transform="rotate(6 52 64)" />
      {label(55, 52, 'sinks & tilts', { anchor: 'middle', size: 8, color: colors.bad })}
      {label(55, 134, 'loose fill = air voids', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      {/* RIGHT — compacted thin lifts, house level */}
      <Rect x={118} y={70} width={94} height={70} fill="#6B5A30" />
      {[78, 88, 98, 108, 118, 128].map((y) => (
        <Line key={y} x1={118} y1={y} x2={212} y2={y} stroke="#4A3E20" strokeWidth={1} />
      ))}
      <Polygon points="142,70 186,70 178,58 150,58" fill="#CE9A63" />
      {label(165, 52, 'stays level', { anchor: 'middle', size: 8, color: colors.good })}
      {label(165, 134, 'thin lifts, no voids', { anchor: 'middle', size: 8, color: colors.good })}
    </G>
  );
}

/** concrete curing: strength comes from staying wet, not drying */
function ConcreteCuring() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* LEFT — kept wet, strong */}
      <Rect x={12} y={60} width={90} height={22} fill="#8FA3BC" />
      {[24, 44, 64, 84].map((x) => (
        <G key={x}>
          <Line x1={x} y1={48} x2={x} y2={58} stroke="#4FC3F7" strokeWidth={2} />
          <Circle cx={x} cy={58} r={2} fill="#4FC3F7" />
        </G>
      ))}
      {label(57, 42, 'kept wet 7 days', { anchor: 'middle', size: 8, color: '#8FD3F7' })}
      <Rect x={12} y={96} width={90} height={12} fill="#10141B" />
      <Rect x={12} y={96} width={82} height={12} fill={colors.good} />
      {label(57, 122, 'full strength', { anchor: 'middle', size: 8, color: colors.good, weight: '700' })}
      {/* RIGHT — dried early, weak + cracked */}
      <Rect x={118} y={60} width={90} height={22} fill="#8FA3BC" />
      {[140, 165, 190].map((x) => (
        <Line key={x} x1={x} y1={60} x2={x + 3} y2={82} stroke="#0A1420" strokeWidth={1.5} />
      ))}
      <SvgText x={163} y={52} fontSize={12} textAnchor="middle">☀️</SvgText>
      <Rect x={118} y={96} width={90} height={12} fill="#10141B" />
      <Rect x={118} y={96} width={40} height={12} fill={colors.bad} />
      {label(163, 122, 'weak — forever', { anchor: 'middle', size: 8, color: colors.bad, weight: '700' })}
    </G>
  );
}

/** differential settlement: uneven sinking, not sinking, cracks things */
function DifferentialSettlement() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* two soils */}
      <Rect x={0} y={96} width={110} height={54} fill="#8892A0" />
      {[10, 30, 50, 70, 90].map((x) => (
        <Line key={x} x1={x} y1={96} x2={x + 8} y2={108} stroke="#5A6270" strokeWidth={1} />
      ))}
      {label(52, 140, 'firm rock', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      <Rect x={110} y={96} width={110} height={54} fill="#4A3E20" />
      {[[128, 116], [150, 128], [172, 112], [196, 124], [206, 108]].map(([x, y], k) => (
        <Circle key={k} cx={x} cy={y} r={4} fill="#0A1420" opacity={0.7} />
      ))}
      {label(165, 140, 'soft pocket (sinks)', { anchor: 'middle', size: 8, color: colors.warn })}
      {/* building, tilted, with a crack up the middle where the two differ */}
      <Polygon points="40,50 180,50 186,96 46,96" fill="#6C7BD6" opacity={0.92} />
      <Path d="M112,50 L108,66 L116,80 L110,96" stroke="#0A1420" strokeWidth={2.5} fill="none" />
      {label(112, 44, 'crack', { anchor: 'middle', size: 8, color: colors.bad, weight: '700' })}
      {label(110, VB_H - 4, 'even settling = fine · DIFFERENT settling = cracks', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** wind uplift: wind lifts a roof like a wing; tie it down continuously */
function WindUplift() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* wind streaming over the roof */}
      {[26, 40, 54].map((y) => (
        <Path key={y} d={`M6,${y} Q70,${y - 14} 130,${y}`} stroke="#8FD3F7" strokeWidth={1.5} fill="none" />
      ))}
      {label(20, 20, 'wind', { size: 8, color: '#8FD3F7' })}
      {/* suction lifting the roof */}
      {[70, 90, 110].map((x) => (
        <UpArrow key={x} x={x} y0={70} y1={50} color={colors.accent} w={2} />
      ))}
      {label(150, 44, 'UPLIFT (suction)', { size: 9, color: colors.accent, weight: '700' })}
      {/* house: roof + walls + footing */}
      <Polygon points="56,66 124,66 90,44" fill="#C99A5B" />
      <Rect x={58} y={66} width={64} height={54} fill="#8FA3BC" />
      <Rect x={48} y={120} width={84} height={9} fill="#4A3E20" />
      {/* the continuous tie-down: roof → wall → footing */}
      <Path d="M64,52 L64,120" stroke={colors.good} strokeWidth={2.5} strokeDasharray="3 2" />
      <Path d="M116,52 L116,120" stroke={colors.good} strokeWidth={2.5} strokeDasharray="3 2" />
      {label(90, VB_H - 4, 'tie the roof to the ground — a continuous load path', { anchor: 'middle', size: 8, color: colors.good })}
    </G>
  );
}

/** chloride ingress: salt reaches the steel and rust spalls the cover */
function ChlorideIngress() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* concrete cover block */}
      <Rect x={20} y={30} width={180} height={90} fill="#9AA4B2" />
      {label(24, 24, 'salty air / spray', { size: 8, color: '#8FD3F7' })}
      {/* salt migrating in from the surface (left) toward the bar */}
      {[[28, 50], [40, 66], [34, 84], [52, 58], [60, 76], [72, 92], [84, 64]].map(([x, y], k) => (
        <SvgText key={k} x={x} y={y} fontSize={7} fill="#4FC3F7">Na</SvgText>
      ))}
      {/* the rebar, rusting + swelling */}
      <Circle cx={120} cy={78} r={10} fill="#C97A3A" />
      <Circle cx={120} cy={78} r={6} fill="#8892A0" />
      {label(120, 100, 'rebar rusts & swells', { anchor: 'middle', size: 7.5, color: colors.warn })}
      {/* spalling crack popping the cover off above the bar */}
      <Path d="M120,68 L112,50 L126,40 L120,30" stroke="#0A1420" strokeWidth={2} fill="none" />
      {label(160, 46, 'cover spalls off', { size: 8, color: colors.bad })}
      {/* the cover = the clock */}
      <Line x1={20} y1={126} x2={120} y2={126} stroke={colors.good} strokeWidth={2} />
      {label(70, VB_H - 4, 'thicker, denser cover = more years before salt reaches steel', { anchor: 'middle', size: 8, color: colors.good })}
    </G>
  );
}

const DIAGRAMS: Record<string, () => React.ReactElement> = {
  'hydrostatic-uplift': HydrostaticUplift,
  'load-path': LoadPath,
  'tension-location': TensionLocation,
  compaction: Compaction,
  'concrete-curing': ConcreteCuring,
  'differential-settlement': DifferentialSettlement,
  'wind-uplift': WindUplift,
  'chloride-ingress': ChlorideIngress,
};

/** ids of diagrams that have a real drawing (not the placeholder) */
export const DIAGRAM_IDS = Object.keys(DIAGRAMS);

export function hasDiagram(id: string): boolean {
  return id in DIAGRAMS;
}

function Placeholder({ id }: { id: string }) {
  return (
    <G>
      <Rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} rx={8} fill="#182A42" stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" />
      <SvgText x={VB_W / 2} y={VB_H / 2 - 6} fontSize={22} textAnchor="middle">🔍</SvgText>
      {label(VB_W / 2, VB_H / 2 + 16, 'diagram pending', { anchor: 'middle', size: 10, color: colors.muted })}
      {label(VB_W / 2, VB_H / 2 + 30, id, { anchor: 'middle', size: 8, color: colors.muted })}
    </G>
  );
}

export default function Diagram({ id, width = 260 }: { id: string; width?: number }) {
  const Body = DIAGRAMS[id];
  return (
    <View style={{ alignSelf: 'center', marginVertical: 6 }}>
      <Svg width={width} height={(width * VB_H) / VB_W} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {Body ? <Body /> : <Placeholder id={id} />}
      </Svg>
    </View>
  );
}
