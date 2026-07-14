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

const DIAGRAMS: Record<string, () => React.ReactElement> = {
  'hydrostatic-uplift': HydrostaticUplift,
  'load-path': LoadPath,
  'tension-location': TensionLocation,
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
