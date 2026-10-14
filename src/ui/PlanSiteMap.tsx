import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { PLAN_ASPECT, planZones, SiteZone, ZoneCategory } from '../content/siteMap';
import { DISTRICTS, DistrictProgress, districtById, districtOfZone, districtPercent, stageAt } from '../engine/districts';
import { levelForXp } from '../engine/progress';
import { tapFeedback } from './feedback';
import { colors, mapColors as M } from './theme';

/**
 * The live site plan (design handoff "SiteMap"): the real master-plan parcels,
 * north up, drawn as a drafting sheet. Each parcel's state reads from its work
 * front's live progress and is shown by pattern as well as colour (raw dotted,
 * under way ochre stripes, built solid slate). A 2.5D view tilts the sheet and
 * extrudes parcels by their real heights; three zoom bands reveal more detail.
 *
 * Pan/pinch use core PanResponder (pure JS, guaranteed in Expo Go and on the
 * web build) and drive the SVG viewBox directly.
 */

const W = 100; // plan units across
const H = W * PLAN_ASPECT; // plan units down (north → south)
const MAP_HEIGHT = 350;
const MAX_ZOOM = 4;

type Layer = 'build' | 'risk' | 'drain';
type State = 'raw' | 'work' | 'built';

/** full-built extrusion per category, in plan units (≈ design heights / 6) */
const HEIGHT: Record<ZoneCategory, number> = {
  road: 0,
  retail: 1.35,
  senior: 3.3,
  infra: 0.8,
  lots: 1.3,
  green: 0,
  amenity: 0.5,
  estate: 1.4,
  marina: 0,
  condo: 0.57,
  clubhouse: 2.4,
  beach: 0,
};

const FLAT_FILL: Partial<Record<ZoneCategory, string>> = { road: M.road, marina: M.water, beach: M.sand, green: M.green };

function planPoly(z: SiteZone): { x: number; y: number }[] {
  const pts = z.footprint ?? [
    { x: z.x, y: z.y },
    { x: z.x + z.w, y: z.y },
    { x: z.x + z.w, y: z.y + z.h },
    { x: z.x, y: z.y + z.h },
  ];
  return pts.map((p) => ({ x: p.x, y: p.y * PLAN_ASPECT }));
}

function centroid(pts: { x: number; y: number }[]) {
  return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
}

const d = (pts: { x: number; y: number }[], dy = 0) =>
  'M' + pts.map((p) => `${p.x.toFixed(2)},${(p.y - dy).toFixed(2)}`).join('L') + 'Z';

function storeys(z: SiteZone): number {
  const m = z.name.match(/\((\d+)\s*st\)/);
  return m ? Number(m[1]) : 3;
}

/** a parcel's state, overall progress (0..1) and how far its structure has risen (0..1) */
function parcelState(z: SiteZone, districts: Record<string, DistrictProgress>) {
  const dId = districtOfZone(z.id);
  const dist = dId ? districtById(dId) : undefined;
  if (!dist) return { state: 'raw' as State, prog: 0, rise: 0, stage: 'Raw land', next: undefined as string | undefined, dist };
  const pos = districts[dist.id]?.pos ?? 0;
  const last = dist.stages.length - 1;
  const rise = Math.max(0, Math.min(1, (pos - dist.structureStage) / Math.max(1, last - dist.structureStage)));
  const state: State = pos < 1 ? 'raw' : pos >= last - 0.001 ? 'built' : 'work';
  const idx = Math.min(last, Math.floor(pos));
  return { state, prog: pos / last, rise, stage: stageAt(dist, pos).label, next: dist.stages[idx + 1]?.label, dist };
}

function isWet(districts: Record<string, DistrictProgress>) {
  const m = districtById('marine');
  if (!m) return false;
  const i = m.stages.findIndex((s) => s.key === 'flooded');
  return (districts.marine?.pos ?? 0) >= i;
}

