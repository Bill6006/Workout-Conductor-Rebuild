# Phase 8 Cutover Report

Status: **YELLOW — implementation complete; awaiting Android review**

Release: `0.8.6`

Build marker: `WC-P8UXR2-0814`

Enhancement status: active workouts retain durable defer/return navigation, explicit missed-exercise finish consent, omission-safe summaries, and verified one-time celebration. The independently reproduced 42 px landscape shortcut regression is repaired with a 46 px minimum and actual bounding-box coverage. See the [Phase 8 UX enhancement report](phase-reports/PHASE_8_UX_ENHANCEMENT.md). Final approval remains withheld pending a separate adversarial retest and required physical-device/runtime gates.

## Release scope

- complete, raw-record backup of all nine protected stores and local settings
- no-change import preview, explicit confirmation, exact read-back verification, automatic failure rollback, and manual post-restore rollback
- safe migration of the documented v1 foundation export without deleting workout history or newer protected content
- verified writes for critical records, compact storage diagnostics, and temporary-only cleanup
- browser-local custom exercise, custom media, and Coach target schemas included in backup and recovery
- explicit PWA update prompt with active-workout deferral and offline app-shell acceptance
- project-owned offline demonstrations for every production-enabled exercise
- keyboard, naming, landmark, target-size, reduced-motion, responsive, and 200% zoom acceptance
- final Android-sized Today, data-safety, and exercise-guide evidence
- durable unit ownership and safe legacy migration across sessions, sets, Coach targets, backups, analytics, PRs, volume, and coaching
- deterministic set-slot idempotency, a cross-render rapid-action latch, and a 1–200 repetition boundary
- permanent keyboard-accessible Catalog navigation at mobile and landscape widths
- shared per-record unit conversion for aggregate analytics, completion summaries, PR volume, and rendered completed-session history cards
- compact sticky Current, Queue, Note, Plates, and Skip workout shortcuts
- durable prescription-level skipped and intentionally omitted state across grouped blocks, reload, pause/resume, backup, and restore
- explicit finish warning and omission accounting that cannot create analytics evidence
- save-gated one-time confetti with a nonanimated reduced-motion alternative
- focused Note and Plate Math sheets with redundant lower-page navigation removed
- deterministic persisted `Skip set` state with no synthetic analytics records
- verified per-exercise GIF overrides in protected custom media
- shared evidence-informed tempo recommendations and tempo-synchronized guide progress

## Data and privacy boundary

No backend, authentication, telemetry, remote media dependency, or real user record was added. Repository fixtures and screenshots use synthetic demo content. User data remains browser-local unless the user explicitly downloads a backup.

## Verification

The local release matrix passed: 155/155 unit and integration tests, 21/21 Android Chromium scenarios, lint, TypeScript, formatting, privacy scanning, production build, and built-asset/PWA verification. Browser coverage includes exact restore and rollback, malformed/tampered restore rejection, migration, true offline reload, semantic and keyboard operation, touch targets, responsive widths, rapid activation, durable exercise and set skips, explicit finish consent, GIF upload/reload, tempo synchronization, and reduced motion. The deployed commit is recorded in [PROJECT_STATUS.md](../PROJECT_STATUS.md). The acceptance contracts are documented in [data-safety.md](data-safety.md) and [pwa-and-accessibility.md](pwa-and-accessibility.md).

## Android review

The remaining gates are an independent adversarial retest plus hands-on review on the user's Android device: install or refresh the PWA, confirm `WC-P8UXR2-0814`, perform a true deployed-origin offline reload and restore-file flow, exercise all shortcuts and Catalog with a physical keyboard, verify runtime reduced-motion completion, upload a real GIF through Android file selection, and inspect browser chrome/text scaling/orientation changes. Automated exact-build equivalents pass but are not represented as substitutes for these manual gates. No Phase 9 is defined.

## Evidence

- [Final Today screen](screenshots/phase-8/final-today-412x915.png)
- [Backup and diagnostics](screenshots/phase-8/data-safety-412x915.png)
- [Production exercise guide](screenshots/phase-8/production-guide-412x915.png)
- [Desktop data-safety view](screenshots/phase-8/data-safety-desktop-1265x900.png)
