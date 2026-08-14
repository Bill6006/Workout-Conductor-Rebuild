# Phase 8 — Final Data Safety, PWA, Accessibility, and Cutover

Status: **YELLOW — awaiting Android review**

Build marker: `WC-P8UX-0814`

Phase 8 completes the planned application. It adds exact and reversible local-data recovery, production offline media coverage, safe service-worker updates, final accessibility and zoom acceptance, and release evidence. The detailed release record is the [Phase 8 cutover report](../cutover-report.md).

The `0.8.4` UX enhancement adds durable prescription-level defer/return, an accessible sticky workout navigator, explicit missed-exercise finish consent, omission-safe analytics, and verified one-time celebration. Evidence is in the [active-workout navigation enhancement report](PHASE_8_UX_ENHANCEMENT.md); the phase remains YELLOW pending another separate retest.

## Acceptance summary

- all protected stores and settings participate in complete backup and exact restore
- unknown fields survive round trips; invalid imports cannot mutate local data
- legacy v1 migration preserves newer workout and custom-content stores
- restore points support automatic failure recovery and explicit manual rollback
- safe cleanup is restricted to temporary recovery records
- service-worker updates require explicit action and defer during unfinished workouts
- the installable app reloads offline with all enabled exercise demonstrations local
- semantic, keyboard, reduced-motion, target-size, responsive, and 200% zoom checks pass
- final synthetic screenshots have been visually inspected
- skipped exercises survive reload and pause/resume and can be returned without losing completed records
- intentional omissions require confirmation and remain outside volume, PR, and progression evidence
- verified completion celebrates once, with a reduced-motion alternative

Final command counts, deployment links, and the user review gate are maintained in [PROJECT_STATUS.md](../../PROJECT_STATUS.md).
