import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Polygon, Text as SvgText } from 'react-native-svg';
import { siteZones, SiteZone, ZoneCategory } from '../content/siteMap';
import { solidsBounds, svgPoints, ZONE_HEIGHT, zoneSolid } from '../engine/iso';
import {
  DISTRICTS,
  DistrictProgress,
  districtById,
  districtOfZone,
  districtPercent,
  stageAt,
} from '../engine/districts';
import { Btn } from './components';
import { tapFeedback } from './feedback';
import { colors } from './theme';

/**
 * The living site: the real master-plan parcels rendered as an isometric
 * 2.5D scene, driven by live district progress. Each parcel shows its work
 * front's current construction stage and extrudes into a building as that
 * front fills toward the ceiling your decisions authorised — continuously,
 * over real time. Pan-drag and pinch-zoom to explore; tap any parcel for its
 * build status.
 *
 * Pan/zoom uses core React Native `PanResponder` + `Animated` rather than
 * react-native-gesture-handler/reanimated: those need a native worklets
 * runtime that can't be verified without an on-device test, whereas
 * PanResponder is pure JS and guaranteed to run anywhere Expo Go does.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 3.5;
const TAP_SLOP = 6; // px of movement still treated as a tap, not a drag

const BUILT_COLOR: Record<ZoneCategory, string> = {
  road: '#46566B',
  retail: '#A97BC9',
  senior: '#C99A5B',
  infra: '#8892A0',
  lots: '#CE9A63',
  green: '#2E7B4A',
  amenity: '#37B0BC',
  estate: '#D6A36B',
  marina: '#1C77B0',
  condo: '#6C7BD6',
  clubhouse: '#CE7DA6',
  beach: '#D8C081',
};

const RAW_COLOR = '#1E4632'; // untouched bush
const CLEARED_COLOR = '#5A4A28'; // graded dirt pad

interface ZoneVisual {
  icon: string;
  label: string;
  tier: 'raw' | 'cleared' | 'built';
  /** 0..1 how far the parcel's structure has risen, for extrusion height */
  buildFrac: number;
}

/** resolve a parcel's current look from its district's live progress */
function zoneVisual(zone: SiteZone, districts: Record<string, DistrictProgress>): ZoneVisual {
  const dId = districtOfZone(zone.id);
  const d = dId ? districtById(dId) : undefined;
  if (!d) return { icon: '🌿', label: 'Raw land', tier: 'raw', buildFrac: 0 };
  const pos = districts[d.id]?.pos ?? 0;
  const stage = stageAt(d, pos);
  const tier: ZoneVisual['tier'] = pos < 1 ? 'raw' : pos < d.structureStage ? 'cleared' : 'built';
  const last = d.stages.length - 1;
  const denom = Math.max(1, last - d.structureStage);
  const buildFrac = Math.max(0, Math.min(1, (pos - d.structureStage) / denom));
  return { icon: stage.icon, label: stage.label, tier, buildFrac };
}

