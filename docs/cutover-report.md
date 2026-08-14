# Phase 8 Cutover Report

Status: **YELLOW — implementation complete; awaiting Android review**

Release: `0.8.8`

Build marker: `WC-P8UXR4-0814`

Enhancement status: active workouts retain durable navigation and completion safety. This repair keeps the prescribed four-part tempo indicator visible with packaged or custom GIF media and makes each drain, hold, refill, and restart phase duration exact. See the [tempo-guide repair report](phase-reports/PHASE_8_TEMPO_GUIDE_REPAIR.md). Final approval remains withheld pending a separate adversarial retest.

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
- shared evidence-informed tempo recommendations and phase-accurate guide progress for packaged, uploaded, replaced, and removed GIF media
- original same-origin out-of-line profile migration with raw-record preservation, actionable unsupported-schema recovery, and active-position continuity
- exact focus restoration to mouse, touch, and keyboard modal launchers with a safe fallback
- post-round final drop ordering for supersets and circuits, including skip, defer, reload, pause/resume, and rapid activation
- complete backup validation and exact restore for original and migrated profiles together without weakening tamper rejection

## Data and privacy boundary

No backend, authentication, telemetry, remote media dependency, or real user record was added. Repository fixtures and screenshots use synthetic demo content. User data remains browser-local unless the user explicitly downloads a backup.

## Verification

The local release matrix passes the complete unit, integration, Android Chromium, lint, TypeScript, formatting, privacy, production-build, and PWA checks. Browser coverage includes original-origin migration and reload, exact focus return, grouped final-drop ordering, complete export/restore, rollback, malformed/tampered rejection, true offline reload, semantic and keyboard operation, touch targets, responsive widths, rapid activation, durable exercise and set skips, explicit finish consent, GIF upload/reload/removal, exact tempo phases, timer cleanup, and reduced motion. Final counts and the deployed identity are recorded in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Android review

The user manually passed deployed valid backup/restore, true offline reload, real Android GIF selection and persistence, portrait/landscape behavior, the Android software keyboard, text scaling, and runtime reduced motion on the preceding release. The custom-GIF tempo indicator reported during that review is repaired here and requires independent deployed retesting. Malformed/tampered restore rejection and physical-keyboard operation remain manual gates unless genuinely exercised. No Phase 9 is defined.

## Evidence

- [Final Today screen](screenshots/phase-8/final-today-412x915.png)
- [Backup and diagnostics](screenshots/phase-8/data-safety-412x915.png)
- [Production exercise guide](screenshots/phase-8/production-guide-412x915.png)
- [Desktop data-safety view](screenshots/phase-8/data-safety-desktop-1265x900.png)