function tint(hour: number): { color: string; op: number; label: string } {
  if (hour >= 5 && hour < 7) return { color: '#E58B63', op: 0.18, label: 'Dawn' };
  if (hour >= 17 && hour < 19) return { color: '#6B5B9A', op: 0.22, label: 'Dusk' };
  if (hour >= 19 || hour < 5) return { color: '#1A2A55', op: 0.32, label: 'Night' };
  return { color: '#000', op: 0, label: 'Day' };
}

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function PlanSiteMap({
  districts,
  capital,
  totalXp,
}: {
  districts: Record<string, DistrictProgress>;
  capital: number;
  totalXp: number;
}) {
  const [width, setWidth] = useState(320);
  const [layer, setLayer] = useState<Layer>('build');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: W / 2, y: H / 2 });
  const zoomRef = useRef(1);
  const centerRef = useRef(center);
  zoomRef.current = zoom;
  centerRef.current = center;

  // 2D ↔ 3D: tween the tilt so the sheet leans back and parcels rise
  const [tilt, setTilt] = useState(0);
  const tiltAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = tiltAnim.addListener(({ value }) => setTilt(value));
    return () => tiltAnim.removeListener(id);
  }, [tiltAnim]);
  const toggle3d = () => {
    tapFeedback();
    Animated.timing(tiltAnim, { toValue: tilt > 0.5 ? 0 : 1, duration: 550, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  };

  // one looping clock drives every scripted motion (cranes, boats, drain flow)
  const loop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(loop, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false }));
    a.start();
    return () => a.stop();
  }, [loop]);
  const swing = loop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-1.6, 1.6, -1.6] });
  const bob = loop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -0.35, 0, -0.35, 0] });
  const flow = loop.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  const parcels = useMemo(
    () =>
      planZones.map((z) => {
        const pts = planPoly(z);
        const s = parcelState(z, districts);
        const full = z.category === 'condo' ? HEIGHT.condo * storeys(z) : HEIGHT[z.category];
        const eff = s.state === 'raw' ? 0 : s.state === 'built' ? 1 : 0.18 + 0.7 * s.rise;
        return { z, pts, c: centroid(pts), maxY: Math.max(...pts.map((p) => p.y)), ...s, h: full * eff };
      }),
    [districts]
  );
  const wet = isWet(districts);
  const ground = useMemo(() => {
    const all = parcels.flatMap((p) => p.pts);
    const x0 = Math.min(...all.map((p) => p.x)) - 1.5;
    const x1 = Math.max(...all.map((p) => p.x)) + 1.5;
    const y0 = Math.min(...all.map((p) => p.y)) - 1.5;
    const y1 = Math.max(...all.map((p) => p.y)) + 1.5;
    return [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ];
  }, [parcels]);

  const builtPct = Math.round(DISTRICTS.reduce((a, dd) => a + districtPercent(dd, districts[dd.id]?.pos ?? 0), 0) / DISTRICTS.length);
  const lvl = levelForXp(totalXp);
  const now = new Date();
  const tod = tint(now.getHours());
  const band = zoom < 1.4 ? 0 : zoom < 3 ? 1 : 2;

  // camera: viewBox from zoom + centre, clamped to the sheet
  const sq = 1 - 0.38 * tilt; // vertical squash of the tilted sheet
  const fullH = H * sq;
  // zoom 1 fits the whole sheet in the card; zooming narrows from there
  const fitW = Math.max(W, (fullH * width) / MAP_HEIGHT);
  const vbW = fitW / zoom;
  const vbH = (vbW * MAP_HEIGHT) / width;
  const cx = vbW >= W ? W / 2 : Math.max(vbW / 2, Math.min(W - vbW / 2, center.x));
  const cy = vbH >= fullH ? fullH / 2 : Math.max(vbH / 2, Math.min(fullH - vbH / 2, center.y * sq));
  const vb = `${(cx - vbW / 2).toFixed(2)} ${(cy - vbH / 2).toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`;
  const k = Math.min(1.6, vbW / W); // keeps strokes/badges a near-constant on-screen size as you zoom

  const setZoomClamped = (z: number) => setZoom(Math.max(1, Math.min(MAX_ZOOM, z)));

  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const panStart = useRef(center);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => g.numberActiveTouches === 2 || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        pinch.current = null;
        panStart.current = centerRef.current;
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t.length === 2) {
          const dist = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
          if (!pinch.current) pinch.current = { dist, zoom: zoomRef.current };
          else setZoom(Math.max(1, Math.min(MAX_ZOOM, (dist / pinch.current.dist) * pinch.current.zoom)));
        } else {
          const unitsPerPx = vbWRef.current / widthRef.current;
          setCenter({ x: panStart.current.x - g.dx * unitsPerPx, y: panStart.current.y - g.dy * unitsPerPx });
        }
      },
      onPanResponderRelease: () => {
        pinch.current = null;
      },
    })
  ).current;
  const widthRef = useRef(width);
  widthRef.current = width;
  const vbWRef = useRef(vbW);
  vbWRef.current = vbW;

  const sel = parcels.find((p) => p.z.id === selected);
  const ordered = [...parcels].sort((a, b) => a.maxY - b.maxY);
  const cranes = parcels.filter((p) => p.state === 'work' && p.h > 0.2).slice(0, 5);
  const marina = parcels.find((p) => p.z.id === 'marina-basin');
  const water = parcels.filter((p) => ['marina-basin', 'lakes-amenity-core', 'canal-estates'].includes(p.z.id));

  return (
    <View style={styles.wrap}>
      {/* HUD pills */}
      <View style={styles.pills}>
        <Pill text={`B$ ${capital.toLocaleString()}`} />
        <Pill text={`${builtPct}% built`} />
        <Pill text={`${tod.label} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`} />
        <View style={{ flex: 1 }} />
        <Svg width={36} height={36}>
          <Circle cx={18} cy={18} r={14} stroke={M.rawDot} strokeOpacity={0.5} strokeWidth={4} fill="none" />
          <Circle
            cx={18}
            cy={18}
            r={14}
            stroke={colors.accent}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(2 * Math.PI * 14 * lvl.into) / Math.max(1, lvl.needed)} 999`}
            transform="rotate(-90 18 18)"
          />
          <SvgText x={18} y={21.5} fontSize={10} fontWeight="700" textAnchor="middle" fill={colors.text}>
            {`L${lvl.level}`}
          </SvgText>
        </Svg>
      </View>

      <View style={styles.map} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
        <Svg width={width} height={MAP_HEIGHT} viewBox={vb}>
          <Defs>
            <Pattern id="raw" patternUnits="userSpaceOnUse" width={1.6} height={1.6}>
              <Rect width={1.6} height={1.6} fill={M.raw} />
              <Circle cx={0.8} cy={0.8} r={0.18} fill={M.rawDot} />
            </Pattern>
            <Pattern id="work" patternUnits="userSpaceOnUse" width={1.4} height={1.4}>
              <Rect width={1.4} height={1.4} fill={M.work} />
              <Path d="M0,1.4L1.4,0M-0.35,0.35L0.35,-0.35M1.05,1.75L1.75,1.05" stroke={M.workStripe} strokeWidth={0.28} />
            </Pattern>
            <RadialGradient id="riskRust" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={M.rust} stopOpacity={0.55} />
              <Stop offset="1" stopColor={M.rust} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="riskOchre" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={-50} y={-50} width={W + 100} height={H + 100} fill={M.bg} />

          <G transform={`matrix(1 0 0 ${sq} 0 0)`}>
            <Path d={d(ground)} fill={M.ground} stroke={M.rawDot} strokeWidth={0.25 * k} />

            {ordered.map((p) => {
              const flat = FLAT_FILL[p.z.category];
              const lift = (p.h * tilt) / sq;
              const isSel = p.z.id === selected;
              const fill =
                p.z.category === 'marina' && p.z.id === 'marina-basin'
                  ? wet
                    ? M.water
                    : p.state === 'raw'
                      ? 'url(#raw)'
                      : 'url(#work)'
                  : p.state === 'raw'
                    ? 'url(#raw)'
                    : p.state === 'work'
                      ? flat && p.h === 0
                        ? 'url(#work)'
                        : p.rise > 0
                          ? M.work
                          : 'url(#work)'
                      : flat ?? M.roof;
              const walls: string[] = [];
              if (lift > 0.01) {
                for (let i = 0; i < p.pts.length; i++) {
                  const a = p.pts[i];
                  const b = p.pts[(i + 1) % p.pts.length];
                  if ((a.y + b.y) / 2 <= p.c.y) continue; // only south-facing (toward the viewer) walls show
                  walls.push(`M${a.x},${a.y}L${b.x},${b.y}L${b.x},${b.y - lift}L${a.x},${a.y - lift}Z`);
                }
              }
              return (
                <G key={p.z.id} onPress={() => { tapFeedback(); setSelected(p.z.id); }}>
                  {lift > 0.01 ? (
                    <Path d={d(p.pts.map((q) => ({ x: q.x + lift * 0.5, y: q.y + lift * 0.18 })))} fill={M.ink} opacity={0.14} />
                  ) : null}
                  {walls.length ? <Path d={walls.join('')} fill={p.state === 'built' ? M.wall : '#B99A4E'} /> : null}
                  <Path
                    d={d(p.pts, lift)}
                    fill={fill}
                    stroke={isSel ? M.selected : p.state === 'raw' ? M.rawDot : M.wall}
                    strokeWidth={(isSel ? 0.7 : 0.22) * k}
                    strokeDasharray={p.state === 'raw' && !isSel ? `${0.8 * k} ${0.6 * k}` : undefined}
                  />
                  {band === 2 && (p.z.category === 'lots' || p.z.category === 'estate') ? (
                    <LotGrid pts={p.pts} lift={lift} built={p.state !== 'raw' ? p.rise : 0} k={k} />
                  ) : null}
                </G>
              );
            })}

            {/* layers */}
            {layer === 'risk'
              ? parcels
                  .filter((p) => ['marina-basin', 'canal-estates', 'beach-groins', 'lakes-amenity-core'].includes(p.z.id))
                  .map((p) => (
                    <Circle
                      key={`risk-${p.z.id}`}
                      cx={p.c.x}
                      cy={p.c.y}
                      r={p.z.id === 'lakes-amenity-core' ? 9 : 12}
                      fill={p.z.id === 'lakes-amenity-core' ? 'url(#riskOchre)' : 'url(#riskRust)'}
                    />
                  ))
              : null}
            {layer === 'drain' && water.length
              ? parcels
                  .filter((p) => p.z.category === 'lots' || p.z.category === 'estate')
                  .map((p) => {
                    const t = water.reduce((best, w) => (Math.hypot(w.c.x - p.c.x, w.c.y - p.c.y) < Math.hypot(best.c.x - p.c.x, best.c.y - p.c.y) ? w : best), water[0]);
                    return (
                      <AnimatedPath
                        key={`drain-${p.z.id}`}
                        d={`M${p.c.x},${p.c.y}L${t.c.x},${t.c.y}`}
                        stroke={colors.teal}
                        strokeWidth={0.6 * k}
                        strokeDasharray={`${2 * k} ${1.2 * k}`}
                        strokeDashoffset={flow}
                      />
                    );
                  })
              : null}

            {/* scripted motion: cranes swing over rising structures; boats bob once the marina is wet */}
            {band >= 1 || tilt > 0.5
              ? cranes.map((p) => {
                  const top = p.c.y - (p.h * tilt) / sq - 7;
                  return (
                    <G key={`crane-${p.z.id}`}>
                      <Line x1={p.c.x} y1={p.c.y - (p.h * tilt) / sq} x2={p.c.x} y2={top} stroke={colors.accent} strokeWidth={0.45 * k} />
                      <AnimatedG x={swing}>
                        <Line x1={p.c.x - 2} y1={top} x2={p.c.x + 5} y2={top} stroke={colors.accent} strokeWidth={0.45 * k} />
                        <Line x1={p.c.x + 4} y1={top} x2={p.c.x + 4} y2={top + 3} stroke={M.ink} strokeWidth={0.15 * k} />
                      </AnimatedG>
                    </G>
                  );
                })
              : null}
            {wet && marina
              ? [-4, 0, 4].map((dx, i) => (
                  <AnimatedG key={`boat-${i}`} y={bob}>
                    <Path
                      d={`M${marina.c.x + dx - 1.1},${marina.c.y + i * 3}l2.2,0l-0.5,0.7l-1.2,0z`}
                      fill={colors.card}
                      stroke={M.ink}
                      strokeWidth={0.12 * k}
                    />
                  </AnimatedG>
                ))
              : null}

            {/* labels and district rings stay upright on the tilted sheet */}
            {band >= 1
              ? parcels
                  .filter((p) => p.z.category !== 'condo' || band === 2)
                  .map((p) => (
                    <G key={`lbl-${p.z.id}`} transform={`translate(${p.c.x} ${p.c.y - (p.h * tilt) / sq}) scale(1 ${1 / sq})`}>
                      <SvgText fontSize={1.6 * k} textAnchor="middle" fill={p.state === 'built' && !FLAT_FILL[p.z.category] ? colors.card : M.ink} fontWeight="700">
                        {shortName(p.z)}
                      </SvgText>
                    </G>
                  ))
              : DISTRICTS.map((dd) => {
                  const own = parcels.filter((p) => dd.zoneIds.includes(p.z.id));
                  if (!own.length) return null;
                  const c = centroid(own.map((p) => p.c));
                  const pct = districtPercent(dd, districts[dd.id]?.pos ?? 0);
                  const r = 4.2;
                  return (
                    <G key={`ring-${dd.id}`} transform={`translate(${c.x} ${c.y}) scale(1 ${1 / sq})`}>
                      <Circle r={r} fill={colors.card} stroke={M.rawDot} strokeWidth={1} />
                      <Circle
                        r={r}
                        fill="none"
                        stroke={pct >= 100 ? colors.teal : colors.accent}
                        strokeWidth={1}
                        strokeDasharray={`${(2 * Math.PI * r * pct) / 100} 999`}
                        transform="rotate(-90)"
                      />
                      <SvgText y={1} fontSize={2.6} textAnchor="middle" fill={M.ink} fontWeight="700">
                        {`${pct}`}
                      </SvgText>
                    </G>
                  );
                })}
          </G>

          {tod.op > 0 ? <Rect x={-50} y={-50} width={W + 100} height={H + 100} fill={tod.color} opacity={tod.op} /> : null}

          {/* compass, drawn in-sheet and sized to the current view */}
          <G transform={`translate(${cx - vbW / 2 + 5 * k} ${cy + vbH / 2 - 6 * k}) scale(${k})`}>
            <Circle r={3.6} fill={colors.card} stroke={M.rawDot} strokeWidth={0.3} />
            <Path d="M0,-2.8L1.1,0.8L0,0.2L-1.1,0.8Z" fill={M.ink} />
            <SvgText y={-4.3} fontSize={2.4} textAnchor="middle" fill={M.ink} fontWeight="700">
              N
            </SvgText>
          </G>
        </Svg>

        {/* overlays */}
        <View style={styles.chips} pointerEvents="box-none">
          {(['build', 'risk', 'drain'] as Layer[]).map((l) => (
            <TouchableOpacity key={l} onPress={() => { tapFeedback(); setLayer(l); }} style={[styles.chip, layer === l && styles.chipOn]}>
              <Text style={[styles.chipText, layer === l && { color: colors.text }]}>{l === 'build' ? 'Build' : l === 'risk' ? 'Risk' : 'Drain'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tools} pointerEvents="box-none">
          <TouchableOpacity onPress={toggle3d} style={[styles.tool, { backgroundColor: M.ink }]}>
            <Text style={[styles.toolText, { color: colors.card, fontSize: 15 }]}>{tilt > 0.5 ? '2D' : '3D'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { tapFeedback(); setZoomClamped(zoom * 1.8); }} style={styles.tool}>
            <Text style={styles.toolText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { tapFeedback(); setZoomClamped(zoom / 1.8); }} style={styles.tool}>
            <Text style={styles.toolText}>−</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sel ? (
        <View style={styles.detail}>
          <Text style={styles.detailTag}>{sel.dist ? sel.dist.name.toUpperCase() : 'SITE'}</Text>
          <Text style={styles.detailTitle}>{sel.z.name}</Text>
          <Text style={styles.detailBody}>
            {sel.stage}
            {sel.next ? ` · next: ${sel.next}` : ''}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(sel.prog * 100)}%`, backgroundColor: sel.state === 'built' ? colors.teal : colors.accent }]} />
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>Tap a parcel for its build status · drag to pan · pinch or +/− to zoom · 3D tilts the sheet</Text>
      )}

      <View style={styles.legend}>
        <Swatch kind="raw" label="Raw" />
        <Swatch kind="work" label="Under way" />
        <Swatch kind="built" label="Built" />
        <Swatch kind="water" label="Water" />
      </View>
    </View>
  );
}

