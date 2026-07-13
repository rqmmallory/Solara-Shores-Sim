import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { simPhases } from '../content';
import type { CurveballFrequency } from '../engine/sim';
import { WEATHER_TABLE } from '../engine/weather';
import { useAppState } from '../state/AppState';
import { phaseHost } from '../content/mentors';
import { Body, Card, H1, H2, Screen, Small, Tag } from '../ui/components';
import IsoSiteMap from '../ui/IsoSiteMap';
import MentorBubble from '../ui/MentorBubble';
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
  const [showWeather, setShowWeather] = useState(false);

  return (
    <Screen>
      <H1>Build Solara Shores</H1>

      {(() => {
        const next =
          simPhases.find(
            (p) => p.status !== 'placeholder' && !app.state.simRecords.some((r) => r.phaseId === p.id)
          ) ?? simPhases[0];
        const host = phaseHost(next.id);
        return (
          <MentorBubble
            mentor={host}
            line={`${host.greeting} Next up: ${next.title}.`}
            animateIn
          />
        );
      })()}

      <IsoSiteMap records={app.state.simRecords} />

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

      {simPhases.map((p, i) => {
        const record = app.state.simRecords.find((r) => r.phaseId === p.id);
        const placeholder = p.status === 'placeholder';
        // sequential unlock: a phase opens once every earlier phase has a run
        const locked =
          !placeholder &&
          simPhases
            .slice(0, i)
            .some(
              (prev) =>
                prev.status !== 'placeholder' &&
                !app.state.simRecords.some((r) => r.phaseId === prev.id)
            );
        return (
          <TouchableOpacity
            key={p.id}
            disabled={placeholder || locked}
            onPress={() => nav.navigate('SimRun', { phaseId: p.id })}
          >
            <Card style={{ opacity: placeholder || locked ? 0.5 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <H2>{p.title}</H2>
                {record ? (
                  <Tag label={`BEST ${record.bestScore}`} color={colors.good} />
                ) : locked ? (
                  <Tag label="LOCKED" color={colors.muted} />
                ) : null}
              </View>
              <Small>
                {placeholder
                  ? 'Coming in a later build increment.'
                  : locked
                    ? 'Complete the previous phase first — the critical path is the critical path.'
                    : p.intro.slice(0, 140) + '…'}
              </Small>
            </Card>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity onPress={() => setShowWeather(!showWeather)}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>Weather Desk {showWeather ? '−' : '+'}</H2>
          </View>
          <Small>
            Climate sets your specs; weather sets your day. Which trades die on which forecast
            (V3-9's task-gating table).
          </Small>
          {showWeather
            ? Object.values(WEATHER_TABLE)
                .filter((w) => w.state !== 'clear')
                .map((w) => (
                  <View key={w.state} style={{ marginTop: 10 }}>
                    <Body style={{ fontWeight: '700', color: colors.warn }}>{w.label}</Body>
                    {w.blocked.length > 0 ? (
                      <Small>Blocked: {w.blocked.join('; ')}</Small>
                    ) : null}
                    {w.degraded.length > 0 ? (
                      <Small>
                        Degraded:{' '}
                        {w.degraded.map((d) => `${d.task} (×${d.multiplier})`).join('; ')}
                      </Small>
                    ) : null}
                    {w.favored.length > 0 ? <Small>Favored: {w.favored.join('; ')}</Small> : null}
                    <Small style={{ fontStyle: 'italic' }}>{w.note}</Small>
                  </View>
                ))
            : null}
        </Card>
      </TouchableOpacity>

      <Card>
        <H2>Your decisions follow you</H2>
        <Small>
          The sim tracks decisions ACROSS phases: contract clauses, spec choices, and shortcuts set
          standing flags that arm or defuse events in later phases — the Phase 2 EMP clause decides
          who pays for the Phase 4 stoppage, and Phase 7 surfaces every long-fuse consequence.
          Open risk you finish a phase carrying rides into the next one.
        </Small>
      </Card>
    </Screen>
  );
}
