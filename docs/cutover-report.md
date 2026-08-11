# Phase 8 Cutover Report

Status: **YELLOW — implementation complete; awaiting Android review**

Release: `0.8.1`

Build marker: `WC-P8H-0811`

Hardening status: all ten findings from the independent adversarial QA pass have implementation and regression-test closures. See the [Phase 8 hardening report](phase-reports/PHASE_8_HARDENING.md). Final approval remains withheld pending a separate adversarial retest.

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

## Data and privacy boundary

No backend, authentication, telemetry, remote media dependency, or real user record was added. Repository fixtures and screenshots use synthetic demo content. User data remains browser-local unless the user explicitly downloads a backup.

## Verification

Final command results and the deployed commit are recorded in [PROJECT_STATUS.md](../PROJECT_STATUS.md) after cutover. The acceptance contracts are documented in [data-safety.md](data-safety.md) and [pwa-and-accessibility.md](pwa-and-accessibility.md).

## Android review

The remaining gate is independent adversarial retesting plus hands-on review on the user's Android device: install or refresh the PWA, confirm the `WC-P8H-0811` marker, exercise export/preview/rollback with synthetic or disposable data, test an interrupted active workout, and inspect the guide and 200% zoom behavior. No Phase 9 is defined.

## Evidence

- [Final Today screen](screenshots/phase-8/final-today-412x915.png)
- [Backup and diagnostics](screenshots/phase-8/data-safety-412x915.png)
- [Production exercise guide](screenshots/phase-8/production-guide-412x915.png)
- [Desktop data-safety view](screenshots/phase-8/data-safety-desktop-1265x900.png)
