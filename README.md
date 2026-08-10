# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 2 adds a curated, runtime-validated exercise catalog; muscle, movement, equipment, and progression models; reusable conflict validation; deterministic alternative ranking; strict custom exercise/media schemas; and an original development-media manifest with documented licensing. The live Workout tab exposes a safe catalog and one-slot swap preview without claiming to generate or mutate workouts.

Workout generation, central recalibration, active logging, and production demonstration coverage remain gated to later phases.

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