/** schematic lot subdivision inside a house wave, filling in as the wave rises */
function LotGrid({ pts, lift, built, k }: { pts: { x: number; y: number }[]; lift: number; built: number; k: number }) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const cols = Math.max(2, Math.round((x1 - x0) / 3.2));
  const rows = Math.max(2, Math.round((y1 - y0) / 2.6));
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i];
      const b = pts[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  let lines = '';
  let roofs = '';
  let n = 0;
  const total = cols * rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lx = x0 + ((x1 - x0) * c) / cols;
      const ly = y0 + ((y1 - y0) * r) / rows;
      const lw = (x1 - x0) / cols;
      const lh = (y1 - y0) / rows;
      if (!inside(lx + lw / 2, ly + lh / 2)) continue;
      lines += `M${lx},${ly - lift}h${lw}v${lh}h${-lw}z`;
      if (n++ / total < built) roofs += `M${lx + lw * 0.25},${ly + lh * 0.25 - lift}h${lw * 0.5}v${lh * 0.5}h${-lw * 0.5}z`;
    }
  }
  return (
    <G>
      <Path d={lines} fill="none" stroke={M.wall} strokeOpacity={0.5} strokeWidth={0.12 * k} />
      {roofs ? <Path d={roofs} fill={M.roof} /> : null}
    </G>
  );
}

