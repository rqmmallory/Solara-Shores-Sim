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
```

```bash
npm test           # 42 unit tests: engines + content validation
npm run typecheck  # tsc --noEmit
```

## The three systems

1. **Knowledge modules (Learn tab)** — one module per section of the research
   knowledge base (14 total). Explainer sections, then mixed quizzes: multiple
   choice, sequencing ("put these phases in order"), and subcontract-vs-direct-manage
   scenarios. Every question has a `teach` blurb before and an `explanation`
   after — right or wrong. Missed questions enter a **Leitner spaced-repetition
   queue** (10 min → 1 day → 3 days → 7 days) surfaced on the Home tab.

2. **Budget & math engine (Math tab)** — problems generated fresh from each
   module's real planning numbers. Eight generators: unit rate, percent-of,
   landed cost (FOB → freight → duty → CPF → VAT), takt/throughput, mass
   balance, retainage, crew ratio, and multi-step estimate build-ups.
   Difficulty scales 1→3 (4 of the last 5 right at your frontier unlocks the
   next level), and a running **estimating accuracy** stat (mean |% error|)
   tracks calibration over time. Every problem shows a full worked solution.

3. **Subdivision simulation (Sim tab)** — the actual project, phase by phase.
   Phase 1 (Enabling Works & Site Prep) is fully playable: six decision gates
   (CEC timing, geotech, rock classification, crusher, QA lab, hurricane prep)
   plus a curveball pool (karst void, rock claim, storm warning, permit query,
   sub no-show, wet month) with tunable frequency. Choices move four meters —
   schedule slip, cost variance, quality, open risk — and can **arm** or
   **defuse** later curveballs. No game-overs: the debrief grades the run
   against realistic slip/contingency allowances and explains every call.
   Phases 2–8 are added one at a time as pure data files once the prior phase
   plays well.

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
