import React, { useState } from 'react';
import { View } from 'react-native';
import type { ConceptBlock } from '../content/schema';
import { principleById } from '../content/principles';
import { Body, Card, Collapsible, H2, OptionRow, Small, Tag, TeachBox } from './components';
import Diagram from './diagrams';
import { outcomeFeedback } from './feedback';
import { colors } from './theme';

/**
 * Renders one four-beat concept: MECHANISM (+ its required diagram) → HOOK →
 * APPLIED decision. The applied decision is the primary encoding event, so it
 * is interactive and consequential — you pick, you see what happens, you get
 * the lesson. Retrieval practice (the quiz) lives below in the module.
 */
export default function ConceptBlockView({
  concept,
  onApplied,
}: {
  concept: ConceptBlock;
  /** fired once, the first time the learner commits to an applied choice */
  onApplied?: (optimal: boolean, acceptable: boolean) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const principle = principleById(concept.principleId);
  const picked = concept.applied.options.find((o) => o.id === chosen) ?? null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <H2>{concept.title}</H2>
        {principle ? <Tag label={principle.name} color={colors.teal} /> : null}
      </View>

      {/* BEAT 1 — mechanism, child-clear, with its required visual */}
      <Body>{concept.mechanism}</Body>
      <Diagram id={concept.diagramId} />
      {concept.mechanismPro ? (
        <Collapsible summary="Say it like a pro">{concept.mechanismPro}</Collapsible>
      ) : null}

      {/* BEAT 2 — the memory hook */}
      <TeachBox>💡 {concept.hook}</TeachBox>

      {/* BEAT 3 — the applied, consequential decision (the encoding event) */}
      <Body style={{ fontWeight: '700', marginTop: 6 }}>Your call</Body>
      <Small style={{ marginBottom: 4 }}>{concept.applied.prompt}</Small>
      {concept.applied.options.map((o) => (
        <OptionRow
          key={o.id}
          label={o.label}
          state={
            !chosen
              ? 'idle'
              : o.id === chosen
                ? o.optimal
                  ? 'correct'
                  : o.acceptable
                    ? 'selected'
                    : 'wrong'
                : 'dim'
          }
          onPress={
            chosen
              ? undefined
              : () => {
                  const tone = o.optimal ? 'good' : o.acceptable ? 'warn' : 'bad';
                  outcomeFeedback(tone);
                  setChosen(o.id);
                  onApplied?.(!!o.optimal, !!o.acceptable);
                }
          }
        />
      ))}
      {picked ? (
        <>
          <TeachBox tone={picked.optimal ? 'good' : picked.acceptable ? 'warn' : 'bad'}>
            {picked.outcome}
          </TeachBox>
          <TeachBox>{concept.applied.debrief}</TeachBox>
        </>
      ) : null}

      {principle ? (
        <Small style={{ marginTop: 6, color: colors.muted, fontStyle: 'italic' }}>
          The law: {principle.statement}
        </Small>
      ) : null}
    </Card>
  );
}
