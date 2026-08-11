# Phase 8 Hardening — Adversarial QA Closure

Status: **YELLOW — awaiting independent adversarial retest**

Release: `0.8.1`

Build marker: `WC-P8H-0811`

Source handoff: `C:\Users\tyree\Downloads\Workout_Conductor_Phase_8_Adversarial_QA_Handoff.md`

## Finding closure

| Finding   | Severity | Resolution                                                                                                                                                          | Regression evidence                                                           |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| QA-P8-001 | Low      | Onboarding rejects invalid bodyweight with a focused, field-associated message and extracts concise schema errors.                                                  | `Onboarding.test.tsx`; hardening browser onboarding path                      |
| QA-P8-002 | High     | Moderate readiness raises RIR; low readiness raises RIR further, reduces sets/rounds, removes lower-priority work, and disables drop sets.                          | generator and recalibration tests; hardening browser readiness path           |
| QA-P8-003 | Medium   | Completed records require at least one repetition in the logger, session mutation, and persisted record schema.                                                     | `SetLogger.test.tsx`; session test; hardening browser logger path             |
| QA-P8-004 | Low      | Plate Math rejects non-finite or negative loads with an actionable result.                                                                                          | session/Plate Math test; hardening browser utility path                       |
| QA-P8-005 | High     | Set submission has synchronous component and active-view locks; saved workouts use stable logical IDs, deduplicated state, and in-flight locks.                     | logger, saved-workout, App, and hardening browser tests                       |
| QA-P8-006 | Medium   | Logger identity includes exercise identity and initial values ignore records belonging to the replaced exercise.                                                    | initial-value session test; replacement browser flow now asserts reset values |
| QA-P8-007 | High     | Onboarding and Settings share decimal-compatible native number behavior with `step="any"`.                                                                          | onboarding and App Settings tests; hardening browser decimal path             |
| QA-P8-008 | Medium   | Progress analytics receives the active unit system explicitly through every PR calculation.                                                                         | kilogram analytics regression test                                            |
| QA-P8-009 | Medium   | Exercise guides render through a modal portal with initial focus, focus containment, Escape dismissal, inert background, scroll lock, and opener-focus restoration. | `ExerciseGuide.test.tsx`; hardening keyboard browser path                     |
| QA-P8-010 | Low      | Logger defaults now come from the exact set slot, so warm-ups use their prescribed 4 RIR.                                                                           | initial-value session test; hardening browser warm-up path                    |

## Verification

- unit/integration: 119 passed across 17 files
- Android Chromium: 13 passed, including three dedicated Phase 8 hardening scenarios
- TypeScript, ESLint, production build, build artifact, formatting, privacy, offline/PWA, restore/rollback, responsive, and 200% zoom acceptance: passed
- repository fixtures and evidence remain synthetic

## Gate

The implementation team considers all ten reported findings resolved, but this is not final approval. A separate Codex conversation must retest the original handoff against the deployed `WC-P8H-0811` build. Phase 8 remains YELLOW and no Phase 9 has begun.
