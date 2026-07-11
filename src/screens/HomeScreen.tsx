import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { modules, readyModules } from '../content';
import { daysToGroundbreak, levelForXp, moduleProficiency } from '../engine/progress';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, H1, H2, Meter, Screen, Small, TeachBox } from '../ui/components';
import { colors } from '../ui/theme';
import type { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const app = useAppState();
  const days = daysToGroundbreak(Date.now());
  const lvl = levelForXp(app.totalXp);
  const due = app.dueReviews.length;

  const weakest = readyModules
    .map((m) => ({ m, p: moduleProficiency(m, app.state.moduleStats[m.id]) }))
    .sort((a, b) => a.p - b.p)[0];

  return (
    <Screen>
      <H1>Solara Shores</H1>
      <Small style={{ marginBottom: 12 }}>Owner-developer training · Yamacraw Road, New Providence</Small>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <H2>Project Readiness</H2>
          <Body style={{ fontWeight: '700', color: colors.accent, fontSize: 22 }}>
            {app.readiness.overall}%
          </Body>
        </View>
        <Meter label="Knowledge (14 modules)" value={app.readiness.knowledge} color={colors.teal} suffix="%" />
        <Meter label="Estimating & math" value={app.readiness.math} color={colors.accent} suffix="%" />
        <Meter label="Simulation" value={app.readiness.sim} color={colors.good} suffix="%" />
        <Small style={{ marginTop: 8 }}>
          {days} days until ground breaks (September 1). Readiness is weighted 50% knowledge, 25%
          estimating, 25% simulation — the goal is job-site ready, not high scores.
        </Small>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Body style={{ fontWeight: '600' }}>Level {lvl.level}</Body>
          <Small>
            {app.totalXp} XP · {lvl.needed - lvl.into} to next level
          </Small>
        </View>
        <Meter label="" value={lvl.into} max={lvl.needed} color={colors.accent} />
      </Card>

      {due > 0 ? (
        <Card style={{ borderColor: colors.warn }}>
          <Body style={{ fontWeight: '600' }}>
            {due} missed {due === 1 ? 'question is' : 'questions are'} due for review
          </Body>
          <Small>Spaced repetition brings misses back until they stick — clear them while they're fresh.</Small>
          <Btn label="Review now" onPress={() => nav.navigate('Quiz', { review: true })} />
        </Card>
      ) : (
        <TeachBox tone="good">
          Review queue is clear. Misses come back at 10 minutes, then 1, 3, and 7 days — no cramming
          needed, just show up.
        </TeachBox>
      )}

      <Card>
        <Body style={{ fontWeight: '600' }}>Readiness exam</Body>
        <Small>
          Twelve questions sampled across all modules, weighted toward your weakest ones — the
          whole-project test, the way September will ask it.
        </Small>
        <Btn label="Test me on everything" onPress={() => nav.navigate('Quiz', { exam: true })} />
      </Card>

      {weakest && (
        <Card>
          <Body style={{ fontWeight: '600' }}>Suggested next: {weakest.m.short}</Body>
          <Small>
            Your lowest-proficiency module ({weakest.p}%). {weakest.m.summary.slice(0, 120)}…
          </Small>
          <Btn label={`Open ${weakest.m.short}`} kind="teal" onPress={() => nav.navigate('Module', { moduleId: weakest.m.id })} />
        </Card>
      )}

      <Small style={{ marginTop: 8 }}>
        {readyModules.length} of {modules.length} modules have research content wired in. Placeholder
        modules light up as research drops into the content files — no app update needed.
      </Small>
    </Screen>
  );
}
