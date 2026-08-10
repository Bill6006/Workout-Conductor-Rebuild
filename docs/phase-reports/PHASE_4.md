# Phase 4 Report — Central Recalibration Engine

Status: **GREEN — approved by user on 2026-08-10**

Phase 3 is approved GREEN. Phase 4 delivers one typed, deterministic recalibration path for whole-plan rebuilds, future-only repairs, and one-slot substitutions. All computation remains browser-local.

## Delivery

- Repository: https://github.com/Bill6006/Workout-Conductor-Rebuild
- Live app: https://bill6006.github.io/Workout-Conductor-Rebuild/
- Project status: https://github.com/Bill6006/Workout-Conductor-Rebuild/blob/main/PROJECT_STATUS.md
- Master issue: https://github.com/Bill6006/Workout-Conductor-Rebuild/issues/1
- Engine contract: [recalibration-engine.md](../recalibration-engine.md)
- Combined evidence: [Phase 4 preview sheet](../screenshots/phase-4/combined-preview.svg)
- Mobile evidence: [loading overlay](../screenshots/phase-4/calibration-loading-412x915.png), [15-minute result](../screenshots/phase-4/recalibration-412x915.png), [Equipment Busy](../screenshots/phase-4/equipment-busy-412x915.png), and [360×800](../screenshots/phase-4/recalibration-360x800.png)
- Desktop evidence: [1280×900](../screenshots/phase-4/recalibration-desktop-1280x900.png)

## Engine owners

- Strict completed-work, snapshot, request, trigger, result, and change-summary types
- Registry for 22 duration, location, equipment, station, replacement, skip, pain/discomfort, performance, target-load, technique, readiness, time, resume, and intensity triggers
- Full, partial, and one-slot local scopes selected centrally
- Existing Phase 3 generation and alternative-ranking engines reused instead of duplicated
- Stable IDs transferred to unchanged prescriptions so unaffected rows remain visually stable
- Remaining-time accounting based on target duration, elapsed time, completed sets, locks, setup, work, and rest

## Safety and behavior

- Completed sets/exercises, loads, reps, RIR, PR references, notes, and locked exercise identity are preserved.
- Current work locks after the first completed set; pinned, selected, and accepted alternatives cannot be silently substituted.
- An accepted target load changes future guidance only and retains the logged record.
- Equipment Busy changes one compatible slot for the current session and is never persisted to the location.
- Pain/discomfort and equipment/station conflicts regenerate only the unlocked future where completed truth exists.
- Impossible exact-time requests show the closest realistic plan with an explicit overage warning.
- Every request starts from an immutable snapshot and rolls back atomically on failure.

## User experience

- Blocking loading state appears before calculation and names the trigger.
- Evaluation messages explain what is being checked.
- **Keep current workout** safely cancels before mutation and resets the changed control.
- Success highlights changed rows and reports local/partial/full scope, runtime, protected work, and a compact summary.
- The engine has no network dependency and no artificial multi-second loading delay.

## Verification

- ESLint: passed
- Prettier check: passed
- Privacy scan and production-build verification: passed
- TypeScript and production PWA build: passed
- Focused recalibration and UI regression tests: 31 passed
- Full Vitest suite: 74 of 74 tests passed across 8 files
- Playwright Android project: 4 of 4 flows passed
- Local engine performance assertions: local under 250 ms; full under 700 ms
- Supported widths: 360, 375, 412, and 430 px without horizontal overflow
- In-app browser: loading, cancellation affordance, 15-minute full recalibration, one-slot Equipment Busy substitution, 360×800, 412×915, and 1280×900 visually verified
- Browser console: no errors
- Phase 4 JavaScript bundle: approximately 402 kB / 115 kB gzip
- Pages deployment and live-PWA checks are recorded in the Phase 4 commit and master issue

## Deferred by phase boundary

- Active set logging and completed-set editing
- Workout execution controls, timers, pause/resume, and finish-early interaction
- Exercise demonstration media and production playback acceptance
- History, analytics, coaching, and later platform work

## Review gate

Phase 4 was approved with `GREEN - NEXT PHASE`. Phase 5 proceeded under its own review gate.
