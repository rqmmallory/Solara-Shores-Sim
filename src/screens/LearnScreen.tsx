import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { modules } from '../content';
import { moduleProficiency } from '../engine/progress';
import { useAppState } from '../state/AppState';
import { Body, Card, H1, H2, Meter, Screen, Small, Tag } from '../ui/components';
import { colors } from '../ui/theme';
import type { RootStackParamList } from '../navigation/types';

export default function LearnScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state } = useAppState();

  return (
    <Screen>
      <H1>Knowledge Modules</H1>
      <Small style={{ marginBottom: 12 }}>
        One module per section of the project research. Read the explainers, then quiz — misses come
        back on a spaced schedule until they stick.
      </Small>
      {modules.map((m) => {
        const prof = moduleProficiency(m, state.moduleStats[m.id]);
        const placeholder = m.status === 'placeholder';
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => nav.navigate('Module', { moduleId: m.id })}
            disabled={placeholder}
          >
            <Card style={{ opacity: placeholder ? 0.5 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <H2>
                  {m.order}. {m.short}
                </H2>
                {placeholder ? <Tag label="CONTENT PENDING" color={colors.muted} /> : null}
              </View>
              <Body muted style={{ marginBottom: 6 }}>
                {m.title}
              </Body>
              {!placeholder ? (
                <Meter
                  label="Proficiency"
                  value={prof}
                  color={prof >= 80 ? colors.good : prof >= 40 ? colors.teal : colors.accent}
                  suffix="%"
                />
              ) : (
                <Small>Research for this module drops in as a data file — no app update needed.</Small>
              )}
            </Card>
          </TouchableOpacity>
        );
      })}
    </Screen>
  );
}
