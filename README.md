# Solara Shores CM Trainer

A gamified construction-management training app for the owner-developer/CM of the
Solara Shores project (Yamacraw Road, New Providence, The Bahamas). Teaching tool
first, game second: every quiz question, math problem, and sim decision explains
the *why* — before or after the answer, never just a verdict.

Built with **Expo (React Native) + TypeScript**, local-first (AsyncStorage, no
backend), runnable in **Expo Go on iOS** during development.

## Run it

```bash
npm install
npm start          # scan the QR code with Expo Go on your iPhone
                    # from a Codespace/remote box, add: -- --tunnel
```

```bash
npm test           # unit tests: engines + content validation
npm run typecheck  # tsc --noEmit
```

The `start`/`android`/`ios`/`web` scripts invoke
`node ./node_modules/expo/bin/cli` directly (not the bare `expo` command),
so a stale **global `expo-cli`** elsewhere on your `PATH` can't shadow them —
this project is Expo SDK 54 (matched to the Expo Go build on the test
device); the old global `expo-cli` package caps at SDK 46 and is deprecated
upstream.

> **Running from a Codespace / cloud dev box?** LAN mode hands your phone a
> private `10.x`/`exp.direct` address it can't reach. Use `npm start -- --tunnel`
> (needs `@expo/ngrok`), or forward port **8081** as **Public** in the VS Code
> Ports panel and open that `https://…app.github.dev` URL in Expo Go. The
> isometric map needs `react-native-svg` and haptics need `expo-haptics` —
> both ship in Expo Go, so no custom dev build is required.

### Still seeing "SDK 46" / metro TerminalReporter errors?

That means something ran the bare `expo` binary directly instead of an npm
script (e.g. you typed `expo start` yourself, or another tool in your
Codespace invoked it). Diagnose and fix:

```bash
which -a expo                     # if this lists more than one path, a
                                   # global expo-cli is shadowing the local one
npm ls -g --depth=0 | grep expo-cli
npm uninstall -g expo-cli
hash -r                           # clear your shell's cached command lookup

# confirm the LOCAL SDK 54 CLI is what actually runs:
node ./node_modules/expo/bin/cli --version   # should print 54.x

npm start -- --tunnel             # always use the npm script, not bare `expo`
```

If `node ./node_modules/expo/bin/cli --version` doesn't print `54.x`,
`node_modules` is out of sync with `package.json` — run
`rm -rf node_modules && npm install` and try again.

## The three systems

1. **Knowledge modules (Learn tab)** — 33 modules across three KB volumes:
   Vol 1 the project (M1–M14), Vol 2 trade-level construction science
   (S1–S10: compaction, concrete, rebar, masonry, formwork, wind detailing,
   MEP, asphalt, marine durability, surveying), Vol 3 the physics backbone
   (V3-1..9: loads, lateral systems, buoyancy, settlement, movement, crack
   diagnosis, coastal processes, fire/egress, climate & materials). Vol 2/3
   content is **dual-register**: PLAIN (the mechanism, simply) paired with
   PRO (field vernacular), so you learn to speak the trade, not just
   understand it. Explainer sections, then mixed quizzes: multiple
   choice, sequencing ("put these phases in order"), and subcontract-vs-direct-manage
   scenarios. Every question has a `teach` blurb before and an `explanation`
   after — right or wrong. Missed questions enter a **Leitner spaced-repetition
   queue** (10 min → 1 day → 3 days → 7 days) surfaced on the Home tab. A
   **Readiness Exam** on the Home tab samples 12 questions across all modules,
   weighted toward your weakest — the whole-project test.

2. **Budget & math engine (Math tab)** — problems generated fresh from each
   module's real planning numbers. Eight generators: unit rate, percent-of,
   landed cost (FOB → freight → duty → CPF → VAT), takt/throughput, mass
   balance, retainage, crew ratio, and multi-step estimate build-ups.
   Difficulty scales 1→3 (4 of the last 5 right at your frontier unlocks the
   next level), and a running **estimating accuracy** stat (mean |% error|)
   tracks calibration over time. Every problem shows a full worked solution.

3. **Subdivision simulation (Sim tab)** — the actual project, phase by phase,
   on a **living isometric site map** (`ui/IsoSiteMap.tsx`, projection math in
   `engine/iso.ts`): the real master-plan parcels render in 2.5D and *extrude
   into shaded buildings that rise out of the ground* as you complete phases —
   tap any parcel for its build status. Phases unlock sequentially (the
   critical path is the critical path). Playable now:
   - **Phase 1 — Enabling Works & Site Prep**: six decision gates (CEC timing,
     geotech, rock classification, crusher, QA lab, hurricane prep) plus a
     curveball pool (karst void, rock claim, storm warning, permit query, sub
     no-show, wet month).
   - **Phase 2 — Marine Excavation & First Horizontal**: marine contract
     packaging, dry-cut-vs-early-breach, EMP flow-down, underwater QA
     (bathymetric surveys), WWTP procurement form, and the transformer order —
     with curveballs to match (lost mobilization, turbidity standby, bulkhead
     rework, canal karst, factory slip, WWTP design gaps).

   All seven phases are playable, sequentially unlocked, and — the core
   design — **decisions track ACROSS phases**: choices set persistent flags
   stored with each completed run; later phases inherit them (plus leftover
   open risk). A Phase 2 EMP contract clause decides who pays for the Phase 4
   turbidity stoppage; Phase 3's HVAC sizing decides Phase 7's mold cluster;
   Phase 7 (handover/warranty) surfaces every long-fuse shortcut. Curveballs
   can be armed, defused, or cost-modified by flags (`armedByFlags` /
   `defusedByFlags` / `flagModifiers`), and the flag graph is validated
   closed in CI. Choices move six meters — schedule slip, cost variance,
   quality, **safety**, **crew morale**, and open risk — with no game-overs:
   debriefs grade against realistic allowances and explain every call. Safety
   is the non-negotiable meter: taking on risk erodes it automatically and a
   low final safety score penalises the whole grade (you can't buy back an
   unsafe job). A **Weather Desk** on the Sim tab
   carries V3-9's task-gating table (which trades die on which forecast),
   implemented as an engine lookup ready for day-based sim ticks.

