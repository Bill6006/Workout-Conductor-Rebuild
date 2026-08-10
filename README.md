# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 4 adds one centralized, browser-local recalibration engine. The Today screen can now rebuild a whole pre-workout plan, repair only future work after the first completed set, or substitute one safe exercise when equipment is busy. Completed and explicitly locked work is immutable, Equipment Busy remains session-only, and every run starts from a recoverable snapshot.

Duration, location, equipment, pain/discomfort, recovery/readiness, settings, performance, target-load, skip, replacement, resume, and intensity changes share one typed request and trigger registry. The blocking evaluation overlay appears immediately, can be safely cancelled, and reports a compact result without using a server or remote model. Active workout logging and execution controls remain gated to Phase 5.

See [docs/recalibration-engine.md](docs/recalibration-engine.md) for the recalibration contract and [docs/phase-reports/PHASE_4.md](docs/phase-reports/PHASE_4.md) for acceptance evidence.

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
