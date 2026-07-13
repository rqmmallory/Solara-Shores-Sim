import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Polygon, Text as SvgText } from 'react-native-svg';
import { siteZones, SiteZone, ZoneCategory } from '../content/siteMap';
import { solidsBounds, svgPoints, ZONE_HEIGHT, zoneSolid } from '../engine/iso';
import { resolveZoneVisual, siteBuildProgress } from '../engine/siteMapState';
import type { SimRecord } from '../engine/progress';
import { tapFeedback } from './feedback';
import { colors, space } from './theme';

/**
 * The living site: the real master-plan parcels rendered as an isometric
 * 2.5D scene. Flat land reads as ground; completing a phase makes its
 * parcels EXTRUDE into shaded buildings that rise out of the ground on
 * entry. Tap any parcel for its build status. Same decision engine
 * underneath — this is the map made immersive, not a second game.
 */

// built-state colour per category (roof/top face); walls are shaded darker
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

function shade(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  const cl = (n: number) => Math.max(0, Math.min(255, n));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}

export default function IsoSiteMap({ records }: { records: SimRecord[] }) {
  const [selected, setSelected] = useState<SiteZone | null>(null);
  const completedPhaseIds = useMemo(() => new Set(records.map((r) => r.phaseId)), [records]);
  const estateBuilt = useMemo(
    () => siteBuildProgress(siteZones, completedPhaseIds),
    [completedPhaseIds]
  );

  // resolve each zone's current visual + full extrusion height
  const resolved = useMemo(
    () =>
      siteZones.map((zone) => {
        const visual = resolveZoneVisual(zone, completedPhaseIds);
        const fullHeight = visual.tier === 'built' ? ZONE_HEIGHT[zone.category] : 0;
        return { zone, visual, fullHeight };
      }),
    [completedPhaseIds]
  );

  // viewBox is computed at full height so the canvas never resizes mid-reveal
  const bounds = useMemo(
    () => solidsBounds(resolved.map((r) => zoneSolid(r.zone, r.fullHeight))),
    [resolved]
  );

  // painter's order: draw far parcels first
  const order = useMemo(
    () => resolved.map((r) => r.zone.id).sort((a, b) => depthOf(a) - depthOf(b)),
    [resolved]
  );

  // one-time "buildings rise out of the ground" reveal on mount / phase change
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
  }, [growAnim, completedPhaseIds]);

  const screenWidth = Dimensions.get('window').width;
  const pxWidth = Math.max(screenWidth - 48, 320) * 1.5;
  const pxHeight = (pxWidth * bounds.height) / bounds.width;
  const iconFont = bounds.width * 0.028;

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
        <Text style={styles.hint}>Finish phases to raise the buildings · tap any parcel</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator style={{ maxHeight: 440 }}>
        <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 440 }}>
          <View style={[styles.canvas, { width: pxWidth, height: pxHeight }]}>
            <Svg
              width={pxWidth}
              height={pxHeight}
              viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
            >
              {order.map((id) => {
                const r = resolved.find((x) => x.zone.id === id)!;
                const isSel = selected?.id === id;
                const h = r.fullHeight * grow;
                const solid = zoneSolid(r.zone, h);
                const flat = r.fullHeight === 0;
                const topColor =
                  r.visual.tier === 'raw'
                    ? RAW_COLOR
                    : r.visual.tier === 'cleared'
                      ? CLEARED_COLOR
                      : BUILT_COLOR[r.zone.category];
                return (
                  <G key={id} onPress={() => { tapFeedback(); setSelected(r.zone); }}>
                    {/* ground shadow the volume sits on */}
                    {!flat ? (
                      <Polygon points={svgPoints(solid.base)} fill={shade(topColor, 0.32)} />
                    ) : null}
                    {solid.left.length ? (
                      <Polygon points={svgPoints(solid.left)} fill={shade(topColor, 0.55)} />
                    ) : null}
                    {solid.right.length ? (
                      <Polygon points={svgPoints(solid.right)} fill={shade(topColor, 0.78)} />
                    ) : null}
                    <Polygon
                      points={svgPoints(solid.top)}
                      fill={topColor}
                      stroke={isSel ? colors.accent : shade(topColor, 0.45)}
                      strokeWidth={isSel ? bounds.width * 0.006 : bounds.width * 0.0015}
                    />
                    {r.zone.w >= 12 || r.visual.tier === 'built' ? (
                      <SvgText
                        x={solid.center.x}
                        y={solid.center.y + iconFont * 0.35}
                        fontSize={iconFont}
                        textAnchor="middle"
                      >
                        {r.visual.icon}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}
            </Svg>
          </View>
        </ScrollView>
      </ScrollView>

      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>
            {resolveZoneVisual(selected, completedPhaseIds).icon} {selected.name}
          </Text>
          <Text style={styles.detailStatus}>
            {resolveZoneVisual(selected, completedPhaseIds).label}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>Tap any parcel for its build status.</Text>
      )}

      <View style={styles.legendRow}>
        <LegendDot color={RAW_COLOR} label="raw land" />
        <LegendDot color={CLEARED_COLOR} label="cleared" />
        <LegendDot color={BUILT_COLOR.condo} label="built" />
      </View>
    </View>
  );
}

/** depth key mirrors iso painter order without recomputing full solids */
function depthOf(zoneId: string): number {
  const z = siteZones.find((s) => s.id === zoneId)!;
  return z.x * 2 + z.w + (z.y + z.h) * 4;
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
