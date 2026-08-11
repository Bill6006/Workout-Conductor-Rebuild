# Phase 8 — Final Data Safety, PWA, Accessibility, and Cutover

Status: **YELLOW — awaiting Android review**

Build marker: `WC-P8R2-0811`

Phase 8 completes the planned application. It adds exact and reversible local-data recovery, production offline media coverage, safe service-worker updates, final accessibility and zoom acceptance, and release evidence. The detailed release record is the [Phase 8 cutover report](../cutover-report.md).

The `0.8.2` repair release closes the four findings left by the first hardening retest. Closure evidence is in the [Phase 8 retest repair report](PHASE_8_RETEST_REPAIR.md); the phase remains YELLOW pending a separate retest.

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

Final command counts, deployment links, and the user review gate are maintained in [PROJECT_STATUS.md](../../PROJECT_STATUS.md).
