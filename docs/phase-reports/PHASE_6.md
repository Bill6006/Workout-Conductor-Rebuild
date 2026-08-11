# Phase 6 — Adaptive Coaching and Progression

Status: **YELLOW — awaiting Android review**

Build marker: `WC-P6-0810`

## Delivered

- deterministic progression engine using recent qualifying completed sessions
- double, load, rep, and confirmed set progression
- next targets using load, reps, rep range, RIR, stability, goal, progression family, and practical increments
- readiness check for energy, soreness, sleep, joint discomfort, motivation, and time pressure
- fatigue/recovery and whole-session feedback interpretation
- repeated-failure regression and single-exercise micro-deload guidance without punishing one poor set
- one gold Adaptive Coach surface with exact priority arbitration, one main action maximum, and concise Why evidence
- pain-first handling with confirmed alternatives for unfinished work
- manual-edit protection and actual completed records as truth
- progression continuity across Alternatives in the same movement family
- complete two-move superset evidence and incomplete next-round exclusion
- duration/readiness-aware evidence using only 15, 30, 45, and Default modes
- load, rep, fatigue, recovery, exercise-fit, and weekly-coverage diagnostics
- intelligent rest evidence and confirmed +30-second rest adjustment
- safe optional drop-set recommendation and confirmation
- compact local session feedback
- local history loading without persisted analysis snapshots

## Safety and privacy

No swap, deload, set increase/decrease, drop set, or material target change is applied without athlete confirmation. Existing completed and corrected records remain unchanged. No backend, account, analytics, telemetry, or committed real workout data was added.

## Verification

- ESLint: passed
- TypeScript and production build: passed
- Unit/integration: 97 passed
- Android browser scenarios: 6 passed
- Responsive widths: 360, 375, 412, and 430 CSS px passed
- Effective 240 CSS px layout for 150% zoom passed without horizontal overflow
- Phase 6 screenshots visually inspected

## Evidence

- [Readiness Coach](../screenshots/phase-6/readiness-coach-412x915.png)
- [Active Coach](../screenshots/phase-6/active-workout-412x915.png)
- [Confirmation](../screenshots/phase-6/coach-confirmation-412x915.png)
- [360 px logger](../screenshots/phase-6/set-logging-360x800.png)
- [Alternatives](../screenshots/phase-6/alternatives-412x915.png)
- [Superset](../screenshots/phase-6/superset-412x915.png)
- [Pause/resume](../screenshots/phase-6/paused-resume-412x915.png)
- [Desktop](../screenshots/phase-6/active-workout-desktop-1280x900.png)
