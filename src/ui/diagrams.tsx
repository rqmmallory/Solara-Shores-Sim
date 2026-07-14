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

/** water table: a dug pit fills with groundwater near sea level */
function WaterTable() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={40} fill="#0F2A44" />
      <Rect x={0} y={40} width={VB_W} height={VB_H - 40} fill="#8892A0" />
      {[10, 30, 50, 70, 90].map((y) => (
        <G key={y}>{[20, 60, 100, 140, 180].map((x) => <Circle key={x} cx={x} cy={40 + y} r={2} fill="#0A1420" opacity={0.4} />)}</G>
      ))}
      <Line x1={0} y1={58} x2={VB_W} y2={58} stroke="#4FC3F7" strokeWidth={1.5} strokeDasharray="5 3" />
      {label(4, 54, 'water table (~sea level)', { color: '#8FD3F7', size: 8 })}
      {/* the dug pit, filling blue from the bottom */}
      <Rect x={70} y={58} width={50} height={62} fill="#0A1420" />
      <Rect x={70} y={80} width={50} height={40} fill="#1C77B0" opacity={0.85} />
      {label(95, 74, 'dig a pit', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      <UpArrow x={95} y0={112} y1={90} color="#4FC3F7" w={2} />
      {label(95, VB_H - 4, 'it fills from below — the water is already there', { anchor: 'middle', size: 8, color: '#8FD3F7' })}
    </G>
  );
}

