import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { modules, readyModules } from '../content';
import { mentorById } from '../content/mentors';
import { ACHIEVEMENTS, achievementById } from '../engine/achievements';
import { companyReputation, rankForXp, reputationTier } from '../engine/career';
import { LEARNING_PATH, nextOnPath, pathProgress } from '../engine/learningPath';
import { daysToGroundbreak, levelForXp, moduleProficiency } from '../engine/progress';
import { useAppState } from '../state/AppState';
import { Body, Btn, Card, H1, H2, Meter, Screen, Small, Tag, TeachBox } from '../ui/components';
import MentorBubble from '../ui/MentorBubble';
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

  // the Foreman's daily briefing: always surface the single most useful next move
  const nextStep = nextOnPath(app.state.moduleStats);
  const foreman = mentorById('foreman')!;
  const briefing =
    due > 0
      ? `${due} review ${due === 1 ? 'question is' : 'questions are'} due — knock those out first, boss. Easy capital and it keeps things stuck.`
      : nextStep
        ? `Next on your path is ${nextStep.short}. Get it to 70% and the next one opens up — that's how we build you from the ground up.`
        : `Your book learning's solid. Take the sim again and defend those grades — that's where it counts.`;

  return (
    <Screen>
      <H1>Solara Shores</H1>
      <Small style={{ marginBottom: 8 }}>Owner-developer training · Yamacraw Road, New Providence</Small>

      <MentorBubble mentor={foreman} line={briefing} animateIn />

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Body style={{ fontWeight: '600', color: colors.accent }}>B$ {app.state.capital}</Body>
          <Small>CM Capital — earned by learning (B$1 per 2 XP)</Small>
        </View>
        <Small style={{ marginTop: 2 }}>
          Spend it in the sim on advisors: QS option pricing, reserve releases, acceleration
          workshops. Studying literally funds better building.
        </Small>
      </Card>

      <CareerCard />

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

      <ChallengesCard />

      <LearningPathCard />

      <AchievementsCard />

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

/**
 * Daily challenge + weekly contract: the "come back tomorrow" loop. Each is a
 * bite-sized goal with a CM Capital reward, claimable once per period when
 * satisfied. Deterministic from the date, so it rotates predictably.
 */
function ChallengesCard() {
  const app = useAppState();
  // re-render on claim by reading a local tick
  const [, force] = React.useReducer((n) => n + 1, 0);
  const daily = app.dailyStatus();
  const weekly = app.weeklyStatus();

  const Row = ({
    kind,
    label,
    status,
  }: {
    kind: 'daily' | 'weekly';
    label: string;
    status: { challenge: { title: string; description: string; reward: number }; satisfied: boolean; claimed: boolean };
  }) => (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Small style={{ color: colors.text, fontWeight: '700' }}>{label}</Small>
        <Small style={{ color: colors.accent }}>+B${status.challenge.reward}</Small>
      </View>
      <Body style={{ fontWeight: '600' }}>{status.challenge.title}</Body>
      <Small>{status.challenge.description}</Small>
      {status.claimed ? (
        <Tag label="Claimed ✓" color={colors.good} />
      ) : status.satisfied ? (
        <Btn
          label={`Claim +B$${status.challenge.reward}`}
          kind="teal"
          onPress={() => {
            app.claimChallenge(kind);
            force();
          }}
        />
      ) : (
        <Tag label="Not yet — keep going" color={colors.muted} />
      )}
    </View>
  );

  return (
    <Card>
      <Body style={{ fontWeight: '600' }}>Challenges</Body>
      <Small>Bite-sized goals that pay CM Capital. They refresh each day and week.</Small>
      <Row kind="daily" label="TODAY" status={daily} />
      <Row kind="weekly" label="THIS WEEK" status={weekly} />
    </Card>
  );
}

/**
 * Career card: your Construction-Manager rank (the long climb) and your
 * company's reputation (the market's trust, which gates bigger projects).
 * Both read from the same signals as everything else — build well and study
 * deeply and they rise together.
 */
function CareerCard() {
  const app = useAppState();
  const rank = rankForXp(app.totalXp);
  const rep = companyReputation(app.readiness.knowledge, app.state.simRecords);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Body style={{ fontWeight: '700', color: colors.accent }}>{rank.rank.title}</Body>
        <Small>CM rank {rank.index + 1}/8</Small>
      </View>
      <Small style={{ marginBottom: 4 }}>{rank.rank.blurb}</Small>
      <Meter
        label={rank.next ? `Next: ${rank.next.title}` : 'Top of the ladder'}
        value={rank.fraction * 100}
        color={colors.accent}
        suffix="%"
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Body style={{ fontWeight: '600' }}>Company reputation</Body>
        <Tag label={reputationTier(rep)} color={rep >= 70 ? colors.good : colors.teal} />
      </View>
      <Meter label="" value={rep} color={rep >= 70 ? colors.good : colors.teal} suffix="%" />
      <Small style={{ marginTop: 2 }}>
        Reputation is 65% the grades you deliver on site and 35% what you know. It's what will
        unlock bigger developments in career mode.
      </Small>
    </Card>
  );
}