**Gamification** is framed on the real goal: a **Project Readiness** score
(50% knowledge / 25% estimating / 25% sim) with a countdown to the September 1
groundbreak, plus XP/levels per module. No streaks, no arbitrary badges.

**CM Capital (B$)** is the spendable currency: every learning activity earns
B$1 per 2 XP, and it's spent *inside sim runs* on advisor actions that mirror
real CM practice — **Bring in the QS** (option cost/schedule impacts priced
before you choose, the leveling-sheet view), **Release management reserve**
(−$300K cost variance), and an **Acceleration workshop** (recovers 5 days of
slip). Each once per phase. Studying literally funds better building.

Two interlocks tie learning to the sim:
- **Prep bonus** — each phase has linked study modules (`engine/prep.ts`);
  reach 60% average proficiency across them before running the phase and you
  start with reduced risk exposure.
- **Learning Path** — all 33 modules in first-principles order (site → physics
  intuition → trade science → coast → production → running the business), with
  a next-step card on Home. Each module's PLAIN register assumes only what
  earlier path entries taught.

## Game feel

Teaching still comes first, but the delivery is built to draw you in:

- **Mentor characters** (`content/mentors.ts`, `ui/MentorBubble.tsx`) — the
  "why" is spoken by a named cast with a point of view: **Deacon** the site
  foreman gives your daily briefing on Home, **Dr. Rolle** (geotech),
  **Cap** (marine super), **Ing. Adderley** (structural engineer),
  **Marguerite** (QS), and **You** (owner) host the phases they own and react
  to every decision you make. They frame the facts; the facts still live in
  the module/sim JSON.
- **Decision-first cards** (`Collapsible`) — screens lead with the choice and
  its stake; the reasoning tucks behind a "Why this matters" tap, so nothing
  reads as a wall of text.
- **Juice** — animated gauge meters, `expo-haptics` on every graded outcome
  (success / warning / error patterns), and a confetti **phase-complete
  celebration**. All built on React Native's `Animated`, so it runs in Expo
  Go with no custom native build.

## Progression, economy & career

The long game — every loop keeps a next goal in view, and the way to hit it is
always to understand the construction better.

- **CM rank** (`engine/career.ts`) — an 8-rung ladder (Site Cadet →
  Development Director) off total XP, shown on Home with progress to the next.
- **Company reputation** — 65% the grades you deliver on site, 35% what you
  know. It's the hook that will gate bigger projects in career mode.
- **Achievements** (`engine/achievements.ts`) — 14 data-driven milestones
  across learning, estimating, building and career; each pays CM Capital and
  is evaluated from a pure state snapshot, so adding one is a one-line append.
- **Daily challenges & weekly contracts** (`engine/challenges.ts`) —
  bite-sized goals drawn deterministically from the date, claimable once per
  period for CM Capital.
- **Adaptive mentor** (`engine/mentorGuidance.ts`) — assistance scales with
  your mastery of a topic: coaching → guiding → nudging → observing. Low levels
  prompt reasoning ("name the failure mode") instead of handing you the answer;
  as you master a module its mentor visibly steps back.
- **Estate build progress** — a live "% built" gauge on the site map so you
  watch the development emerge as phases complete.

Everything above reads from the same signals as the readiness score, so there
is exactly one source of truth for "where the player is."

## Content architecture — how to drop research in

All project knowledge lives in JSON under `src/content/` — app code never
hardcodes project facts.

```
src/content/
  schema.ts                 # the content contract (types, documented)
  validate.ts               # runtime shape checks, run by the test suite
  index.ts                  # registry — list new files here
  modules/m01-….json … m14-….json
  sim/phase1-site-prep.json
```

Each module JSON has: `sections` (explainers), `quiz` (three question types),
`mathVariables` (numeric ranges), `mathProblems` (generator bindings),
`decisionPoints` (scenario + options + debrief). A module may ship with
`"status": "placeholder"` and empty arrays — the app runs end-to-end and shows
it as "content pending" until research lands.

To update or add content: edit the JSON, run `npm test` (content validation
will name any structural problem precisely: missing explanations, no correct
choice, unknown math variable references, un-marked optimal options), and
reload. No component changes needed.

To add a **sim phase**: create `src/content/sim/phaseN-….json` following the
`SimPhase` type, register it in `index.ts`, and it appears in the Sim tab.
Steps, options, effects, and curveballs (with `arms`/`defuses` links) are all
data.

To add a **math generator** (a new formula family): implement it in
`src/engine/mathGen.ts`, add its id to `schema.ts` and `validate.ts`, and bind
it from module JSON.

## Numbers disclaimer

All numeric variables are planning-level calibrations for training — realistic
order-of-magnitude for New Providence, but every one must be validated against
actual quotes and a local quantity surveyor before real budgeting (see the
knowledge base's Appendix B validation list).
