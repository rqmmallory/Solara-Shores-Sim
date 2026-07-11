import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { moduleById } from '../content';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, H1, OptionRow, Screen, Small, TeachBox } from '../ui/components';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Decision'>;

export default function DecisionScreen({ route, navigation }: Props) {
  const { moduleId, decisionId } = route.params;
  const app = useAppState();
  const m = moduleById.get(moduleId);
  const d = m?.decisionPoints.find((x) => x.id === decisionId);
  const [picked, setPicked] = useState<string | null>(null);

  if (!m || !d) {
    return (
      <Screen>
        <H1>Scenario not found</H1>
      </Screen>
    );
  }

  const pickedOption = d.options.find((o) => o.id === picked);

  return (
    <Screen>
      <H1>{d.title}</H1>
      <Small style={{ marginBottom: 8 }}>{m.short} · decision scenario</Small>
      <Card>
        <Body>{d.scenario}</Body>
      </Card>
      {d.options.map((o) => {
        let state: 'idle' | 'correct' | 'wrong' | 'dim' | 'selected' = 'idle';
        if (picked) {
          if (o.id === picked) state = o.optimal ? 'correct' : o.acceptable ? 'selected' : 'wrong';
          else if (o.optimal) state = 'correct';
          else state = 'dim';
        }
        return (
          <OptionRow
            key={o.id}
            label={o.label}
            state={state}
            detail={picked && (o.id === picked || o.optimal) ? o.outcome : undefined}
            onPress={
              !picked
                ? () => {
                    setPicked(o.id);
                    app.recordDecisionSeen(m.id, d.id, !!o.optimal, !!o.acceptable);
                  }
                : undefined
            }
          />
        );
      })}
      {picked ? (
        <>
          <TeachBox tone={pickedOption?.optimal ? 'good' : pickedOption?.acceptable ? 'warn' : 'bad'}>
            {d.debrief}
          </TeachBox>
          <Btn label="Done" onPress={() => navigation.goBack()} />
        </>
      ) : null}
    </Screen>
  );
}
