import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { simPhases } from '../content';
import type { SimRecord } from '../engine/progress';
import { colors } from './theme';

/**
 * A lightweight visual of the project building up: each site area is a
 * tile, colored by whether the sim phase that builds it has been
 * completed. Areas come from each phase's `mapAreas` content; the tail
 * of the master plan (phases not yet built into the app) shows dimmed.
 */

const FUTURE_AREAS = [
  'First 40–80 houses + amenity core',
  'Plug breach & entrance channel',
  'Marina wet works & fuel dock',
  'Groins & beach conversion',
  'Estate lots & docks',
  'Condo buildings 1–12',
  'Senior living & retail',
  'HOA turnover & monitoring',
];

export default function ProjectMap({ records }: { records: SimRecord[] }) {
  const done = new Set(records.map((r) => r.phaseId));
  const ready = simPhases.filter((p) => p.status !== 'placeholder');

  const tiles: { label: string; state: 'built' | 'active' | 'future' }[] = [];
  let activeAssigned = false;
  for (const p of ready) {
    const isDone = done.has(p.id);
    const isActive = !isDone && !activeAssigned;
    if (isActive) activeAssigned = true;
    for (const area of p.mapAreas ?? []) {
      tiles.push({ label: area, state: isDone ? 'built' : isActive ? 'active' : 'future' });
    }
  }
  for (const area of FUTURE_AREAS) tiles.push({ label: area, state: 'future' });

  return (
    <View style={styles.wrap}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={styles.title}>Solara Shores — site progress</Text>
        <Text style={styles.legend}>
          <Text style={{ color: colors.good }}>■ built</Text>{'  '}
          <Text style={{ color: colors.accent }}>■ in play</Text>{'  '}
          <Text style={{ color: colors.muted }}>■ ahead</Text>
        </Text>
      </View>
      <View style={styles.grid}>
        {tiles.map((t, i) => (
          <View
            key={i}
            style={[
              styles.tile,
              t.state === 'built' && { backgroundColor: '#1D4436', borderColor: colors.good },
              t.state === 'active' && { backgroundColor: '#3A2F16', borderColor: colors.accent },
              t.state === 'future' && { opacity: 0.45 },
            ]}
          >
            <Text
              style={[
                styles.tileText,
                t.state === 'built' && { color: colors.good },
                t.state === 'active' && { color: colors.accent },
              ]}
              numberOfLines={2}
            >
              {t.label}
            </Text>
          </View>
        ))}
      </View>
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
  title: { color: colors.text, fontWeight: '700', fontSize: 13 },
  legend: { fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 },
  tile: {
    width: '31%',
    margin: '1%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  tileText: { color: colors.muted, fontSize: 10, lineHeight: 13, textAlign: 'center' },
});
