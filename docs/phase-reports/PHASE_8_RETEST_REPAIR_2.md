# Phase 8 Final Mixed-Unit History Repair

Status: **YELLOW — awaiting independent adversarial retest**

Release: `0.8.3`

Build marker: `WC-P8R3-0811`

Source handoff: `C:\Users\tyree\Downloads\Workout_Conductor_Phase_8_Independent_Adversarial_Retest_Handoff.md`

## Finding closure

| Finding    | Severity | Resolution                                                                                                                                                                                                                                                                                                                                                          | Regression evidence                                                                                                                                                                                                           |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-P8R-011 | High     | Completed-session history cards now call the exported `sumRecordVolume` analytics helper. The helper converts every contributing record from its persisted `weightUnit` into the selected display unit before multiplying by repetitions and summing. The card therefore shares the same calculation path as aggregate analytics instead of relabeling a raw total. | Rendered React coverage for `43 lb × 9 → 176 kg`, `20 kg × 10 → 441 lb`, mixed lb/kg records, and lb→kg→lb display round trips; Android Chromium production flow asserts `176 kg`, rejects `387 kg`, and returns to `387 lb`. |

## Preserved scope

The other twelve independently tested findings remain covered. No set-submission, migration, repetition-boundary, Catalog, onboarding, readiness, plate-math, replacement, bodyweight, milestone, guide-focus, warm-up, backup/restore, PWA, privacy, or accessibility behavior was de-scoped.

## Verification

- 136/136 unit and integration tests passed across 19 files.
- 16/16 Android Chromium scenarios passed, including the exact repaired completion sequence.
- Exact complete export/import/restore, read-back verification, rollback, valid restore, and malformed/tampered restore rejection passed using browser file selection.
- A true offline reload passed under safe browser network emulation.
- Semantic navigation, keyboard operation, reduced motion, touch targets, responsive widths, landscape layout, and 200% zoom passed.
- ESLint, TypeScript, formatting, privacy scanning, production build, and built-asset/PWA verification passed.
- Fresh Phase 8 screenshots were regenerated and visually inspected with `WC-P8R3-0811`.
- A separate in-app-browser walkthrough completed `43 lb × 9`, switched to kg, and confirmed both aggregate and completed-session history volume as `176 kg` with the new marker visible.

## Release gate

This implementation closure is not approval. A separate conversation must adversarially retest the deployed `WC-P8R3-0811` build, with special attention to completed-session volume under preference changes while preserving the other twelve passes. Phase 8 remains YELLOW, and no Phase 9 has begun.
