# Phase 8 Cutover Report

Status: **YELLOW — implementation complete; awaiting Android review**

Release: `0.8.2`

Build marker: `WC-P8R2-0811`

Repair status: the four findings left by the first hardening retest have implementation and regression-test closures. See the [Phase 8 retest repair report](phase-reports/PHASE_8_RETEST_REPAIR.md). Final approval remains withheld pending a separate adversarial retest.

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

## Data and privacy boundary

No backend, authentication, telemetry, remote media dependency, or real user record was added. Repository fixtures and screenshots use synthetic demo content. User data remains browser-local unless the user explicitly downloads a backup.

## Verification

The local release matrix passed: 133/133 unit and integration tests, 16/16 Android Chromium scenarios, lint, TypeScript, formatting, privacy scanning, production build, and built-asset/PWA verification. Browser coverage includes exact restore and rollback, valid restore, malformed/tampered restore rejection, true offline reload, semantic and keyboard operation, touch targets, responsive widths, and 200% zoom. The deployed commit is recorded in [PROJECT_STATUS.md](../PROJECT_STATUS.md). The acceptance contracts are documented in [data-safety.md](data-safety.md) and [pwa-and-accessibility.md](pwa-and-accessibility.md).

## Android review

The remaining gate is independent adversarial retesting plus hands-on review on the user's Android device: install or refresh the PWA, confirm the `WC-P8R2-0811` marker, retest the four open findings, exercise export/preview/rollback with synthetic or disposable data, test an interrupted active workout, and inspect the guide and 200% zoom behavior. No Phase 9 is defined.

## Evidence

- [Final Today screen](screenshots/phase-8/final-today-412x915.png)
- [Backup and diagnostics](screenshots/phase-8/data-safety-412x915.png)
- [Production exercise guide](screenshots/phase-8/production-guide-412x915.png)
- [Desktop data-safety view](screenshots/phase-8/data-safety-desktop-1265x900.png)
