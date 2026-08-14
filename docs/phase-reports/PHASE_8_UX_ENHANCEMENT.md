# Phase 8 UX Enhancement — Active Workout Navigation

Status: **YELLOW — implementation complete; independent adversarial retest required**

Release: `0.8.4`

Build marker: `WC-P8UX-0814`

Phase 9 was not started. This release keeps the existing Phase 8 safety boundary and improves active-workout orientation, deferral, completion consent, and celebration.

## Implementation mapping

| Requested behavior                      | Implementation                                                                                                                                                                                                        | Regression evidence                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Compact sticky icon-and-label navigator | `ActiveWorkoutView` exposes Current, Queue, Note, Plates, and Skip shortcuts with 44+ px targets and mobile/landscape layouts.                                                                                        | Rendered shortcut/focus tests plus Android Chromium mobile and landscape coverage.     |
| Queue states and safe return            | The queue derives Current, Next, Completed, Skipped, and Omitted from the durable session source of truth. Return removes only the deferred marker and preserves every completed record.                              | Unit, rendered, reload, pause/resume, keyboard, and grouped-block browser regressions. |
| Persistent “Skip for now”               | `deferredPrescriptionIds` stores per-prescription deferrals across reload, pause/resume, supersets, circuits, backups, and restores. The 450 ms action latch prevents click-through to a second exercise.             | Session, storage, rapid-double-activation, superset, and production-browser tests.     |
| Explicit finish consent                 | An active session no longer auto-closes when its last runnable set ends. Finish lists missed exercises and offers Return to missed exercises, Finish without them, and Cancel.                                        | Engine confirmation tests and rendered/browser alert-dialog checks.                    |
| Intentional omission accounting         | Confirmed omissions are stored in `omittedPrescriptionIds`, listed in the session summary, and have no synthetic records; therefore they cannot contribute volume, PRs, muscle coverage, or progression targets.      | Analytics, rendered summary, completed-history, backup, and Progress checks.           |
| Verified one-time celebration           | Completion persists `completionCelebratedAt`; confetti is shown only after the verified save resolves and never replays after reload. Reduced motion hides the particles and retains a nonanimated completion status. | Rendered, rapid-finish, reload, reduced-motion, and manual production-build checks.    |

## Preservation and migration

- Existing set-slot uniqueness, repetition limits, unit ownership, mixed-unit analytics, and saved-workout idempotency remain unchanged.
- Legacy sessions without the new fields receive safe defaults. Legacy permanently skipped blocks migrate to intentional prescription omissions rather than becoming unfinished work.
- Completed records are never relabeled, deleted, or moved when an exercise is deferred, returned, or omitted.
- Complete backup/restore continues to schema-validate and preserve the new active-session fields.

## Verification

- 146/146 unit and integration tests
- 20/20 Android Chromium production-build scenarios
- TypeScript production build, lint, formatting, privacy scan, and built-asset/PWA verification
- exact restore/read-back/rollback, malformed and tampered import rejection, legacy migration, and true offline app-shell reload
- mobile, landscape, keyboard, touch-target, reduced-motion, rapid-activation, pause/resume, and responsive checks
- hands-on production-build inspection at 360×800 and 915×412 with no runtime warnings or errors

The release remains YELLOW until a separate conversation adversarially retests the deployed marker and exact commit. No GREEN approval is issued here.
