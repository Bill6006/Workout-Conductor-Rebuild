# Workout Conductor — Project Status

| Field                  | Status                                                                                                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository             | https://github.com/Bill6006/Workout-Conductor-Rebuild                                                                                                                                                                                                                                          |
| Permanent live app     | https://bill6006.github.io/Workout-Conductor-Rebuild/                                                                                                                                                                                                                                          |
| Current phase          | Phase 8 — Final Data Safety, PWA, Accessibility, and Cutover                                                                                                                                                                                                                                   |
| Current branch         | `main`                                                                                                                                                                                                                                                                                         |
| Latest completed phase | Phase 7 — approved GREEN by user                                                                                                                                                                                                                                                               |
| Work in progress       | Phase 8 implementation complete and YELLOW pending Android review                                                                                                                                                                                                                              |
| Build marker           | `WC-P8-0811`                                                                                                                                                                                                                                                                                   |
| Latest commit          | [Current `main` commit](https://github.com/Bill6006/Workout-Conductor-Rebuild/commits/main/)                                                                                                                                                                                                   |
| Latest deployment      | [GitHub Pages workflow](https://github.com/Bill6006/Workout-Conductor-Rebuild/actions/workflows/deploy-pages.yml)                                                                                                                                                                              |
| Tests                  | 106 unit/integration + 10 Android Chromium tests passed; lint, privacy, formatting, production build, build artifact, exact restore/rollback, legacy migration, controlled PWA update, offline reload, keyboard, reduced-motion, touch-target, 200% zoom, responsive, and visual checks passed |
| Known limitations      | Hands-on Android install and final user acceptance remain. The optional third-party axe package was not added because its registry certificate could not be verified; deterministic semantic acceptance remains in the release suite. No Phase 9 is defined.                                   |
| Phase 8 screenshots    | [Today](docs/screenshots/phase-8/final-today-412x915.png), [Data safety](docs/screenshots/phase-8/data-safety-412x915.png), [Production guide](docs/screenshots/phase-8/production-guide-412x915.png), [Desktop data safety](docs/screenshots/phase-8/data-safety-desktop-1265x900.png)        |
| Next concrete action   | Android review, then reply with `GREEN - NEXT PHASE`, `YELLOW - FIX: <issue>`, or `RED - STOP`. GREEN approves the final build and does not begin another numbered phase.                                                                                                                      |
| Last updated           | 2026-08-11 03:00 EDT                                                                                                                                                                                                                                                                           |

## Phase 8 acceptance

- [x] Complete exports include every protected store and local setting
- [x] Unknown fields survive exact backup and restore
- [x] Imports have a no-change preview and explicit confirmation
- [x] Restore read-back verification, automatic rollback, and manual rollback
- [x] Legacy v1 migration preserves workout history and newer protected content
- [x] Custom exercise, local media, exercise note, equipment, and Coach target recovery coverage
- [x] Critical saves complete only after schema validation and read-back
- [x] Compact storage diagnostic and temporary-only cleanup
- [x] Explicit PWA update prompt and unfinished-workout deferral
- [x] Install manifest, controlled service worker, and offline reload
- [x] Production-owned offline demonstration coverage for all enabled exercises
- [x] Semantic, keyboard, alternative-text, touch-target, and reduced-motion checks
- [x] Responsive widths plus 150% and 200% mobile zoom without horizontal overflow
- [x] Full automated suite and visually inspected Android-sized release evidence
- [x] Phase marked YELLOW for final user review; no Phase 9 started

## Evidence

![Workout Conductor Phase 8 backup and diagnostics](docs/screenshots/phase-8/data-safety-412x915.png)

The complete release record is in [docs/cutover-report.md](docs/cutover-report.md), with exact contracts in [docs/data-safety.md](docs/data-safety.md) and [docs/pwa-and-accessibility.md](docs/pwa-and-accessibility.md).

## Data-safety status

The repository contains application code, blank defaults, synthetic test fixtures, and synthetic presentation evidence only. Real profiles, workout records, notes, media, and Coach targets remain browser-local unless the user explicitly exports them.
