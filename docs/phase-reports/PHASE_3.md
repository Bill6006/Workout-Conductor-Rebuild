# Phase 3 Report — Workout Generation and Duration Intelligence

Status: **YELLOW — awaiting user Android review**

Phase 2 is approved GREEN. Phase 3 delivers the first real, deterministic workout generator on the Today screen. It uses the saved local profile and catalog intelligence to produce an explainable pre-workout plan without a server, account, random choice, or remote model call.

## Delivery

- Repository: https://github.com/Bill6006/Workout-Conductor-Rebuild
- Live app: https://bill6006.github.io/Workout-Conductor-Rebuild/
- Project status: https://github.com/Bill6006/Workout-Conductor-Rebuild/blob/main/PROJECT_STATUS.md
- Master issue: https://github.com/Bill6006/Workout-Conductor-Rebuild/issues/1
- Milestone: https://github.com/Bill6006/Workout-Conductor-Rebuild/milestone/1
- Engine contract: [workout-engine.md](../workout-engine.md)
- Combined evidence: [Phase 3 preview sheet](../screenshots/phase-3/combined-preview.svg)
- Android screenshots: [generator](../screenshots/phase-3/generator-412x915.png), [expanded plan](../screenshots/phase-3/generated-plan-412x915.png), and [15-minute plan](../screenshots/phase-3/duration-15-360x800.png)
- Desktop screenshot: [1280×900](../screenshots/phase-3/generator-desktop-1280x900.png)

## Generation owners

- Runtime-validated workout, prescription, warm-up, exercise-block, two-move-superset, and circuit schemas
- Deterministic input adapter for the profile, goals, schedule, location, equipment, preferences, limitations, technique settings, time, readiness, weekly volume, recent exposure, and progression continuity
- Goal- and frequency-aware weekly set targets across all 19 catalog muscles
- Recent-exposure recovery penalties based on catalog recovery windows and hard-set dose
- Exercise ranking after Phase 2 conflict exclusions, with scoring for need, goal fit, setup cost, preferences, and continuity
- Hybrid programming with explicit strength-anchor, hypertrophy-builder, specialization, and support roles
- Time estimation for preparation, ramp sets, setup, transitions, execution, rest, and drop-set work
- One 15 / 30 / 45 / Default duration control that immediately regenerates the pre-workout plan

## Technique and accounting safeguards

- Warm-ups are visibly planned and permanently excluded from progression, PR, and weekly working-volume accounting.
- Supersets contain exactly two separately identified prescriptions but render as one readable canonical list row.
- Superset validation rejects competing heavy lifts, shared primary muscles, grip overload, scarce-station conflicts, incompatible patterns, and shared joint stress.
- Drop sets are optional, final, catalog-safe, muscle-building-only, and limited to one.
- Circuits are optional, low-transition, General Fitness-only in short sessions, and exclude primary-strength moves.
- Direct working sets count at full volume, secondary-muscle sets at half volume, and warm-ups at zero.

## Verification

- ESLint: passed
- Prettier check: passed
- Privacy scan and production-build verification: passed
- Vitest: 49 of 49 app, storage, catalog, schema, conflict, ranking, generation, duration, volume, recovery, time, warm-up, superset, drop-set, and circuit tests passed
- Playwright Android project: 4 of 4 flows passed
- Supported widths: 360, 375, 412, and 430 px without horizontal overflow
- App-shell DOM readiness: asserted under 2 seconds in the local browser suite
- TypeScript and production PWA build: passed
- Phase 3 JavaScript bundle: approximately 379 kB / 109 kB gzip
- In-app browser at 360×800, 412×915, and desktop 1280×900: visually verified
- Browser console: no errors
- GitHub Pages: final Phase 3 commit deployed and verified on the permanent URL

## Deferred by phase boundary

- Phase 4 central recalibration, loading overlay, workout locks, remaining-plan repair, and rollback
- Phase 5 active set logging, one-tap replacement, timers, resume behavior, and demonstration playback
- Later history, analytics, coaching, and production media acceptance

## Review gate

Phase 4 has not started. Phase 3 remains YELLOW until the user responds with `GREEN - NEXT PHASE`.
