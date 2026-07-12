import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CANVAS_ASPECT, siteZones, SiteZone } from '../content/siteMap';
import { resolveZoneVisual, ZoneVisual } from '../engine/siteMapState';
import type { SimRecord } from '../engine/progress';
import { colors } from './theme';

/**
 * An illustrated, top-down site map traced from the real Solara Shores
 * master plan: north (Yamacraw Hill Rd) at the top, the ocean/beach at
 * the bottom. Each zone is a positioned icon tile that advances through
 * raw land -> cleared -> its own build stages as sim phases complete —
 * a Sims/FarmVille-style plot map layered on the same decision engine,
 * not a separate game.
 */

const TIER_STYLE: Record<ZoneVisual['tier'], { bg: string; border: string }> = {
  raw: { bg: '#0F2418', border: '#1D4030' },
  cleared: { bg: '#2A2416', border: '#4A3E20' },
  built: { bg: '#173A2E', border: colors.good },
};

const CATEGORY_BASE: Record<SiteZone['category'], string> = {
  road: '#2A3A4A',
  retail: '#3A2E4A',
  senior: '#4A3A2A',
  infra: '#333333',
  lots: '#2E3A2A',
  green: '#1F3A2A',
  amenity: '#1F3A4A',
  estate: '#3A2E2A',
  marina: '#1A3A4A',
  condo: '#2E2A4A',
  clubhouse: '#4A2E3A',
  beach: '#4A3E1F',
};

export default function SiteMapView({ records }: { records: SimRecord[] }) {
  const [selected, setSelected] = useState<SiteZone | null>(null);
  const completedPhaseIds = useMemo(() => new Set(records.map((r) => r.phaseId)), [records]);

  const screenWidth = Dimensions.get('window').width;
  const canvasWidth = Math.max(screenWidth - 48, 340) * 1.6; // wider than the screen — pan to explore
  const canvasHeight = canvasWidth / CANVAS_ASPECT;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Solara Shores — site map</Text>
        <Text style={styles.hint}>Yamacraw Hill Rd ↑ north · ocean ↓ south · pinch/scroll to explore</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ maxHeight: 420 }}>
        <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 420 }}>
          <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
            {/* faint road spine for orientation */}
            <View style={[styles.spine, { left: '48%', width: '2%' }]} />
            {siteZones.map((zone) => {
              const visual = resolveZoneVisual(zone, completedPhaseIds);
              const tierStyle = TIER_STYLE[visual.tier];
              const isSelected = selected?.id === zone.id;
              return (
                <TouchableOpacity
                  key={zone.id}
                  onPress={() => setSelected(zone)}
                  style={[
                    styles.zone,
                    {
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.w}%`,
                      height: `${zone.h}%`,
                      backgroundColor: tierStyle.bg,
                      borderColor: isSelected ? colors.accent : tierStyle.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryStripe,
                      { backgroundColor: CATEGORY_BASE[zone.category] },
                    ]}
                  />
                  <Text style={styles.zoneIcon}>{visual.icon}</Text>
                  {zone.w >= 15 ? (
                    <Text style={styles.zoneLabel} numberOfLines={2}>
                      {zone.name}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
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
        <Text style={styles.hint}>Tap any area of the map for its build status.</Text>
      )}

      <View style={styles.legendRow}>
        <LegendDot color={TIER_STYLE.raw.border} label="raw land" />
        <LegendDot color={TIER_STYLE.cleared.border} label="cleared" />
        <LegendDot color={TIER_STYLE.built.border} label="built" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 4 }} />
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
  canvas: {
    backgroundColor: '#0A1420',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#1A2A3A',
  },
  zone: {
    position: 'absolute',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    overflow: 'hidden',
  },
  categoryStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  zoneIcon: { fontSize: 16 },
  zoneLabel: {
    color: colors.muted,
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
    marginTop: 1,
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
