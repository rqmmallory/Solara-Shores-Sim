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
this project is Expo SDK 57; the old global `expo-cli` package caps at SDK 46
and is deprecated upstream.

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

# confirm the LOCAL SDK 57 CLI is what actually runs:
node ./node_modules/expo/bin/cli --version   # should print 57.x

npm start -- --tunnel             # always use the npm script, not bare `expo`
```

If `node ./node_modules/expo/bin/cli --version` doesn't print `57.x`,
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
   with a visual **site-progress map** that fills in as phases complete, and
   sequential phase unlocking (the critical path is the critical path).
   Playable now:
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
   closed in CI. Choices move four meters — schedule slip, cost variance,
   quality, open risk — with no game-overs: debriefs grade against realistic
   allowances and explain every call. A **Weather Desk** on the Sim tab
   carries V3-9's task-gating table (which trades die on which forecast),
   implemented as an engine lookup ready for day-based sim ticks.

**Gamification** is framed on the real goal: a **Project Readiness** score
(50% knowledge / 25% estimating / 25% sim) with a countdown to the September 1
groundbreak, plus XP/levels per module. No streaks, no arbitrary badges.

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
