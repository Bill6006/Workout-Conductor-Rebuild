# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 7 adds completed-workout history, evidence-led Progress, weekly planning, muscle coverage, exercise ranking, personal records, reusable saved workouts, and a complete Session Summary over the deterministic coaching and workout-execution foundation.

Only completed working records inform normal volume, strength, coverage, and PR evidence. Warm-ups, optional drop sets, incomplete drafts, and unfinished superset rounds remain excluded. Every insight exposes its sample size and confidence, and all data stays browser-local.

See [docs/analytics.md](docs/analytics.md) for the analytics contract and [docs/phase-reports/PHASE_7.md](docs/phase-reports/PHASE_7.md) for acceptance evidence.

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
