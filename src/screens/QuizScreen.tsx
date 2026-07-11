import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { moduleById } from '../content';
import type {
  MultipleChoiceQuestion,
  QuizQuestion,
  SequencingQuestion,
  SubOrManageQuestion,
} from '../content/schema';
import { defaultRng, shuffle } from '../engine/rng';
import { XP } from '../engine/progress';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, H1, H2, OptionRow, Screen, Small, Tag, TeachBox } from '../ui/components';
import { colors } from '../ui/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

interface SessionItem {
  moduleId: string;
  question: QuizQuestion;
}

export default function QuizScreen({ route, navigation }: Props) {
  const { moduleId, review } = route.params;
  const app = useAppState();

  const items = useMemo<SessionItem[]>(() => {
    if (review) {
      return app.dueReviews
        .map((r) => {
          const m = moduleById.get(r.moduleId);
          const q = m?.quiz.find((qq) => qq.id === r.questionId);
          return m && q ? { moduleId: m.id, question: q } : null;
        })
        .filter((x): x is SessionItem => x !== null);
    }
    const m = moduleId ? moduleById.get(moduleId) : undefined;
    if (!m) return [];
    return shuffle(defaultRng, m.quiz).map((q) => ({ moduleId: m.id, question: q }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, review]);

  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<null | { correct: boolean }>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);

  if (items.length === 0) {
    return (
      <Screen>
        <H1>{review ? 'Review' : 'Quiz'}</H1>
        <Card>
          <Body>
            {review
              ? 'Nothing due for review right now. Misses come back on a spaced schedule — 10 minutes, then 1, 3, and 7 days.'
              : 'This module has no quiz content yet. It will appear here as research is wired in.'}
          </Body>
          <Btn label="Back" onPress={() => navigation.goBack()} kind="ghost" />
        </Card>
      </Screen>
    );
  }

  if (index >= items.length) {
    const pct = Math.round((sessionCorrect / items.length) * 100);
    return (
      <Screen>
        <H1>Session complete</H1>
        <Card>
          <H2>
            {sessionCorrect}/{items.length} correct ({pct}%)
          </H2>
          <Body muted>+{sessionXp} XP</Body>
          <TeachBox tone={pct >= 80 ? 'good' : 'warn'}>
            {pct >= 80
              ? 'Strong pass. Anything you missed is queued for spaced review — it will come back until it sticks.'
              : 'Every miss is queued for spaced review (10 min → 1 day → 3 days → 7 days). Re-read the module sections the misses point at, then let the review queue do its work.'}
          </TeachBox>
          <Btn label="Done" onPress={() => navigation.goBack()} />
        </Card>
      </Screen>
    );
  }

  const item = items[index];
  const q = item.question;

  const handleAnswered = (correct: boolean, xpOverride?: number) => {
    const xp =
      xpOverride ??
      (correct
        ? review
          ? XP.reviewPass
          : q.type === 'sequencing'
            ? XP.sequencingCorrect
            : XP.quizCorrectFirstTry
        : 0);
    app.recordQuizResult(item.moduleId, q.id, correct, { review, xp });
    setAnswered({ correct });
    if (correct) setSessionCorrect((c) => c + 1);
    setSessionXp((x) => x + xp);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H1>{review ? 'Review' : 'Quiz'}</H1>
        <Small>
          {index + 1} / {items.length}
        </Small>
      </View>
      {review ? <Tag label={moduleById.get(item.moduleId)?.short ?? item.moduleId} /> : null}
      {q.teach ? <TeachBox>{q.teach}</TeachBox> : null}
      <Card>
        <Body style={{ fontWeight: '600', marginBottom: 8 }}>{q.prompt}</Body>
        {q.type === 'multipleChoice' && (
          <MultipleChoice key={q.id} q={q} done={!!answered} onAnswered={handleAnswered} />
        )}
        {q.type === 'sequencing' && (
          <Sequencing key={q.id} q={q} done={!!answered} onAnswered={handleAnswered} />
        )}
        {q.type === 'subOrManage' && (
          <SubOrManage key={q.id} q={q} done={!!answered} onAnswered={handleAnswered} />
        )}
      </Card>
      {answered ? (
        <>
          <TeachBox tone={answered.correct ? 'good' : 'bad'}>
            {answered.correct ? 'Correct. ' : 'Not quite — and here is the why: '}
            {q.explanation}
          </TeachBox>
          <Btn
            label={index + 1 < items.length ? 'Next question' : 'Finish'}
            onPress={() => {
              setAnswered(null);
              setIndex((i) => i + 1);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

// ------------------------------------------------------- multiple choice

function MultipleChoice({
  q,
  done,
  onAnswered,
}: {
  q: MultipleChoiceQuestion;
  done: boolean;
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const order = useMemo(() => shuffle(defaultRng, q.choices.map((_, i) => i)), [q]);

  return (
    <View>
      {order.map((ci) => {
        const c = q.choices[ci];
        let state: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle';
        if (picked !== null) {
          if (c.correct) state = 'correct';
          else if (ci === picked) state = 'wrong';
          else state = 'dim';
        }
        return (
          <OptionRow
            key={ci}
            label={c.text}
            state={state}
            detail={picked !== null && (ci === picked || c.correct) ? c.why : undefined}
            onPress={
              picked === null && !done
                ? () => {
                    setPicked(ci);
                    onAnswered(!!c.correct);
                  }
                : undefined
            }
          />
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------ sequencing

function Sequencing({
  q,
  done,
  onAnswered,
}: {
  q: SequencingQuestion;
  done: boolean;
  onAnswered: (correct: boolean) => void;
}) {
  // q.items is authored in correct order; present shuffled indices
  const shuffled = useMemo(() => shuffle(defaultRng, q.items.map((_, i) => i)), [q]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const remaining = shuffled.filter((i) => !chosen.includes(i));
  const correct = chosen.every((v, i) => v === i);

  return (
    <View>
      <Small style={{ marginBottom: 4 }}>Tap items in the order they should happen:</Small>
      {chosen.map((i, pos) => (
        <OptionRow
          key={`c-${i}`}
          label={`${pos + 1}. ${q.items[i]}`}
          state={submitted ? (i === pos ? 'correct' : 'wrong') : 'selected'}
          onPress={!submitted ? () => setChosen((c) => c.filter((x) => x !== i)) : undefined}
        />
      ))}
      {!submitted &&
        remaining.map((i) => (
          <OptionRow key={`r-${i}`} label={q.items[i]} onPress={() => setChosen((c) => [...c, i])} />
        ))}
      {!submitted && chosen.length === q.items.length && !done && (
        <Btn
          label="Check order"
          onPress={() => {
            setSubmitted(true);
            onAnswered(correct);
          }}
        />
      )}
      {submitted && !correct && (
        <View style={{ marginTop: 8 }}>
          <Small style={{ color: colors.good, fontWeight: '600' }}>Correct order:</Small>
          {q.items.map((it, i) => (
            <Small key={i} style={{ marginTop: 2 }}>
              {i + 1}. {it}
            </Small>
          ))}
        </View>
      )}
    </View>
  );
}

// --------------------------------------------------------- sub or manage

function SubOrManage({
  q,
  done,
  onAnswered,
}: {
  q: SubOrManageQuestion;
  done: boolean;
  onAnswered: (correct: boolean, xp?: number) => void;
}) {
  const [picks, setPicks] = useState<Record<number, 'subcontract' | 'direct'>>({});
  const [submitted, setSubmitted] = useState(false);

  const allPicked = q.items.every((_, i) => picks[i]);
  const rightCount = q.items.filter((it, i) => picks[i] === it.answer).length;

  return (
    <View>
      {q.items.map((it, i) => {
        const pick = picks[i];
        const isRight = pick === it.answer;
        return (
          <View
            key={i}
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: submitted ? (isRight ? colors.good : colors.bad) : colors.border,
              backgroundColor: colors.cardAlt,
            }}
          >
            <Body style={{ fontWeight: '600' }}>{it.scope}</Body>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {(['subcontract', 'direct'] as const).map((opt) => (
                <Btn
                  key={opt}
                  label={opt === 'subcontract' ? 'Subcontract' : 'Direct-manage'}
                  kind={pick === opt ? 'teal' : 'ghost'}
                  style={{ flex: 1, marginRight: opt === 'subcontract' ? 8 : 0, marginTop: 0 }}
                  onPress={
                    !submitted && !done ? () => setPicks((p) => ({ ...p, [i]: opt })) : () => {}
                  }
                />
              ))}
            </View>
            {submitted ? (
              <Small style={{ marginTop: 6 }}>
                {isRight ? '✓ ' : `✗ ${it.answer === 'subcontract' ? 'Subcontract' : 'Direct-manage'} — `}
                {it.why}
              </Small>
            ) : null}
          </View>
        );
      })}
      {!submitted && allPicked && !done && (
        <Btn
          label="Check answers"
          onPress={() => {
            setSubmitted(true);
            const allRight = rightCount === q.items.length;
            onAnswered(allRight, rightCount * 4);
          }}
        />
      )}
      {submitted && (
        <Small style={{ marginTop: 8 }}>
          {rightCount}/{q.items.length} scopes classified correctly.
        </Small>
      )}
    </View>
  );
}