/** permit gate: three chains, one valve (CEC) blocks all until it opens */
function PermitGate() {
  const lanes = [
    { x: 10, label: 'Land-side' },
    { x: 82, label: 'Environmental' },
    { x: 154, label: 'Commercial' },
  ];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {lanes.map((l) => (
        <G key={l.x}>
          {label(l.x + 27, 12, l.label, { anchor: 'middle', size: 7.5, weight: '700' })}
          {[20, 34, 48].map((y) => <Rect key={y} x={l.x} y={y} width={54} height={10} fill="#8FA3BC" rx={2} />)}
        </G>
      ))}
      {/* the CEC valve on the environmental lane */}
      <Circle cx={109} cy={68} r={11} fill={colors.warn} />
      {label(109, 71, 'CEC', { anchor: 'middle', size: 8, weight: '700', color: '#10141B' })}
      {/* a red bar across ALL lanes downstream of the valve */}
      <Rect x={4} y={86} width={212} height={6} fill={colors.bad} />
      {label(109, 106, 'nothing downstream proceeds until CEC opens', { anchor: 'middle', size: 8, color: colors.bad, weight: '700' })}
      {[20, 92, 164].map((x) => <Rect key={x} x={x} y={116} width={40} height={10} fill="#4A3E20" rx={2} opacity={0.6} />)}
      {label(109, VB_H - 6, 'one gate, three chains, all blocked together', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** lead-time bar: a long ordered item gates a short later task */
function LeadTimeBar() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {label(6, 14, '0', { size: 8, color: colors.muted })}
      {label(206, 14, '18 mo', { size: 8, color: colors.muted })}
      <Line x1={6} y1={20} x2={214} y2={20} stroke={colors.border} strokeWidth={1} />
      <Rect x={6} y={30} width={200} height={16} fill={colors.warn} rx={3} />
      {label(106, 42, 'switchgear order → delivery', { anchor: 'middle', size: 8, color: '#10141B', weight: '700' })}
      <Line x1={206} y1={30} x2={206} y2={90} stroke={colors.bad} strokeWidth={1.5} strokeDasharray="3 2" />
      <Rect x={140} y={78} width={72} height={16} fill={colors.good} rx={3} />
      {label(176, 90, 'vertical power-up', { anchor: 'middle', size: 7.5, color: '#10141B', weight: '700' })}
      {label(106, 112, 'the short task cannot start until the long one lands', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      {label(106, 128, 'order it before the design is even final', { anchor: 'middle', size: 8, color: colors.accent, weight: '700' })}
    </G>
  );
}

/** rock-plug canal: cut dry behind a plug, breach the sea last */
function RockPlugCanal() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#4A3E20" />
      <Rect x={10} y={40} width={140} height={70} fill="#0A1420" />
      {label(80, 34, 'canal cut in the dry', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      <Rect x={150} y={40} width={22} height={70} fill="#8892A0" />
      {label(161, 128, 'rock plug', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
      <Rect x={172} y={0} width={48} height={150} fill="#1C77B0" opacity={0.85} />
      {label(196, 20, 'sea', { anchor: 'middle', size: 9, color: '#E8EEF6', weight: '700' })}
      <Path d="M150,50 L172,50 L172,100 L150,100 Z" fill="none" stroke={colors.bad} strokeWidth={2} strokeDasharray="4 3" />
      {label(161, 20, 'breach LAST', { anchor: 'middle', size: 7.5, color: colors.bad, weight: '700' })}
      {label(80, 122, 'dry rock cut is cheap; the plug holds the sea back', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
      {label(80, 136, 'until everything dry is done — then breach, once', { anchor: 'middle', size: 7.5, color: colors.accent, weight: '700' })}
    </G>
  );
}

/** longshore drift: sand moves along the shore; a groin starves the down-drift side */
function LongshoreDrift() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={44} fill="#1C77B0" opacity={0.85} />
      <Rect x={0} y={44} width={VB_W} height={VB_H - 44} fill="#D8C081" />
      {[20, 60, 100].map((x) => <Path key={x} d={`M${x},10 Q${x + 15},22 ${x},34`} stroke="#8FD3F7" strokeWidth={1.5} fill="none" />)}
      {/* the net longshore transport arrow, a slow "river" along the shore */}
      <Path d="M14,50 Q80,42 140,50 Q170,54 200,48" stroke={colors.accent} strokeWidth={2.5} fill="none" />
      <Polygon points="196,42 208,48 196,54" fill={colors.accent} />
      {label(106, 34, 'longshore transport — sand moving like a river', { anchor: 'middle', size: 7.5, color: '#E8EEF6' })}
      {/* the groin */}
      <Rect x={122} y={44} width={8} height={70} fill="#8892A0" />
      {/* sand piled up-drift, eroded scallop down-drift */}
      <Path d="M60,60 Q95,50 122,58 L122,80 Q95,72 60,80 Z" fill="#E8D9A0" />
      {label(88, 70, 'sand piles up', { anchor: 'middle', size: 7.5, color: '#4A3E20' })}
      <Path d="M130,58 Q150,66 130,80 Q160,90 190,80 L190,60 Q160,66 130,58 Z" fill="#B89A5A" opacity={0.7} />
      {label(165, 92, 'starved down-drift', { anchor: 'middle', size: 7.5, color: colors.bad, weight: '700' })}
      {label(106, VB_H - 4, 'a wall across the river feeds one beach, starves the next', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** production train: even pace keeps the line moving; one stall backs up everyone */
function ProductionTrain() {
  const cars = ['found.', 'block', 'roof', 'MEP', 'finish'];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {label(10, 14, 'even pace — the line rolls', { size: 8, color: colors.good, weight: '700' })}
      <Line x1={10} y1={20} x2={210} y2={20} stroke={colors.border} strokeWidth={1} />
      {cars.map((c, i) => (
        <G key={c}>
          <Rect x={14 + i * 40} y={26} width={32} height={20} fill={colors.good} rx={3} />
          {label(30 + i * 40, 39, c, { anchor: 'middle', size: 7, color: '#10141B' })}
        </G>
      ))}
      {label(10, 66, 'one crew stalls — everyone behind waits', { size: 8, color: colors.bad, weight: '700' })}
      <Line x1={10} y1={72} x2={210} y2={72} stroke={colors.border} strokeWidth={1} />
      <Rect x={14} y={78} width={32} height={20} fill={colors.good} rx={3} />
      {label(30, 91, cars[0], { anchor: 'middle', size: 7, color: '#10141B' })}
      <Rect x={50} y={78} width={20} height={20} fill={colors.bad} rx={3} />
      {label(60, 91, '⏸', { anchor: 'middle', size: 10 })}
      {[74, 96, 118, 140].map((x, i) => (
        <Rect key={x} x={x} y={78} width={18} height={20} fill="#5A4A28" rx={3} opacity={0.7} />
      ))}
      {label(120, 108, 'pile-up: houses 6–302 all wait on house 5', { anchor: 'middle', size: 7.5, color: colors.bad })}
      {label(106, 134, '302 houses is one train, not 302 projects', { anchor: 'middle', size: 8, color: colors.accent, weight: '700' })}
    </G>
  );
}

/** landed cost: the invoice price is only the first slice of the real cost */
function LandedCostStack() {
  const segs: [string, number, string][] = [
    ['FOB', 40, '#8FA3BC'],
    ['Freight', 22, '#37B0BC'],
    ['Duty', 20, '#C99A5B'],
    ['CPF', 12, '#A97BC9'],
    ['VAT', 26, colors.warn],
  ];
  let y = 20;
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {label(60, 14, 'invoice price', { anchor: 'middle', size: 7.5, color: colors.muted })}
      <Polygon points="55,16 65,16 60,22" fill={colors.muted} />
      {segs.map(([name, h, color], i) => {
        const seg = <Rect key={name} x={40} y={y} width={80} height={h} fill={color} />;
        const l = label(82, y + h / 2 + 3, `${name}`, { anchor: 'middle', size: 7.5, color: '#10141B', weight: '700' });
        y += h;
        return <G key={name}>{seg}{l}</G>;
      })}
      <Line x1={125} y1={20} x2={132} y2={20} stroke={colors.text} strokeWidth={1} />
      <Line x1={125} y1={140} x2={132} y2={140} stroke={colors.text} strokeWidth={1} />
      <Line x1={130} y1={20} x2={130} y2={140} stroke={colors.text} strokeWidth={1} />
      {label(136, 78, 'landed', { size: 8, color: colors.text, weight: '700' })}
      {label(136, 90, 'cost', { size: 8, color: colors.text, weight: '700' })}
      {label(106, VB_H - 4, 'the invoice is never the cost — everything stacks on top', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
    </G>
  );
}

/** contract certainty spectrum: form follows how well scope/quantity is known */
function ContractCertaintySpectrum() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {label(10, 20, 'scope fully known', { size: 7.5, color: colors.good })}
      {label(150, 20, 'scope unknown', { size: 7.5, color: colors.bad })}
      <Line x1={10} y1={30} x2={210} y2={30} stroke={colors.border} strokeWidth={2} />
      <Polygon points="205,26 215,30 205,34" fill={colors.border} />
      {[
        { x: 14, w: 54, label: 'Lump Sum', color: colors.good },
        { x: 82, w: 56, label: 'Unit Price', color: colors.warn },
        { x: 152, w: 58, label: 'Cost-Plus / DB', color: colors.bad },
      ].map((b) => (
        <G key={b.label}>
          <Rect x={b.x} y={50} width={b.w} height={30} fill={b.color} rx={4} />
          {label(b.x + b.w / 2, 68, b.label, { anchor: 'middle', size: 7.5, color: '#10141B', weight: '700' })}
        </G>
      ))}
      {label(106, 104, 'price what you can see — pick the form that matches', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      {label(106, 118, 'how much of the scope is actually known', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** cost of change: the same fix gets far more expensive the later you catch it */
function CostOfChangeCurve() {
  const bars: [string, number][] = [['Schematic\n1x', 20], ['Const. Docs\n3–5x', 60], ['In the field\n10x+', 110]];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Path d="M20,120 Q110,110 200,20" stroke={colors.bad} strokeWidth={2} fill="none" strokeDasharray="3 2" />
      {bars.map(([lbl, h], i) => {
        const x = 30 + i * 70;
        const lines = lbl.split('\n');
        return (
          <G key={lbl}>
            <Rect x={x} y={130 - h} width={40} height={h} fill={i === 0 ? colors.good : i === 1 ? colors.warn : colors.bad} />
            {lines.map((ln, li) => label(x + 20, 142 + li * 9, ln, { anchor: 'middle', size: 7.5, color: colors.text }))}
          </G>
        );
      })}
      {label(106, 16, 'the same fix, at three different moments', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** risk matrix: spend mitigation where probability × impact is highest */
function RiskMatrix() {
  const cells = ['#1E4632', '#2E7B4A', colors.warn, '#2E7B4A', colors.warn, colors.bad, colors.warn, colors.bad, '#8B1A1A'];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {label(10, 14, 'impact ↑', { size: 8, color: colors.muted })}
      {label(160, 138, 'likelihood →', { size: 8, color: colors.muted })}
      {cells.map((c, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return <Rect key={i} x={40 + col * 40} y={20 + (2 - row) * 30} width={38} height={28} fill={c} opacity={0.85} />;
      })}
      <Circle cx={40 + 2 * 40 + 19} cy={20 + 5} r={5} fill={colors.text} stroke="#10141B" strokeWidth={1} />
      {label(160, 14, 'hurricane on open dig', { size: 7, color: colors.text })}
      <Circle cx={40 + 19} cy={20 + 2 * 30 + 19} r={5} fill={colors.text} stroke="#10141B" strokeWidth={1} />
      {label(45, 128, 'minor nuisance', { size: 7, color: colors.text })}
      {label(106, VB_H - 4, 'spend mitigation money where the two multiply', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** ZOPA overlap: a deal only lives where both walk-away lines overlap */
function ZopaOverlap() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Line x1={20} y1={60} x2={140} y2={60} stroke={colors.teal} strokeWidth={3} />
      <Polygon points="136,55 148,60 136,65" fill={colors.teal} />
      {label(20, 50, "buyer's max", { size: 7.5, color: colors.teal })}
      <Line x1={200} y1={90} x2={80} y2={90} stroke={colors.accent} strokeWidth={3} />
      <Polygon points="84,85 72,90 84,95" fill={colors.accent} />
      {label(200, 106, "seller's min", { anchor: 'end', size: 7.5, color: colors.accent })}
      <Rect x={80} y={65} width={60} height={20} fill={colors.good} opacity={0.4} />
      {label(110, 78, 'ZOPA', { anchor: 'middle', size: 9, color: colors.good, weight: '700' })}
      {label(110, VB_H - 6, 'the deal lives in the overlap — know your walk-away', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** critical-path timeline: the invisible paper is the longest lead */
function CriticalPathTimeline() {
  const rows: [string, number, number, string][] = [
    ['Phase 0 paper (EIA→CEC, lease)', 10, 90, colors.bad],
    ['Enabling works', 60, 30, '#8FA3BC'],
    ['Marine excavation', 80, 40, '#1C77B0'],
    ['Horizontal waves', 100, 50, '#C99A5B'],
    ['Vertical waves', 130, 60, colors.teal],
    ['Marine completion (calm season)', 170, 30, colors.good],
  ];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {rows.map(([lbl, x, w, color], i) => (
        <G key={lbl}>
          <Rect x={x} y={8 + i * 22} width={w} height={12} fill={color} rx={2} opacity={i === 0 ? 0.5 : 1} strokeDasharray={i === 0 ? '3 2' : undefined} stroke={i === 0 ? colors.bad : undefined} strokeWidth={i === 0 ? 1.5 : 0} />
        </G>
      ))}
      {label(10, 6, 'longest, least visible lead:', { size: 6.5, color: colors.bad })}
      {label(106, VB_H - 4, 'the marine window is annual — miss it, lose a year', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
    </G>
  );
}

/** CMU grouted cell: grout carries the load, mortar just joins faces */
function CmuGroutedCell() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {/* left cell: grouted, rebar bonded, continuous load path */}
      <Rect x={20} y={20} width={70} height={100} fill="none" stroke="#8FA3BC" strokeWidth={3} />
      <Rect x={35} y={20} width={40} height={100} fill="#6B5A30" />
      <Line x1={55} y1={20} x2={55} y2={120} stroke="#C99A5B" strokeWidth={3} />
      <DownArrow x={55} y0={8} y1={22} color={colors.good} w={2} />
      <Line x1={55} y1={30} x2={55} y2={110} stroke={colors.good} strokeWidth={2} strokeDasharray="2 2" />
      {label(55, 134, 'grouted: load reaches ground', { anchor: 'middle', size: 7, color: colors.good })}
      {/* right cell: hollow, loose bar, broken path */}
      <Rect x={120} y={20} width={70} height={100} fill="none" stroke="#8FA3BC" strokeWidth={3} />
      <Line x1={155} y1={30} x2={153} y2={100} stroke="#8892A0" strokeWidth={2.5} />
      <DownArrow x={155} y0={8} y1={22} color={colors.bad} w={2} />
      <SvgText x={155} y={65} fontSize={12} fill={colors.bad} textAnchor="middle" fontWeight="700">✗</SvgText>
      {label(155, 134, 'ungrouted: steel does nothing', { anchor: 'middle', size: 7, color: colors.bad })}
    </G>
  );
}

/** shore release: strip on the strength data, never the calendar */
function ShoreRelease() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Rect x={20} y={40} width={140} height={10} fill="#8FA3BC" />
      {[30, 80, 130].map((x) => <Rect key={x} x={x} y={50} width={8} height={60} fill="#6B5A30" />)}
      {label(90, 30, 'suspended slab on shores', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
      <Circle cx={190} cy={60} r={16} fill="#8FA3BC" />
      <Line x1={182} y1={60} x2={198} y2={60} stroke="#10141B" strokeWidth={1.5} />
      {label(190, 90, 'cylinder break', { anchor: 'middle', size: 7, color: colors.text })}
      <SvgText x={30} y={122} fontSize={14} textAnchor="middle">📅</SvgText>
      <Line x1={20} y1={112} x2={40} y2={132} stroke={colors.bad} strokeWidth={2} />
      <Line x1={40} y1={112} x2={20} y2={132} stroke={colors.bad} strokeWidth={2} />
      {label(30, 140, 'not the calendar', { anchor: 'middle', size: 7, color: colors.bad })}
      {label(140, 128, 'release only when the DATA says strong enough', { anchor: 'middle', size: 7.5, color: colors.good, weight: '700' })}
    </G>
  );
}

/** drain slope: gravity needs a continuous downhill path or water sits and clogs */
function DrainSlope() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Path d="M10,30 L120,60" stroke="#8FA3BC" strokeWidth={6} fill="none" />
      <Circle cx={60} cy={45} r={3} fill="#4FC3F7" />
      <Circle cx={90} cy={53} r={3} fill="#4FC3F7" />
      <Polygon points="112,56 124,60 112,64" fill="#4FC3F7" />
      {label(65, 20, 'sloped — water flows out', { anchor: 'middle', size: 8, color: colors.good })}
      <Path d="M10,90 L60,84 L110,90 L160,86" stroke="#8FA3BC" strokeWidth={6} fill="none" />
      <Path d="M45,84 Q60,76 75,84" fill="#1C77B0" opacity={0.85} />
      <SvgText x={60} y={100} fontSize={11} textAnchor="middle" fill={colors.bad}>✗</SvgText>
      {label(85, 116, 'flat sag — water pools & clogs', { anchor: 'middle', size: 8, color: colors.bad })}
      {label(106, 138, 'slope is sacred — never trade it for a tight ceiling', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
    </G>
  );
}

/** pavement layers: a spring — each layer spreads the load, surface goes last */
function PavementLayers() {
  const layers: [string, number, string][] = [
    ['surface', 8, '#2A2E36'],
    ['binder', 10, '#3A3E46'],
    ['prime', 4, colors.warn],
    ['base', 20, '#8892A0'],
    ['subgrade', 24, '#5A4A28'],
  ];
  let y = 40;
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <DownArrow x={110} y0={10} y1={38} color={colors.warn} w={2.5} />
      {label(110, 8, 'wheel load', { anchor: 'middle', size: 8, color: colors.warn })}
      {layers.map(([n, h, c]) => {
        const seg = <Rect key={n} x={40} y={y} width={140} height={h} fill={c} />;
        const l = label(190, y + h / 2 + 3, n, { size: 7.5, color: colors.text });
        y += h;
        return <G key={n}>{seg}{l}</G>;
      })}
      <Path d="M110,40 L70,66 L150,66 Z" fill={colors.warn} opacity={0.15} />
      <Path d="M70,66 L40,86 L180,86 L150,66 Z" fill={colors.warn} opacity={0.1} />
      {label(106, VB_H - 4, 'each layer spreads the load wider — surface is last, always', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
    </G>
  );
}

/** datum mismatch: the same point, read from two different zeros */
function DatumMismatch() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Line x1={50} y1={10} x2={50} y2={130} stroke="#8FA3BC" strokeWidth={2} />
      {[10, 40, 70, 100, 130].map((y, i) => <Line key={y} x1={44} y1={y} x2={56} y2={y} stroke="#8FA3BC" strokeWidth={1.5} />)}
      {label(30, 134, 'land datum 0', { anchor: 'middle', size: 7, color: colors.teal })}
      <Line x1={170} y1={30} x2={170} y2={150} stroke="#8FA3BC" strokeWidth={2} />
      {[30, 60, 90, 120, 150].map((y) => <Line key={y} x1={164} y1={y} x2={176} y2={y} stroke="#8FA3BC" strokeWidth={1.5} />)}
      {label(190, 154, 'marine datum 0', { anchor: 'middle', size: 7, color: colors.accent })}
      <Circle cx={110} cy={70} r={5} fill={colors.warn} />
      <Line x1={110} y1={70} x2={50} y2={70} stroke={colors.teal} strokeWidth={1.5} strokeDasharray="3 2" />
      <Line x1={110} y1={70} x2={170} y2={90} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="3 2" />
      {label(110, 60, 'one real point', { anchor: 'middle', size: 7.5, color: colors.warn, weight: '700' })}
      {label(106, 20, 'same point, two different "zeros" — error multiplies', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
    </G>
  );
}

/** lateral load path: wind travels wall → diaphragm → shear wall → ground */
function LateralLoadPath() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {[30, 46, 62].map((y) => (
        <G key={y}>
          <Line x1={4} y1={y} x2={40} y2={y} stroke={colors.warn} strokeWidth={2} />
          <Polygon points={`36,${y - 4} 46,${y} 36,${y + 4}`} fill={colors.warn} />
        </G>
      ))}
      {label(6, 20, 'wind', { size: 8, color: colors.warn })}
      <Rect x={46} y={20} width={90} height={60} fill="#6C7BD6" opacity={0.85} />
      <Rect x={46} y={78} width={90} height={8} fill="#8FA3BC" />
      {label(90, 96, 'diaphragm', { anchor: 'middle', size: 7, color: colors.text })}
      <Rect x={100} y={86} width={10} height={40} fill={colors.good} />
      {label(105, 132, 'shear wall', { anchor: 'middle', size: 7, color: colors.good })}
      <Rect x={80} y={126} width={50} height={8} fill="#4A3E20" />
      {label(180, 30, '75 mph = 1x', { size: 7.5, color: colors.muted })}
      {label(180, 42, '150 mph = 4x', { size: 7.5, color: colors.bad, weight: '700' })}
      {label(180, 54, '(force ∝ speed²)', { size: 6.5, color: colors.muted })}
    </G>
  );
}

/** control joint: you choose where it cracks, or it chooses for you */
function ControlJoint() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Rect x={10} y={20} width={200} height={30} fill="#8FA3BC" />
      <Rect x={106} y={20} width={4} height={30} fill="#10141B" />
      <Path d="M108,20 L106,50" stroke={colors.good} strokeWidth={1.5} />
      {label(106, 62, 'joint cut here → crack goes here (planned)', { anchor: 'middle', size: 7.5, color: colors.good })}
      <Rect x={10} y={90} width={200} height={30} fill="#8FA3BC" />
      <Path d="M60,90 L75,105 L55,112 L90,120" stroke="#0A1420" strokeWidth={1.5} fill="none" />
      {label(106, 132, 'no joint → restrained → cracks wherever IT chooses', { anchor: 'middle', size: 7.5, color: colors.bad })}
    </G>
  );
}

/** crack alphabet: the pattern names the author */
function CrackAlphabet() {
  const items: [number, number, string, string][] = [
    [30, 30, 'map/craze pattern', 'shrinkage'],
    [140, 30, 'diagonal at corner', 'settlement'],
    [30, 95, 'horizontal + rust stain', 'corrosion'],
    [140, 95, 'vertical, mid-span', 'overload'],
  ];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Rect x={4} y={4} width={104} height={58} fill="#8FA3BC" />
      {[[20, 20], [40, 35], [60, 15], [80, 40], [30, 50]].map(([x, y], i) => <Path key={i} d={`M${x},${y} l6,4 l-4,5`} stroke="#0A1420" strokeWidth={1} fill="none" />)}
      <Rect x={112} y={4} width={104} height={58} fill="#8FA3BC" />
      <Path d="M210,10 L170,55" stroke="#0A1420" strokeWidth={1.5} fill="none" />
      <Rect x={4} y={70} width={104} height={58} fill="#8FA3BC" />
      <Line x1={10} y1={95} x2={100} y2={97} stroke="#8B1A1A" strokeWidth={2} />
      <Rect x={112} y={70} width={104} height={58} fill="#8FA3BC" />
      <Line x1={164} y1={75} x2={164} y2={122} stroke="#0A1420" strokeWidth={2} />
      {items.map(([x, y, top, bottom]) => (
        <G key={top}>
          {label(x, y + 66, top, { size: 6.5, color: colors.text })}
          {label(x, y + 76, bottom, { size: 7.5, color: colors.accent, weight: '700' })}
        </G>
      ))}
      {label(106, 146, 'direction + location first — the pattern names the author', { anchor: 'middle', size: 7, color: '#CBD5E6' })}
    </G>
  );
}

/** fire + egress: compartments and counted exits buy minutes to flashover */
function FireCompartmentEgress() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Rect x={10} y={10} width={200} height={90} fill="none" stroke="#8FA3BC" strokeWidth={2} />
      <Line x1={80} y1={10} x2={80} y2={100} stroke={colors.bad} strokeWidth={4} />
      <Line x1={150} y1={10} x2={150} y2={100} stroke={colors.bad} strokeWidth={4} />
      {label(45, 60, 'compartment', { anchor: 'middle', size: 7, color: colors.text })}
      <SvgText x={45} y={50} fontSize={14} textAnchor="middle">🔥</SvgText>
      <Line x1={90} y1={60} x2={140} y2={60} stroke={colors.good} strokeWidth={2} />
      <Polygon points="136,55 148,60 136,65" fill={colors.good} />
      <Rect x={160} y={40} width={10} height={40} fill={colors.good} />
      {label(165, 108, 'exit 1', { anchor: 'middle', size: 7, color: colors.good })}
      <Line x1={10} y1={40} x2={78} y2={40} stroke={colors.good} strokeWidth={2} />
      <Rect x={0} y={20} width={10} height={40} fill={colors.good} />
      {label(20, 108, 'exit 2', { anchor: 'middle', size: 7, color: colors.good })}
      {label(106, 122, 'detect → contain (walls) → evacuate (2 counted exits)', { anchor: 'middle', size: 7.5, color: '#CBD5E6' })}
      {label(106, 136, 'every rule buys minutes before flashover', { anchor: 'middle', size: 8, color: colors.warn, weight: '700' })}
    </G>
  );
}

/** roof penetration: a membrane is only as waterproof as its worst hole */
function RoofPenetration() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {[10, 24, 38].map((y) => (
        <G key={y}>
          <Line x1={4} y1={y} x2={30} y2={y + 14} stroke="#8FD3F7" strokeWidth={1.5} />
        </G>
      ))}
      {label(4, 4, 'wind-driven rain', { size: 7, color: '#8FD3F7' })}
      <Rect x={20} y={70} width={190} height={16} fill="#8FA3BC" />
      <Rect x={20} y={64} width={190} height={4} fill="#0A1420" />
      {label(24, 62, 'membrane', { size: 7, color: colors.muted })}
      {/* flashed penetration: sealed boot, water sheds */}
      <Rect x={60} y={40} width={10} height={30} fill="#6B5A30" />
      <Polygon points="52,64 78,64 70,50 60,50" fill={colors.good} opacity={0.8} />
      {label(65, 34, 'flashed', { anchor: 'middle', size: 7, color: colors.good, weight: '700' })}
      {label(65, 118, 'water sheds', { anchor: 'middle', size: 7, color: colors.good })}
      {/* gapped penetration: water enters, spreads sideways in wet insulation */}
      <Rect x={150} y={40} width={10} height={30} fill="#6B5A30" />
      <Circle cx={150} cy={62} r={2} fill="#4FC3F7" />
      <Circle cx={148} cy={70} r={2} fill="#4FC3F7" />
      <Rect x={110} y={86} width={90} height={16} fill="#1C77B0" opacity={0.35} />
      {label(155, 34, 'gap', { anchor: 'middle', size: 7, color: colors.bad, weight: '700' })}
      <Line x1={130} y1={94} x2={205} y2={100} stroke={colors.bad} strokeWidth={1.5} strokeDasharray="2 2" />
      {label(155, 118, 'spreads, drips far away', { anchor: 'middle', size: 7, color: colors.bad })}
      {label(106, 138, '99% waterproof at one hole = 0% waterproof there', { anchor: 'middle', size: 8, color: '#CBD5E6' })}
    </G>
  );
}

/** positive vs negative side: fight water on water's own side of the wall */
function PositiveNegative() {
  return (
    <G>
      <Rect x={0} y={0} width={90} height={VB_H} fill="#1C77B0" opacity={0.5} />
      {[20, 40, 60, 80, 100].map((y) => <Line key={y} x1={4} y1={y} x2={86} y2={y} stroke="#8FD3F7" strokeWidth={1} opacity={0.5} />)}
      {label(4, 12, 'groundwater (sea level)', { size: 7, color: '#8FD3F7' })}
      <Rect x={90} y={10} width={16} height={VB_H - 30} fill="#8FA3BC" />
      <Rect x={106} y={10} width={110} height={VB_H - 30} fill="#182A42" />
      {label(150, 12, 'dry side (pit)', { size: 7, color: colors.muted })}
      {/* positive side membrane: pressed on */}
      <Line x1={90} y1={20} x2={90} y2={110} stroke={colors.good} strokeWidth={3} />
      {[30, 50, 70, 90].map((y) => <Line key={y} x1={82} y1={y} x2={89} y2={y} stroke={colors.good} strokeWidth={1.5} />)}
      {label(60, 128, 'positive side: pressure seals it', { anchor: 'middle', size: 7, color: colors.good, weight: '700' })}
      {/* negative side coating: peeled off, wall stays wet */}
      <Line x1={112} y1={20} x2={112} y2={110} stroke={colors.bad} strokeWidth={2.5} strokeDasharray="4 3" />
      <Path d="M112,20 Q120,26 113,32" stroke={colors.bad} strokeWidth={1.5} fill="none" />
      {[35, 55, 75].map((y) => <Circle key={y} cx={98} cy={y} r={1.8} fill="#4FC3F7" />)}
      {label(150, 128, 'negative side: pressure peels it, wall stays wet', { anchor: 'middle', size: 7, color: colors.bad })}
    </G>
  );
}

/** capillary rise: block walls drink uphill with no break */
function CapillaryRise() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {[
        { x0: 4, label: 'NO BREAK', bad: true },
        { x0: 114, label: 'WITH BREAK', bad: false },
      ].map((panel) => (
        <G key={panel.x0}>
          <Rect x={panel.x0} y={110} width={100} height={20} fill="#4A3E20" />
          {[10, 30, 50, 70, 90].map((dx) => <Circle key={dx} cx={panel.x0 + dx} cy={118} r={1.5} fill="#0A1420" opacity={0.4} />)}
          {[0, 1, 2, 3, 4].map((i) => (
            <Rect key={i} x={panel.x0 + 5} y={94 - i * 18} width={90} height={16} fill="#8FA3BC" stroke="#5A6270" strokeWidth={0.5} />
          ))}
          {panel.bad ? (
            <>
              {[0, 1, 2].map((i) => (
                <Rect key={i} x={panel.x0 + 5} y={94 - i * 18} width={90} height={16} fill="#1C77B0" opacity={0.3} />
              ))}
              <UpArrow x={panel.x0 + 50} y0={108} y1={44} color="#4FC3F7" w={1.5} />
              {label(panel.x0 + 50, 10, 'damp, blisters, salt stains', { anchor: 'middle', size: 6.5, color: colors.bad })}
            </>
          ) : (
            <>
              <Line x1={panel.x0} y1={110} x2={panel.x0 + 100} y2={110} stroke="#0A1420" strokeWidth={3} />
              {label(panel.x0 + 50, 106, 'damp-proof course', { anchor: 'middle', size: 6, color: colors.good })}
              <UpArrow x={panel.x0 + 50} y0={108} y1={112} color={colors.good} w={1.5} />
              {label(panel.x0 + 50, 10, 'clean above the break', { anchor: 'middle', size: 6.5, color: colors.good })}
            </>
          )}
          {label(panel.x0 + 50, 138, panel.label, { anchor: 'middle', size: 8, weight: '700', color: panel.bad ? colors.bad : colors.good })}
        </G>
      ))}
    </G>
  );
}

/** under-slab sandwich: gravel breaks the wick, poly stops the vapor */
function UnderslabSandwich() {
  const layers: [string, number, string][] = [
    ['flooring', 6, '#8FA3BC'],
    ['slab', 20, '#9AA4B2'],
  ];
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      <Line x1={10} y1={120} x2={210} y2={120} stroke="#4FC3F7" strokeWidth={1.5} strokeDasharray="4 2" />
      {label(12, 130, 'water table ≈ sea level', { size: 7, color: '#8FD3F7' })}
      <Rect x={10} y={100} width={200} height={20} fill="#4A3E20" />
      {[30, 70, 110, 150, 190].map((x) => <Circle key={x} cx={x} cy={95} r={3} fill="#8892A0" />)}
      {label(190, 84, 'gravel — capillary break', { anchor: 'end', size: 7, color: colors.text })}
      <Line x1={10} y1={82} x2={210} y2={82} stroke={colors.warn} strokeWidth={3} />
      {label(12, 76, 'poly sheet — vapor barrier', { size: 7, color: colors.warn })}
      {(() => {
        let y = 82;
        return layers.map(([n, h, c]) => {
          y -= h;
          return (
            <G key={n}>
              <Rect x={10} y={y} width={200} height={h} fill={c} />
              {label(190, y + h / 2 + 3, n, { anchor: 'end', size: 7, color: '#10141B' })}
            </G>
          );
        });
      })()}
      {[40, 100, 160].map((x) => <Line key={x} x1={x} y1={112} x2={x} y2={95} stroke="#4FC3F7" strokeWidth={1.5} />)}
      {[50, 110, 170].map((x) => (
        <Line key={x} x1={x} y1={98} x2={x} y2={84} stroke={colors.warn} strokeWidth={1} strokeDasharray="1 2" />
      ))}
      {label(106, VB_H - 6, 'skip either layer and the ground becomes the flooring\'s enemy', { anchor: 'middle', size: 7, color: '#CBD5E6' })}
    </G>
  );
}

/** vapor drive flips direction with climate — the tropical inversion */
function VaporFlip() {
  return (
    <G>
      <Rect x={0} y={0} width={110} height={VB_H} fill="#182A42" />
      {label(55, 10, 'COLD CLIMATE', { anchor: 'middle', size: 7.5, weight: '700', color: colors.muted })}
      {label(8, 24, '-5°C dry', { size: 7, color: '#8FD3F7' })}
      {label(78, 24, '21°C humid', { size: 7, color: colors.warn })}
      <Rect x={48} y={34} width={12} height={80} fill="#8FA3BC" />
      <Line x1={54} y1={34} x2={54} y2={114} stroke={colors.text} strokeWidth={2} strokeDasharray="3 2" />
      <Polygon points="60,68 70,74 60,80" fill={colors.warn} />
      <Line x1={30} y1={74} x2={60} y2={74} stroke={colors.warn} strokeWidth={2} />
      {label(20, 130, 'barrier warm side ✓', { size: 6.5, color: colors.good })}

      <Rect x={110} y={0} width={110} height={VB_H} fill="#1F3450" />
      {label(165, 10, 'BAHAMAS', { anchor: 'middle', size: 7.5, weight: '700', color: colors.accent })}
      {label(118, 24, '32°C, 85% RH', { size: 7, color: colors.warn })}
      {label(188, 24, '23°C AC', { size: 7, color: '#8FD3F7' })}
      <Rect x={158} y={34} width={12} height={50} fill="#8FA3BC" />
      <Line x1={164} y1={34} x2={164} y2={84} stroke={colors.text} strokeWidth={2} strokeDasharray="3 2" />
      <Polygon points="158,54 148,60 158,66" fill={colors.bad} />
      <Line x1={148} y1={60} x2={170} y2={60} stroke={colors.bad} strokeWidth={2} />
      {[150, 156, 162].map((x) => <Circle key={x} cx={x} cy={78} r={1.8} fill="#4FC3F7" />)}
      {label(164, 96, 'rains inside the wall ✗', { anchor: 'middle', size: 6.5, color: colors.bad })}
      <Line x1={164} y1={110} x2={164} y2={140} stroke={colors.good} strokeWidth={2} strokeDasharray="3 2" />
      {label(164, 148, 'move barrier outside ✓', { anchor: 'middle', size: 6.5, color: colors.good })}
    </G>
  );
}

/** cold sweats: dew point and why AC sizing is really about water */
function ColdSweats() {
  return (
    <G>
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#182A42" />
      {label(4, 10, 'room air 26°C, 65% RH → dew point 19°C', { size: 7, color: '#CBD5E6' })}
      <Circle cx={50} cy={40} r={12} fill="#8FA3BC" />
      {label(50, 43, '13°C', { anchor: 'middle', size: 7, color: '#10141B', weight: '700' })}
      {[42, 50, 58].map((x) => <Circle key={x} cx={x} cy={56} r={2} fill="#4FC3F7" />)}
      <Rect x={20} y={64} width={60} height={8} fill="#8892A0" opacity={0.6} />
      {label(50, 80, 'stained ceiling tile', { anchor: 'middle', size: 6.5, color: colors.bad })}
      <Circle cx={150} cy={40} r={16} fill="none" stroke="#8FA3BC" strokeWidth={4} />
      <Circle cx={150} cy={40} r={10} fill="#8FA3BC" />
      {label(150, 80, 'insulated — stays dry', { anchor: 'middle', size: 6.5, color: colors.good })}
      {/* runtime bars */}
      <Rect x={10} y={104} width={12} height={10} fill={colors.warn} />
      <Rect x={30} y={104} width={8} height={10} fill="#1F3450" />
      <Rect x={44} y={104} width={12} height={10} fill={colors.warn} />
      <Rect x={64} y={104} width={8} height={10} fill="#1F3450" />
      {label(90, 111, 'oversized: short cycles, RH stays 70%', { size: 6.5, color: colors.bad })}
      <Rect x={10} y={126} width={90} height={10} fill={colors.good} />
      {label(106, 133, 'right-sized: runs long, RH falls to 50%', { size: 6.5, color: colors.good })}
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
  'water-table': WaterTable,
  'permit-gate': PermitGate,
  'lead-time-bar': LeadTimeBar,
  'rock-plug-canal': RockPlugCanal,
  'longshore-drift': LongshoreDrift,
  'production-train': ProductionTrain,
  'landed-cost-stack': LandedCostStack,
  'contract-certainty-spectrum': ContractCertaintySpectrum,
  'cost-of-change-curve': CostOfChangeCurve,
  'risk-matrix': RiskMatrix,
  'zopa-overlap': ZopaOverlap,
  'critical-path-timeline': CriticalPathTimeline,
  'cmu-grouted-cell': CmuGroutedCell,
  'shore-release': ShoreRelease,
  'drain-slope': DrainSlope,
  'pavement-layers': PavementLayers,
  'datum-mismatch': DatumMismatch,
  'lateral-load-path': LateralLoadPath,
  'control-joint': ControlJoint,
  'crack-alphabet': CrackAlphabet,
  'fire-compartment-egress': FireCompartmentEgress,
  'diag-roof-penetration': RoofPenetration,
  'diag-positive-negative': PositiveNegative,
  'diag-capillary-rise': CapillaryRise,
  'diag-underslab-sandwich': UnderslabSandwich,
  'diag-vapor-flip': VaporFlip,
  'diag-cold-sweats': ColdSweats,
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
