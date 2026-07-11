import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { mathModules, moduleById } from '../content';
import type { ContentModule, MathProblemTemplate } from '../content/schema';
import { checkAnswer, GeneratedProblem, generateProblem, pctError } from '../engine/mathGen';
import { fmtWithUnit } from '../engine/format';
import { defaultRng, pick } from '../engine/rng';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, H1, Screen, Small, Tag, TeachBox } from '../ui/components';
import { colors, space } from '../ui/theme';

export default function MathScreen() {
  const app = useAppState();
  const { mathStats } = app.state;
  const [scope, setScope] = useState<string>('mixed');
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<null | { correct: boolean; err: number }>(null);

  const pool = useMemo(() => {
    const mods = scope === 'mixed' ? mathModules : mathModules.filter((m) => m.id === scope);
    const out: { module: ContentModule; template: MathProblemTemplate }[] = [];
    for (const m of mods)
      for (const t of m.mathProblems)
        if (t.difficulty <= mathStats.unlockedDifficulty) out.push({ module: m, template: t });
    return out;
  }, [scope, mathStats.unlockedDifficulty]);

  const nextProblem = useCallback(() => {
    if (pool.length === 0) return;
    // prefer problems at the unlocked frontier so difficulty actually scales
    const frontier = pool.filter((p) => p.template.difficulty === mathStats.unlockedDifficulty);
    const source = frontier.length > 0 && defaultRng() < 0.65 ? frontier : pool;
    const choice = pick(defaultRng, source);
    setProblem(generateProblem(choice.module, choice.template, defaultRng));
    setInput('');
    setResult(null);
  }, [pool, mathStats.unlockedDifficulty]);

  const accuracy = mathStats.attempts === 0 ? 0 : Math.round((mathStats.correct / mathStats.attempts) * 100);

  const submit = () => {
    if (!problem) return;
    const val = parseFloat(input.replace(/[$,\s]/g, ''));
    const correct = checkAnswer(problem, val);
    const err = isFinite(val) ? Math.abs(pctError(problem, val)) : 100;
    setResult({ correct, err });
    app.recordMath(correct, err, problem.difficulty);
  };

  return (
    <Screen>
      <H1>Budget & Math Engine</H1>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Attempts" value={`${mathStats.attempts}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Avg. error" value={mathStats.attempts ? `${mathStats.meanAbsPctError.toFixed(1)}%` : '—'} />
          <Stat label="Level" value={`${mathStats.unlockedDifficulty}/3`} />
        </View>
        <Small style={{ marginTop: 6 }}>
          Estimating accuracy = how close your numbers land over time. Get 4 of 5 right at your
          current level to unlock the next.
        </Small>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.m }}>
        <Chip label="Mixed" active={scope === 'mixed'} onPress={() => setScope('mixed')} />
        {mathModules.map((m) => (
          <Chip key={m.id} label={m.short} active={scope === m.id} onPress={() => setScope(m.id)} />
        ))}
      </ScrollView>

      {pool.length === 0 ? (
        <Card>
          <Body>No math content in this scope yet — it arrives with the module research.</Body>
        </Card>
      ) : !problem ? (
        <Card>
          <Body>
            Problems are generated fresh from the project's real planning numbers — same formulas,
            different values every time. Difficulty starts at plug-in-the-formula and builds to
            multi-step estimates.
          </Body>
          <Btn label="Give me a problem" onPress={nextProblem} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Tag label={moduleById.get(problem.moduleId)?.short ?? ''} />
              <Tag label={`Level ${problem.difficulty}`} color={colors.accent} />
            </View>
            <Body style={{ fontWeight: '700', marginBottom: 4 }}>{problem.title}</Body>
            {problem.context ? <TeachBox>{problem.context}</TeachBox> : null}
            <Body style={{ marginTop: 4 }}>{problem.prompt}</Body>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                editable={!result}
                keyboardType="numeric"
                placeholder="Your answer"
                placeholderTextColor={colors.muted}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: result ? (result.correct ? colors.good : colors.bad) : colors.border,
                  borderRadius: 10,
                  color: colors.text,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.cardAlt,
                }}
              />
              <Small style={{ marginLeft: 8 }}>{problem.unit}</Small>
            </View>
            {!result && <Btn label="Check" onPress={submit} disabled={input.trim() === ''} />}
          </Card>
          {result && (
            <>
              <TeachBox tone={result.correct ? 'good' : 'bad'}>
                {result.correct
                  ? `Right — within tolerance (you were ${result.err.toFixed(1)}% off). `
                  : `The answer is ${fmtWithUnit(problem.answer, problem.unit)} — you were ${result.err.toFixed(1)}% off. `}
                Walk the method below; the method is the thing to keep.
              </TeachBox>
              <Card>
                <Body style={{ fontWeight: '700', marginBottom: 6 }}>Worked solution</Body>
                {problem.steps.map((s, i) => (
                  <Body key={i} style={{ marginBottom: 6 }}>
                    {i + 1}. {s}
                  </Body>
                ))}
              </Card>
              <Btn label="Next problem" onPress={nextProblem} />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Body style={{ fontWeight: '700' }}>{value}</Body>
      <Small>{label}</Small>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: active ? colors.teal : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.teal : colors.border,
      }}
    >
      <Small style={{ color: active ? '#10141B' : colors.muted, fontWeight: '600' }}>{label}</Small>
    </TouchableOpacity>
  );
}
