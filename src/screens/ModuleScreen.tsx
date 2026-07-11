import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { moduleById } from '../content';
import { moduleProficiency } from '../engine/progress';
import { fmtWithUnit } from '../engine/format';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, H1, H2, Meter, Screen, Small, Tag, TeachBox } from '../ui/components';
import { colors } from '../ui/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Module'>;

export default function ModuleScreen({ route, navigation }: Props) {
  const { moduleId } = route.params;
  const { state } = useAppState();
  const m = moduleById.get(moduleId);
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [showVars, setShowVars] = useState(false);

  if (!m) {
    return (
      <Screen>
        <H1>Module not found</H1>
      </Screen>
    );
  }

  const prof = moduleProficiency(m, state.moduleStats[m.id]);
  const stats = state.moduleStats[m.id];

  return (
    <Screen>
      <H1>{m.title}</H1>
      <Meter label="Proficiency" value={prof} suffix="%" color={prof >= 80 ? colors.good : colors.teal} />
      <TeachBox>{m.summary}</TeachBox>

      {m.sections.length > 0 && (
        <>
          <H2>Read first</H2>
          {m.sections.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => setOpenSection(openSection === i ? null : i)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Body style={{ fontWeight: '600', flex: 1 }}>{s.heading}</Body>
                  <Small>{openSection === i ? '−' : '+'}</Small>
                </View>
                {openSection === i ? <Body style={{ marginTop: 8 }}>{s.body}</Body> : null}
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      {m.quiz.length > 0 && (
        <Btn
          label={`Quiz me (${m.quiz.length} questions)`}
          onPress={() => navigation.navigate('Quiz', { moduleId: m.id })}
        />
      )}

      {m.decisionPoints.length > 0 && (
        <>
          <View style={{ height: 16 }} />
          <H2>Decision scenarios</H2>
          <Small style={{ marginBottom: 4 }}>
            Real calls from this project. Pick a path, then read what it costs — there are no
            game-overs, only consequences.
          </Small>
          {m.decisionPoints.map((d) => {
            const seen = stats?.decisionsSeen.includes(d.id);
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => navigation.navigate('Decision', { moduleId: m.id, decisionId: d.id })}
              >
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Body style={{ fontWeight: '600', flex: 1 }}>{d.title}</Body>
                    {seen ? <Tag label="PLAYED" color={colors.good} /> : null}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {m.mathVariables.length > 0 && (
        <>
          <View style={{ height: 16 }} />
          <TouchableOpacity onPress={() => setShowVars(!showVars)}>
            <H2>
              Numbers reference {showVars ? '−' : '+'}
            </H2>
          </TouchableOpacity>
          {showVars &&
            m.mathVariables.map((v) => (
              <Card key={v.id} style={{ paddingVertical: 10 }}>
                <Body style={{ fontWeight: '600' }}>{v.label}</Body>
                <Small>
                  {fmtWithUnit(v.min, v.unit)} – {fmtWithUnit(v.max, v.unit)}
                  {v.note ? ` · ${v.note}` : ''}
                </Small>
              </Card>
            ))}
          {showVars && (
            <Small style={{ marginTop: 4 }}>
              Planning-level calibrations for training — validate against live quotes and a local QS
              (e.g. BCQS) before real budgeting.
            </Small>
          )}
        </>
      )}
    </Screen>
  );
}
