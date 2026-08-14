# Workout Conductor

Workout Conductor is a mobile-first, local-first intelligent workout coach. It is being built as a clean application using React, TypeScript, Vite, and a phased review process.

## Live app

https://bill6006.github.io/Workout-Conductor-Rebuild/

## Current scope

Phase 8 completes the planned application with exact and reversible local-data recovery, production offline exercise demonstrations, safe PWA updates, accessibility and 200% zoom acceptance, and final release polish over the deterministic coaching, workout-execution, and evidence-led progress foundation.

The current `0.8.8` build (`WC-P8UXR4-0814`) preserves the Phase 8 workout and data-safety work while making movement-guide tempo phase-accurate and visible for packaged or user-selected GIF media. It remains YELLOW until a separate adversarial retest confirms the deployed repair without regressing earlier Phase 8 behavior.

Complete backups cover every protected IndexedDB store and local setting, preserve unknown fields, and require a no-change preview plus explicit confirmation before restore. Critical saves and restores are read back and verified, failed restores roll back automatically, and all user data remains browser-local.

See the [Phase 8 cutover report](docs/cutover-report.md), [active-workout navigation enhancement report](docs/phase-reports/PHASE_8_UX_ENHANCEMENT.md), [data-safety contract](docs/data-safety.md), and [PWA/accessibility acceptance](docs/pwa-and-accessibility.md).

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

Each phase is committed, deployed, tested, and marked **YELLOW** for Android review. Phase 8 is the final planned phase; `GREEN - NEXT PHASE` approves the final build and does not begin a Phase 9.
