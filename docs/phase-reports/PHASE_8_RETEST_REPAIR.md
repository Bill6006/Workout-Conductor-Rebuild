# Phase 8 Adversarial Retest Repair

Status: **YELLOW — awaiting independent adversarial retest**

Release: `0.8.2`

Build marker: `WC-P8R2-0811`

Source handoff: `C:\Users\tyree\Downloads\Workout_Conductor_Phase_8_Adversarial_QA_Retest_Handoff.md`

## Open-finding closure

| Finding    | Severity | Resolution                                                                                                                                                                                                                                                                                                                                        | Regression evidence                                                                                                                                     |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-P8-005  | High     | Set records use deterministic slot identities, active sessions reject duplicate slot records, stale slot replays are no-ops, and the shared action latch remains closed across the browser double-click window so a second activation cannot land on the newly rendered next set.                                                                 | Session idempotency/schema tests; App click-through test; browser coverage for warm-up, ordinary set, superset round, Today save, and completion save   |
| QA-P8R-011 | High     | Sessions, set records, and Coach targets persist their recorded unit. Legacy records are stamped once from their accompanying saved settings. Mixed-unit analytics, PRs, volume, estimated strength, and Coach loads convert before comparison or aggregation; an active workout retains its original unit across preference changes and reloads. | lb/kg legacy storage migration; Coach-target migration; mixed-unit analytics and coaching tests; browser lb→kg→lb and reload path; exact backup/restore |
| QA-P8R-012 | Medium   | New logs, corrections, schemas, Coach targets, persistence, and imports accept only 1–200 whole reps. On-device legacy extreme records are recoverably flagged, retain the original value, and are excluded from PR, volume, and coaching evidence until corrected.                                                                               | Logger, session, storage migration, and tampered-backup tests; browser 999-rep rejection                                                                |
| QA-P8R-013 | Medium   | Catalog is a permanent sixth primary-navigation destination with active-page semantics, keyboard activation, touch sizing, and responsive coverage at mobile and landscape widths.                                                                                                                                                                | App navigation test; semantic/touch-target acceptance; browser 360×800 and 915×412 checks                                                               |

## Data migration contract

- Active-session schema v2 stores `weightUnit` on both the session and every set record.
- Existing schema-v1 sessions are stamped using the settings stored beside them; their numeric load is never relabeled or rewritten.
- Mixed-unit history is converted only at the analytics/coaching calculation boundary.
- Existing out-of-range repetitions are preserved as `legacyInvalidReps`, excluded from evidence, and exposed for correction instead of blocking application startup.
- Complete backups preserve the unit and legacy-recovery metadata. New or tampered imports cannot introduce an out-of-range repetition.

## Verification

- 133/133 unit and integration tests passed across 18 files.
- 16/16 Android Chromium scenarios passed, including rapid activation for warm-ups, ordinary sets, supersets, Today save, and completion save; lb→kg→lb migration and reload; 999-rep rejection; and Catalog access at 360×800 and 915×412.
- Exact complete export/import/restore, read-back verification, rollback, valid restore, and malformed/tampered restore rejection passed with browser file selection.
- Controlled service-worker update behavior and a true offline reload passed under safe browser network emulation.
- Semantic navigation, keyboard operation, reduced motion, touch targets, mobile/landscape responsiveness, and 200% zoom passed.
- ESLint, TypeScript, formatting, privacy scanning, production build, and built-asset/PWA verification passed.
- The rebuilt app was manually inspected in the in-app browser: the `WC-P8R2-0811` marker and permanent Catalog destination were visible and operational.

## Release gate

The implementation and release suite are complete for `0.8.2`. This closure is not approval: a separate conversation must adversarially retest the deployed `WC-P8R2-0811` build. Phase 8 remains YELLOW, and no Phase 9 has begun.
