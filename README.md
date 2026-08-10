# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 3 adds deterministic, browser-local workout generation. The Today screen now turns the saved profile, goals, schedule, location, equipment, limitations, weekly-volume state, recent muscle exposure, preferences, and technique toggles into a complete pre-workout plan for 15, 30, 45, or the athlete's default duration.

Generated plans combine progression anchors with hypertrophy and specialization roles, estimate setup/work/rest time, attach non-working warm-ups, and can safely build two-move supersets, final drop sets, or goal-compatible circuits. Central in-workout recalibration, active logging, and production demonstration coverage remain gated to later phases.

See [docs/workout-engine.md](docs/workout-engine.md) for the deterministic generation contract and [docs/phase-reports/PHASE_3.md](docs/phase-reports/PHASE_3.md) for acceptance evidence.

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
