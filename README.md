# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 6 adds a deterministic, browser-local Adaptive Coach over the workout generator, recalibration engine, and durable active-session record. It evaluates readiness and recent qualifying sessions, recommends concrete next targets, detects repeated stalls without punishing one bad set, interprets recovery and fatigue, and protects manually corrected records.

The coach presents one prioritized recommendation and at most one main action. Swaps, deloads, volume changes, extra sets, and optional drop sets require athlete confirmation. Warm-ups, drop sets, and incomplete superset rounds are excluded from progression evidence.

See [docs/adaptive-coach.md](docs/adaptive-coach.md) for the coaching contract and [docs/phase-reports/PHASE_6.md](docs/phase-reports/PHASE_6.md) for acceptance evidence.

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
