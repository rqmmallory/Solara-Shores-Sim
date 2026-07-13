import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { simPhaseById } from '../content';
import { fmtMoney } from '../engine/format';
import { XP } from '../engine/progress';
import { defaultRng } from '../engine/rng';
import type { SimEffects } from '../content/schema';
import {
  ADVISORS,
  applyAdvisor,
  availableOptions,
  chooseOption,
  currentStep,
  debrief,
  getCurveball,
  initialSimState,
  resolveCurveball,
  SimState,
} from '../engine/sim';
import { PREP_RISK_RELIEF, prepStatus } from '../engine/prep';
import { mentorById, mentorReaction, phaseHost } from '../content/mentors';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, Celebrate, Collapsible, H1, H2, Meter, OptionRow, Screen, Small, Tag, TeachBox } from '../ui/components';
import MentorBubble from '../ui/MentorBubble';
import { celebrateFeedback, impactFeedback, outcomeFeedback } from '../ui/feedback';
import { colors } from '../ui/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SimRun'>;

export default function SimRunScreen({ route, navigation }: Props) {
  const { phaseId } = route.params;
  const app = useAppState();
  const phase = simPhaseById.get(phaseId);
  // prep-bonus interlock: studying the phase's linked modules to >=60%
  // average proficiency starts the run with reduced risk exposure
  const prep = useMemo(
    () => prepStatus(phaseId, app.state.moduleStats),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phaseId]
  );
  const startState = () => {
    if (!phase) return null;
    const carry = app.simCarryFor(phase.id);
    if (prep.qualified) carry.risk = Math.max(0, carry.risk - PREP_RISK_RELIEF);
    return initialSimState(phase, carry);
  };
  const host = phaseHost(phaseId);
  const [sim, setSim] = useState<SimState | null>(startState);
  const [lastOutcome, setLastOutcome] = useState<{
    title: string;
    text: string;
    tone: 'good' | 'warn' | 'bad';
    mentorId?: string;
  } | null>(null);
  const [banked, setBanked] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const pending = useMemo(
    () => (phase && sim?.pendingCurveball ? getCurveball(phase, sim.pendingCurveball) : null),
    [phase, sim]
  );

  // bank XP + best score + the run snapshot (decisions/flags/risk carry
  // into later phases) once per finished run — in an effect, not render
  useEffect(() => {
    if (!phase || !sim || !sim.finished || sim.pendingCurveball || banked) return;
    const d = debrief(phase, sim);
    const optimalXp = sim.log.filter((l) => l.optimal).length * XP.simStepOptimal;
    const acceptableXp = sim.log.filter((l) => l.acceptable && !l.optimal).length * XP.simStepAcceptable;
    app.recordSimRun(phase.id, d.score, XP.simPhaseComplete + optimalXp + acceptableXp, {
      decisions: sim.decisions,
      flags: sim.flags,
      finalRisk: sim.risk,
    });
    setBanked(true);
    setShowCelebrate(true);
    celebrateFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.finished, sim?.pendingCurveball, banked]);

  if (!phase || !sim) {
    return (
      <Screen>
        <H1>Phase not found</H1>
      </Screen>
    );
  }

  const step = currentStep(phase, sim);
  const contingency = Math.round(phase.startBudget * 0.1);

  // ---- finished: debrief ----
  if (sim.finished && !sim.pendingCurveball) {
    const d = debrief(phase, sim);
    const debriefTone: 'good' | 'warn' | 'bad' = d.score >= 80 ? 'good' : d.score >= 60 ? 'warn' : 'bad';
    return (
      <>
      <Screen>
        <H1>
          Phase debrief — Grade {d.grade}
        </H1>
        <MentorBubble
          mentor={host}
          line={`${d.headline} ${mentorReaction(host, debriefTone, d.optimalCount + d.score)}`}
          animateIn
        />
        <Card>
          <Meter label="Phase score" value={d.score} color={d.score >= 70 ? colors.good : colors.warn} suffix="/100" />
          <Body style={{ fontWeight: '600', marginTop: 6 }}>{d.headline}</Body>
        </Card>
        <Card>
          <Row k="Duration" v={`${d.finalDays} days (plan ${d.plannedDays} + ${d.slipAllowanceDays} allowance)`} />
          <Row k="Cost variance" v={`${fmtMoney(d.spentVariance)} vs ${fmtMoney(d.contingencyAllowance)} contingency`} />
          <Row k="Quality" v={`${d.quality}/100`} />
          <Row k="Open risk carried forward" v={`${d.risk}`} />
          <Row k="Optimal calls" v={`${d.optimalCount}/${d.decisionCount}`} />
        </Card>
        {d.notes.map((n, i) => (
          <TeachBox key={i}>{n}</TeachBox>
        ))}
        <H2>Run log</H2>
        {sim.log.map((l, i) => (
          <Card key={i} style={{ paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '600', flex: 1 }}>{l.title}</Body>
              <Tag
                label={l.kind === 'curveball' ? 'CURVEBALL' : l.optimal ? 'OPTIMAL' : l.acceptable ? 'WORKABLE' : 'COSTLY'}
                color={l.kind === 'curveball' ? colors.warn : l.optimal ? colors.good : l.acceptable ? colors.teal : colors.bad}
              />
            </View>
            <Small style={{ marginTop: 4 }}>{l.detail}</Small>
          </Card>
        ))}
        <Btn
          label="Run it again"
          onPress={() => {
            setSim(startState());
            setLastOutcome(null);
            setBanked(false);
          }}
        />
        <Btn label="Back to phases" kind="ghost" onPress={() => navigation.goBack()} />
      </Screen>
      <Celebrate
        visible={showCelebrate}
        title={`${phase.title.split('—').pop()?.trim() ?? 'Phase'} complete!`}
        subtitle={`Grade ${d.grade} · +${XP.simPhaseComplete}+ XP banked · buildings raised on the map`}
        onDone={() => setShowCelebrate(false)}
      />
      </>
    );
  }

  return (
    <Screen>
      <H1>{phase.title}</H1>
      <Card>
        <Meter
          label={`Schedule slip (allowance ${Math.round(phase.plannedDays * 0.08)}d)`}
          value={sim.slipDays}
          max={Math.max(30, sim.slipDays)}
          color={sim.slipDays <= phase.plannedDays * 0.08 ? colors.good : colors.bad}
          suffix="d"
        />
        <Meter
          label={`Cost variance (contingency ${fmtMoney(contingency)})`}
          value={sim.costVariance / 1000}
          max={Math.max(contingency / 1000, sim.costVariance / 1000)}
          color={sim.costVariance <= contingency ? colors.good : colors.bad}
          suffix="k"
        />
        <Meter label="Quality" value={sim.quality} color={sim.quality >= 70 ? colors.good : colors.warn} />
        <Meter label="Open risk exposure" value={sim.risk} max={Math.max(10, sim.risk)} color={sim.risk <= 2 ? colors.teal : colors.bad} />
      </Card>

      {/* advisor bar: spend CM Capital (earned by learning) on real help */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Body style={{ fontWeight: '600' }}>Advisors</Body>
          <Tag label={`B$ ${app.state.capital}`} color={colors.accent} />
        </View>
        <Small style={{ marginBottom: 4 }}>
          Spend the capital your studying earned. Each advisor once per phase.
        </Small>
        {ADVISORS.map((a) => {
          const used = sim.advisorsUsed.includes(a.id);
          const affordable = app.state.capital >= a.cost;
          return (
            <View key={a.id} style={{ marginTop: 6 }}>
              <Btn
                label={used ? `${a.label} ✓` : `${a.label} — B$${a.cost}`}
                kind={used ? 'ghost' : 'teal'}
                disabled={used || !affordable}
                style={{ marginTop: 0 }}
                onPress={() => {
                  if (app.spendCapital(a.cost)) {
                    impactFeedback('medium');
                    setSim((s) => (s ? applyAdvisor(s, a.id) : s));
                    setLastOutcome({ title: a.label, text: a.blurb, tone: 'good', mentorId: a.mentorId });
                  }
                }}
              />
              {!used && !affordable ? (
                <Small>Need B$ {a.cost} — earn capital in Learn and Math.</Small>
              ) : null}
            </View>
          );
        })}
      </Card>

      {lastOutcome && (
        <MentorBubble
          mentor={mentorById(lastOutcome.mentorId ?? host.id) ?? host}
          line={`${lastOutcome.text}${
            lastOutcome.mentorId
              ? ''
              : ` — ${mentorReaction(host, lastOutcome.tone, sim.log.length + lastOutcome.text.length)}`
          }`}
          animateIn
        />
      )}

      {pending ? (
        <>
          <Card style={{ borderColor: colors.warn }}>
            <Tag label="CURVEBALL" color={colors.warn} />
            <H2>{pending.title}</H2>
            <Body>{pending.description}</Body>
          </Card>
          {availableOptions(pending.choices ?? [], sim).map((o) => (
            <OptionRow
              key={o.id}
              label={o.label}
              detail={sim.revealEffects ? fmtEffectPreview(o.effects) : undefined}
              onPress={() => {
                const tone = o.optimal ? 'good' : o.acceptable ? 'warn' : 'bad';
                outcomeFeedback(tone);
                const next = resolveCurveball(phase, sim, o);
                setSim(next);
                setLastOutcome({
                  title: pending.title,
                  text: `${o.outcome} Lesson: ${pending.lesson}`,
                  tone,
                });
              }}
            />
          ))}
        </>
      ) : step ? (
        <>
          {sim.log.length === 0 && !lastOutcome ? (
            <>
              <MentorBubble mentor={host} line={phase.intro} animateIn />
              {sim.inheritedFlags.length > 0 || sim.carriedRisk > 0 ? (
                <Collapsible
                  tone="warn"
                  summary={`Your past follows you in — ${sim.inheritedFlags.length} standing decision${
                    sim.inheritedFlags.length === 1 ? '' : 's'
                  }${sim.carriedRisk > 0 ? `, +${sim.carriedRisk} open risk` : ''}`}
                >
                  Contracts signed, specs chosen, and shortcuts taken in earlier phases can arm or
                  defuse events here — and any open risk you finished the last phase carrying rides
                  forward into this one.
                </Collapsible>
              ) : null}
              {prep.qualified ? (
                <TeachBox tone="good">
                  ✅ Prep bonus active — you studied {prep.modules.map((m) => m.short).join(', ')} to{' '}
                  {prep.avgProficiency}%, so you start with {PREP_RISK_RELIEF} less risk. Knowing the
                  material before the decisions is what preparation buys.
                </TeachBox>
              ) : prep.modules.length > 0 ? (
                <Collapsible tone="teach" summary={`Prep tip — study before you run (now ${prep.avgProficiency}%)`}>
                  Take {prep.modules.map((m) => m.short).join(', ')} to 60%+ average proficiency
                  before running this phase and you start with reduced risk exposure. Learning is a
                  concrete in-game advantage, not homework.
                </Collapsible>
              ) : null}
            </>
          ) : null}
          <Small style={{ marginBottom: 4 }}>
            Decision {sim.stepIndex + 1} of {phase.steps.length}
          </Small>
          <Card>
            <H2>{step.title}</H2>
            <Body>{step.brief}</Body>
          </Card>
          {availableOptions(step.options, sim).map((o) => (
            <OptionRow
              key={o.id}
              label={o.label}
              detail={sim.revealEffects ? fmtEffectPreview(o.effects) : undefined}
              onPress={() => {
                const tone = o.optimal ? 'good' : o.acceptable ? 'warn' : 'bad';
                outcomeFeedback(tone);
                const next = chooseOption(phase, sim, o, defaultRng, app.state.settings.curveballFrequency);
                setSim(next);
                setLastOutcome({ title: step.title, text: o.outcome, tone });
              }}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

/** the QS's option pricing: shown before choosing once qs-review is bought */
function fmtEffectPreview(e: SimEffects): string {
  const parts: string[] = [];
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  if (e.days) parts.push(`${sign(e.days)} days`);
  if (e.cost) parts.push(`${e.cost > 0 ? '+' : '−'}${fmtMoney(Math.abs(e.cost))}`);
  if (e.quality) parts.push(`quality ${sign(e.quality)}`);
  if (e.risk) parts.push(`risk ${sign(e.risk)}`);
  return parts.length ? `QS estimate: ${parts.join(' · ')}` : 'QS estimate: no direct impact';
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 }}>
      <Small>{k}</Small>
      <Body style={{ fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</Body>
    </View>
  );
}
