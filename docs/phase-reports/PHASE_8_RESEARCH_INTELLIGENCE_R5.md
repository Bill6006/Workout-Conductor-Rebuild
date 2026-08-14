# Phase 8 R5 — Research-driven workout intelligence and drop-set repair

Status: **YELLOW — independent adversarial retest required**

Release: `0.8.9`

Build marker: `WC-P8R5-0814`

Phase 9 was not started. This work supersedes the planned R4 retest because the user added substantive Phase 8 requirements before that retest began.

## Requirement-to-implementation map

| ID        | Requirement                                            | Implementation                                                                                                                                                                                                                                                                 | Regression evidence                                                                                                              |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| P8-R5-001 | Make completion save semantics unambiguous             | A finished session remains save-gated and automatically enters Progress. The large ambiguous action is replaced by a small optional `Save routine to Plan` action with persisted idempotent state and a plain-language distinction.                                            | `ActiveWorkoutView`, saved-workout stable IDs/locks, App unit tests, Phase 8 rapid browser flow                                  |
| P8-R5-002 | Monthly attendance calendar with historical plan truth | Protected date-effective plan revisions store frequency, days, time zone, source, and effective local date. Plan renders a month grid with completed lime dots, elapsed scheduled-only misses, neutral rest/future dates, keyboard month navigation, and screen-reader labels. | `planning/calendar.test.ts`, protected backup/restore/tamper tests, R5 Android Chromium calendar scenario                        |
| P8-R5-003 | Replace the demo Safe Swap Preview                     | Catalog Alternative Finder uses the saved location/equipment, current active workout, dislikes, limitations, recent exposure, time, and conflict engine. It labels heuristic fit scores honestly and routes active replacements to the existing explicit confirmation path.    | alternative ranking tests, catalog coverage tests, R5 Alternative Finder browser scenario                                        |
| P8-R5-004 | Expand conventional exercise coverage                  | Catalog expands from 28 to 50 standard movements and from 15 to 21 patterns/equipment types, adding direct calf, knee-extension, hip-extension, trunk, assisted, machine, and equipment-specific alternatives.                                                                 | executable registry coverage matrix, catalog integrity/substitution/media tests, documented coverage matrix                      |
| P8-R5-005 | Drive recommendations from completed history           | A shared derivation supplies rolling 7/14/28-day exposure, effective volume, previous exercise IDs, and same-day workout position to initial generation, recalibration, and active alternatives.                                                                               | `historyContext.test.ts`, existing weekly-volume/recovery ranking tests, rendered history explanation                            |
| P8-R5-006 | Add honest time and structure choices                  | 15, 30, 45, 60, and profile-default durations share the hard budget estimator. Auto, Straight, Superset, and Drop-set choices change engine constraints without bypassing readiness, pain, equipment, or recovery.                                                             | generator duration ceilings, deterministic mode-constraint regression, R5 Android Chromium controls scenario                     |
| P8-R5-007 | Repair drop-set execution and coaching                 | Drop prescriptions distinguish load and bodyweight leverage methods, warn ahead, target a 25% unit-safe rounded reduction, remove ordinary rest before the drop, use a short transition cue, and save the technique separately from PR/base progression/base weekly volume.    | session load/kg/bodyweight/rest/analytics regressions, grouped ordering tests, rendered production-browser transition assertions |
| P8-R5-008 | Preserve evidence boundaries and tempo behavior        | The existing packaged/custom-GIF four-phase tempo system is unchanged. A dated research ledger maps evidence to rules and states uncertainty for volume, frequency, drop sets, rest, supersets, tempo, and variation.                                                          | all existing tempo, GIF, reduced-motion, persistence, backup, offline, and PWA suites; research ledger review                    |

## Data and migration

- IndexedDB advances from version 4 to 5 by adding the `planRevisions` protected store without deleting or rewriting an existing store.
- A current profile with no plan revision receives one migration baseline.
- Complete backups include `planRevisions`; invalid revision records are rejected before mutation.
- Older valid schema-v2 complete backups may omit only `planRevisions`. They normalize that new store to empty, restore exactly, and create a baseline from the restored profile on application reload.
- Drop records from older sessions are migrated to explicit intensity-technique evidence and excluded from base analytics.

## Research boundary

The implementation ledger is [PHASE_8_RESEARCH_LEDGER_2026-08-14.md](../research/PHASE_8_RESEARCH_LEDGER_2026-08-14.md). The exercise audit is [EXERCISE_COVERAGE_MATRIX_2026-08-14.md](../research/EXERCISE_COVERAGE_MATRIX_2026-08-14.md).

The engine does not promise the fastest possible hypertrophy, a universally optimal body-part frequency, superior drop-set growth, or a uniquely optimal tempo. Recommendations are deterministic local planning heuristics constrained by the user’s completed evidence, equipment, availability, limitations, readiness, recovery, and selected time.

## Verification

Final command counts, commit, asset, SHA-256, deployment verification, and tracker link are recorded in the repair handoff created after deployment.

## Manual gates

Earlier user-reported physical Android passes for valid backup/restore, true offline reload, GIF upload/persistence, portrait/landscape, software keyboard, text scaling, and runtime reduced motion remain historical evidence for the preceding release. They are not silently promoted to R5 results. Physical-keyboard operation and physical-device malformed/tampered restore rejection remain unpassed unless genuinely exercised.

Phase 8 remains YELLOW. No Phase 9 work or GREEN approval is authorized by this report.