function shortName(z: SiteZone): string {
  return z.name.split(/ [—(&,]/)[0].replace(/^Single-family /, '');
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function Swatch({ kind, label }: { kind: 'raw' | 'work' | 'built' | 'water'; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <Svg width={14} height={14} viewBox="0 0 14 14">
        {kind === 'raw' ? <Rect x={1} y={1} width={12} height={12} fill={M.raw} stroke={M.rawDot} strokeDasharray="2 1.5" /> : null}
        {kind === 'raw' ? <Circle cx={7} cy={7} r={1.2} fill={M.rawDot} /> : null}
        {kind === 'work' ? <Rect x={1} y={1} width={12} height={12} fill={M.work} stroke={colors.accent} /> : null}
        {kind === 'work' ? <Path d="M1,9L9,1M5,13L13,5" stroke={colors.accent} strokeWidth={1.5} /> : null}
        {kind === 'built' ? <Rect x={1} y={1} width={12} height={12} fill={M.roof} /> : null}
        {kind === 'water' ? <Rect x={1} y={1} width={12} height={12} fill={M.water} stroke={M.waterEdge} /> : null}
      </Svg>
      <Text style={[styles.hint, { marginLeft: 4 }]}>{label}</Text>
    </View>
  );
}

const mono = { fontVariant: ['tabular-nums' as const] };

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 12 },
  pills: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 5 },
  pill: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 8 },
  pillText: { color: colors.text, fontSize: 11, fontWeight: '600', ...mono },
  map: { height: MAP_HEIGHT, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: M.bg },
  chips: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(245,246,242,0.9)', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.warn },
  chipText: { fontSize: 11, color: colors.muted, fontWeight: '600', ...mono },
  tools: { position: 'absolute', top: 8, right: 8, gap: 6 },
  tool: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontSize: 22, color: colors.text, fontWeight: '700' },
  detail: { marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  detailTag: { fontSize: 11, letterSpacing: 1.6, color: '#8C3A2B', fontWeight: '700' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  detailBody: { fontSize: 13, color: '#3D4A55', marginTop: 2 },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.cardAlt, marginTop: 8, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
});
