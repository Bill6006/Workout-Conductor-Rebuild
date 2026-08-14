# Phase 8 UX Enhancement — Active Workout Navigation

Status: **YELLOW — implementation complete; independent adversarial retest required**

Release: `0.8.6`

Build marker: `WC-P8UXR2-0814`

Phase 9 was not started. This repair keeps the existing Phase 8 safety boundary, preserves the active-workout enhancement, and closes independent finding `WC-P8UX-RT-001` without claiming the remaining manual gates.

## Implementation mapping

| Requested behavior                      | Implementation                                                                                                                                                                                                        | Regression evidence                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Compact sticky icon-and-label navigator | `ActiveWorkoutView` exposes Current, Queue, Note, Plates, and Skip shortcuts. The landscape media rule now keeps a 46 px minimum instead of shrinking targets to 42 px.                                               | Actual bounding-box, center-hit, focus, pointer, touch, keyboard, zoom, text-scale, mobile, and landscape browser coverage. |
| Queue states and safe return            | The queue derives Current, Next, Completed, Skipped, and Omitted from the durable session source of truth. Return removes only the deferred marker and preserves every completed record.                              | Unit, rendered, reload, pause/resume, keyboard, and grouped-block browser regressions.                                      |
| Persistent “Skip for now”               | `deferredPrescriptionIds` stores per-prescription deferrals across reload, pause/resume, supersets, circuits, backups, and restores. The 450 ms action latch prevents click-through to a second exercise.             | Session, storage, rapid-double-activation, superset, and production-browser tests.                                          |
| Explicit finish consent                 | An active session no longer auto-closes when its last runnable set ends. Finish lists missed exercises and offers Return to missed exercises, Finish without them, and Cancel.                                        | Engine confirmation tests and rendered/browser alert-dialog checks.                                                         |
| Intentional omission accounting         | Confirmed omissions are stored in `omittedPrescriptionIds`, listed in the session summary, and have no synthetic records; therefore they cannot contribute volume, PRs, muscle coverage, or progression targets.      | Analytics, rendered summary, completed-history, backup, and Progress checks.                                                |
| Verified one-time celebration           | Completion persists `completionCelebratedAt`; confetti is shown only after the verified save resolves and never replays after reload. Reduced motion hides the particles and retains a nonanimated completion status. | Rendered, rapid-finish, reload, reduced-motion, and manual production-build checks.                                         |
| Focused utility sheets                  | Note and Plate Math now open as modal sheets from the sticky navigator. The obsolete lower-page dropdowns, duplicated workout list/next preview, and startup-save banner are removed.                                 | Rendered focus/Escape checks, Android Chromium interaction, and exact-build visual inspection.                              |
| One-set omission                        | Set Options now offers `Skip set`; `skippedSetKeys` persists one exact warm-up, working, grouped-round, or drop-set slot without creating analytics evidence.                                                         | Unit, schema reload, grouped-block, rapid-activation, rendered, and browser regressions.                                    |
| Persistent user GIF                     | Exercise details validate and verified-save one GIF override per exercise in the protected custom-media store. The override survives reload and backup/restore until replaced.                                        | MIME/size rejection, component remount, backup/restore, and production-browser file-upload regressions.                     |
| Evidence-informed tempo                 | Shared metadata-derived guidance appears above the set target and drives the movement-guide progress cycle. Copy explicitly avoids claiming a uniquely optimal research tempo.                                        | Catalog-wide unit checks, rendered ordering, computed-animation, reduced-motion, and visual production inspection.          |

## Preservation and migration

- Existing set-slot uniqueness, repetition limits, unit ownership, mixed-unit analytics, and saved-workout idempotency remain unchanged.
- Legacy sessions without the new fields receive safe defaults. Legacy permanently skipped blocks migrate to intentional prescription omissions rather than becoming unfinished work.
- Completed records are never relabeled, deleted, or moved when an exercise is deferred, returned, or omitted.
- Complete backup/restore continues to schema-validate and preserve the new active-session fields.

## Verification

- 155/155 unit and integration tests
- 21/21 Android Chromium production-build scenarios
- TypeScript production build, lint, formatting, privacy scan, and built-asset/PWA verification
- exact restore/read-back/rollback, malformed and tampered import rejection, legacy migration, and true offline app-shell reload
- mobile, landscape, keyboard, touch-target, reduced-motion, rapid-activation, pause/resume, and responsive checks
- measured shortcut targets at 320×568, 360×800, 412×915, 458×412 effective zoom, 667×375, 740×360, and 915×412
- production-build inspection confirms all five 915×412 targets render at 46 px with no horizontal overflow or hidden/overlapping hit areas

## Required manual gates still open

- true deployed-origin offline PWA reload on the user's Android device
- Android deployed-origin restore-file selection, exact restore, rollback, and malformed/tampered rejection
- physical-keyboard activation of all five shortcuts and Catalog
- runtime reduced-motion completion with no animated particles
- Android portrait/landscape behavior with real browser chrome and text scaling

The release remains YELLOW until a separate conversation adversarially retests the deployed marker and exact commit. No GREEN approval is issued here.