function shade(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  const cl = (n: number) => Math.max(0, Math.min(255, n));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export default function IsoSiteMap({ districts }: { districts: Record<string, DistrictProgress> }) {
  const [selected, setSelected] = useState<SiteZone | null>(null);

  const estateBuilt = useMemo(() => {
    const avg =
      DISTRICTS.reduce((a, d) => a + districtPercent(d, districts[d.id]?.pos ?? 0), 0) /
      DISTRICTS.length;
    return Math.round(avg);
  }, [districts]);

  // each parcel's current visual + its live extrusion height
  const resolved = useMemo(
    () =>
      siteZones.map((zone) => {
        const v = zoneVisual(zone, districts);
        const fullHeight = ZONE_HEIGHT[zone.category];
        return { zone, v, fullHeight, curHeight: fullHeight * v.buildFrac };
      }),
    [districts]
  );

  // viewBox is fixed to the fully-built estate so the canvas never resizes as
  // buildings rise
  const solidsByZone = useMemo(() => {
    const m = new Map<string, ReturnType<typeof zoneSolid>>();
    for (const z of siteZones) m.set(z.id, zoneSolid(z, ZONE_HEIGHT[z.category]));
    return m;
  }, []);
  const bounds = useMemo(() => solidsBounds([...solidsByZone.values()]), [solidsByZone]);
  const order = useMemo(
    () => siteZones.map((z) => z.id).sort((a, b) => solidsByZone.get(a)!.depth - solidsByZone.get(b)!.depth),
    [solidsByZone]
  );

  // one-time "rise out of the ground" reveal on mount
  const [grow, setGrow] = useState(0);
  const growAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setGrow(0);
    growAnim.setValue(0);
    const id = growAnim.addListener(({ value }) => setGrow(value));
    Animated.timing(growAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => growAnim.removeListener(id);
  }, [growAnim]);

  const screenWidth = Dimensions.get('window').width;
  const viewportWidth = Math.max(screenWidth - 48, 320);
  const pxWidth = viewportWidth;
  const pxHeight = (pxWidth * bounds.height) / bounds.width;
  const iconFont = bounds.width * 0.028;

  const selVisual = selected ? zoneVisual(selected, districts) : null;

  // ---- pan/pinch-zoom (core PanResponder + Animated, no gesture-handler) ----
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const sId = scale.addListener(({ value }) => { scaleRef.current = value; });
    const tId = translate.addListener((v) => { translateRef.current = v; });
    return () => {
      scale.removeListener(sId);
      translate.removeListener(tId);
    };
  }, [scale, translate]);

  const resetView = () => {
    tapFeedback();
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
      Animated.spring(translate, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
    ]).start();
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
  };

  const panResponder = useRef(
    PanResponder.create({
      // never steal a plain tap — only take over once there's real movement
      // or a second finger, so tapping a parcel's onPress still fires
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, g) =>
        g.numberActiveTouches === 2 || Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP,
      onPanResponderGrant: () => {
        pinchStartDist.current = null;
        panStart.current = { ...translateRef.current };
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const [t1, t2] = touches;
          const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          if (pinchStartDist.current == null) {
            pinchStartDist.current = dist;
            pinchStartScale.current = scaleRef.current;
          } else {
            const next = clamp((dist / pinchStartDist.current) * pinchStartScale.current, MIN_SCALE, MAX_SCALE);
            scale.setValue(next);
          }
        } else if (touches.length === 1) {
          translate.setValue({ x: panStart.current.x + gesture.dx, y: panStart.current.y + gesture.dy });
        }
      },
      onPanResponderRelease: () => {
        pinchStartDist.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={styles.title}>Solara Shores — live site</Text>
          <Text style={[styles.title, { color: colors.good }]}>{estateBuilt}% built</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${estateBuilt}%` }]} />
        </View>
        <Text style={styles.hint}>Crews keep building over time · drag to pan · pinch to zoom</Text>
      </View>

      <View style={[styles.canvas, { width: viewportWidth, height: Math.min(pxHeight, 440) }]}>
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            width: pxWidth,
            height: pxHeight,
            transform: [
              { translateX: translate.x },
              { translateY: translate.y },
              { scale },
            ],
          }}
        >
          <Svg
            width={pxWidth}
            height={pxHeight}
            viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          >
            {order.map((id) => {
              const r = resolved.find((x) => x.zone.id === id)!;
              const isSel = selected?.id === id;
              const h = r.curHeight * grow;
              const solid = zoneSolid(r.zone, h);
              const flat = h <= 0.01;
              const topColor =
                r.v.tier === 'raw'
                  ? RAW_COLOR
                  : r.v.tier === 'cleared'
                    ? CLEARED_COLOR
                    : BUILT_COLOR[r.zone.category];
              return (
                <G key={id} onPress={() => { tapFeedback(); setSelected(r.zone); }}>
                  {!flat ? (
                    <Polygon points={svgPoints(solid.base)} fill={shade(topColor, 0.32)} />
                  ) : null}
                  {solid.walls.map((w, wi) => (
                    <Polygon key={wi} points={svgPoints(w.pts)} fill={shade(topColor, w.shade)} />
                  ))}
                  <Polygon
                    points={svgPoints(solid.top)}
                    fill={topColor}
                    stroke={isSel ? colors.accent : shade(topColor, 0.45)}
                    strokeWidth={isSel ? bounds.width * 0.006 : bounds.width * 0.0015}
                  />
                  {r.zone.w >= 12 || r.v.tier === 'built' ? (
                    <SvgText
                      x={solid.center.x}
                      y={solid.center.y + iconFont * 0.35}
                      fontSize={iconFont}
                      textAnchor="middle"
                    >
                      {r.v.icon}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      </View>

      <Btn label="Reset view" kind="ghost" onPress={resetView} style={{ marginTop: 6 }} />

      {selected && selVisual ? (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>
            {selVisual.icon} {selected.name}
          </Text>
          <Text style={styles.detailStatus}>{selVisual.label}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>Tap any parcel for its build status.</Text>
      )}

      <View style={styles.legendRow}>
        <LegendDot color={RAW_COLOR} label="raw land" />
        <LegendDot color={CLEARED_COLOR} label="under way" />
        <LegendDot color={BUILT_COLOR.condo} label="built" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, marginRight: 4 }} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  header: { marginBottom: 8 },
  title: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  hint: { color: colors.muted, fontSize: 10 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.good },
  canvas: {
    backgroundColor: '#0A1420',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detail: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
  },
  detailTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  detailStatus: { color: colors.teal, fontSize: 12, marginTop: 2 },
  legendRow: { flexDirection: 'row', marginTop: 8 },
});
