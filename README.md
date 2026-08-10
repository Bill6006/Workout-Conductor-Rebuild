# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 5 adds a premium, browser-local workout execution experience on top of the Phase 4 recalibration engine. The active screen now supports one-tap prefilled Weight/Reps/RIR logging, exact inline corrections, programmed rest, verified resume, exercise guides and Alternatives, warm-ups, drop sets, cue memory, Plate Math, and combined two-move supersets with separate durable records.

The final move of the final superset round closes directly to the completion surface. Rest derives from a wall-clock target so temporary backgrounding and reload remain accurate, while pause time is excluded from workout elapsed time. Warm-ups are explicitly excluded from progression, PR, and working-volume evidence.

See [docs/active-workout.md](docs/active-workout.md) for the execution contract and [docs/phase-reports/PHASE_5.md](docs/phase-reports/PHASE_5.md) for acceptance evidence.

## Local development

```bash
npm install
npm run dev
```

Run the validation suite:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Privacy

Workout Conductor has no backend, remote authentication, analytics, or telemetry. Real workout history and personal settings stay in the user's browser. Never commit workout exports, backups, private notes, contact information, or real user history.

See [docs/PRIVACY.md](docs/PRIVACY.md) for repository and application data rules.

## Phase gate

Each phase is committed, deployed, tested, and marked **YELLOW** for Android review. Only the user can approve the next phase with `GREEN - NEXT PHASE`.
