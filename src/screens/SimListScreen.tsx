import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { simPhases } from '../content';
import type { CurveballFrequency } from '../engine/sim';
import { useAppState } from '../state/AppState';
import { Body, Card, H1, H2, Screen, Small, Tag } from '../ui/components';
import { colors } from '../ui/theme';
import type { RootStackParamList } from '../navigation/types';

const FREQ_LABELS: { key: CurveballFrequency; label: string; blurb: string }[] = [
  { key: 'gentle', label: 'Gentle', blurb: 'fewer curveballs' },
  { key: 'realistic', label: 'Realistic', blurb: 'the island as it is' },
  { key: 'chaotic', label: 'Chaotic', blurb: 'everything goes wrong' },
];

export default function SimListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const app = useAppState();
  const freq = app.state.settings.curveballFrequency;

  return (
    <Screen>
      <H1>Build Solara Shores</H1>
      <Small style={{ marginBottom: 12 }}>
        The actual project, phase by phase. Every gate is a real decision from the research; wrong
        calls cost days, dollars, and quality — never a game-over. New phases unlock as they're
        built into the app.
      </Small>

      <Card>
        <Body style={{ fontWeight: '600', marginBottom: 4 }}>Curveball frequency</Body>
        <View style={{ flexDirection: 'row' }}>
          {FREQ_LABELS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => app.setCurveballFrequency(f.key)}
              style={{
                flex: 1,
                padding: 8,
                marginRight: 6,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: freq === f.key ? colors.teal : colors.cardAlt,
              }}
            >
              <Small style={{ color: freq === f.key ? '#10141B' : colors.muted, fontWeight: '700' }}>
                {f.label}
              </Small>
            </TouchableOpacity>
          ))}
        </View>
        <Small style={{ marginTop: 6 }}>{FREQ_LABELS.find((f) => f.key === freq)?.blurb}</Small>
      </Card>

      {simPhases.map((p) => {
        const record = app.state.simRecords.find((r) => r.phaseId === p.id);
        const placeholder = p.status === 'placeholder';
        return (
          <TouchableOpacity
            key={p.id}
            disabled={placeholder}
            onPress={() => nav.navigate('SimRun', { phaseId: p.id })}
          >
            <Card style={{ opacity: placeholder ? 0.5 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <H2>{p.title}</H2>
                {record ? <Tag label={`BEST ${record.bestScore}`} color={colors.good} /> : null}
              </View>
              <Small>{placeholder ? 'Coming in a later build increment.' : p.intro.slice(0, 140) + '…'}</Small>
            </Card>
          </TouchableOpacity>
        );
      })}

      <Card style={{ opacity: 0.5 }}>
        <H2>Phases 2–8</H2>
        <Small>
          Marine excavation · Horizontal Phase 1 · Vertical + amenity core · Marine completion ·
          Production waves · Handover. Each phase is added as its own build increment once the
          previous one plays well — same engine, new data files.
        </Small>
      </Card>
    </Screen>
  );
}