/**
 * Achievements: the milestone wall. Shows how many you've unlocked and the
 * next few still to chase — always another goal in view.
 */
function AchievementsCard() {
  const app = useAppState();
  const unlocked = new Set(app.state.achievements);
  const doneCount = unlocked.size;
  const nextUp = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id)).slice(0, 3);
  const recent = app.state.achievements.slice(-3).reverse();
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body style={{ fontWeight: '600' }}>Achievements</Body>
        <Small>
          {doneCount}/{ACHIEVEMENTS.length}
        </Small>
      </View>
      <Meter label="" value={doneCount} max={ACHIEVEMENTS.length} color={colors.good} />
      {recent.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {recent.map((id) => {
            const a = achievementById(id);
            if (!a) return null;
            return <Tag key={id} label={`${a.icon} ${a.name}`} color={colors.good} />;
          })}
        </View>
      ) : null}
      {nextUp.length > 0 ? (
        <>
          <Small style={{ marginTop: 6, color: colors.text, fontWeight: '600' }}>Next to unlock</Small>
          {nextUp.map((a) => (
            <Small key={a.id} style={{ marginTop: 2 }}>
              {a.icon} {a.name} — {a.description} (+B${a.reward})
            </Small>
          ))}
        </>
      ) : (
        <Small style={{ marginTop: 6, color: colors.good }}>
          Every achievement unlocked. You've done the whole board.
        </Small>
      )}
    </Card>
  );
}

/**
 * The Learning Path: all 33 modules in first-principles order — physics
 * intuition before trade science before project management. Shows where
 * you are and what's next.
 */
function LearningPathCard() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const app = useAppState();
  const steps = pathProgress(app.state.moduleStats);
  const doneCount = steps.filter((s) => s.done).length;
  const next = nextOnPath(app.state.moduleStats);

  return (
    <Card>
      <Body style={{ fontWeight: '600' }}>Learning Path</Body>
      <Meter
        label={`First principles → trade science → running the project`}
        value={doneCount}
        max={LEARNING_PATH.length}
        color={colors.teal}
        suffix={` / ${LEARNING_PATH.length}`}
      />
      {next ? (
        <>
          <Small style={{ marginTop: 4 }}>
            Next on the path: <Small style={{ color: colors.text, fontWeight: '600' }}>{next.short}</Small>{' '}
            ({next.proficiency}% — reach 70% to advance)
          </Small>
          <Btn
            label={`Study ${next.short}`}
            kind="teal"
            onPress={() => nav.navigate('Module', { moduleId: next.moduleId })}
          />
        </>
      ) : (
        <Small style={{ marginTop: 4, color: colors.good }}>
          Path complete — every module at 70%+. Keep the review queue clear and re-run the sim for
          the grades you want to defend.
        </Small>
      )}
    </Card>
  );
}
