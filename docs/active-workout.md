# Active Workout Contract

Phase 5 adds the browser-local workout execution layer. It consumes the generated and recalibrated workout from Phases 3–4; it does not introduce a second planning engine.

## Logging interaction

`SetLogger` is a reusable, accessible form with three large numeric fields: Weight, Reps, and RIR. The current set and target stay visually dominant. Values are prefilled from the last matching set or the prescription, so an unchanged normal set takes **one tap** to log. A changed set takes one field tap, keyboard entry, and one explicit log tap.

This is intentionally better than a button grid for a fatigued, one-handed user:

- there is one unmistakable commit action, reducing accidental logs;
- large native number inputs work with Android keyboards and avoid tiny repeated controls;
- three values remain readable without resembling a calculator;
- completed values open the same logger inline, save without adding a record, and return to the same workout position;
- undo is in the compact Set Options sheet instead of competing with the primary action.

The focused session-state benchmark keeps a normal set mutation below 100 ms. The UI reports only after an optimistic local update and verified IndexedDB read-back.

## Durable session model

An active session stores the immutable generated prescription plus append-only set records, warm-up choices, exercise cue memory, accepted alternatives, pinned exercise IDs, skipped blocks, pause timing, and a wall-clock rest target. The database upgrade adds `activeSessions` and `exerciseNotes` stores. Rapid critical writes enter a serialized verification queue, then are read back and schema-validated before they are considered saved; the UI rolls back the latest optimistic update if its verification fails.

The verified-write layer also detects legacy out-of-line-key stores that may exist from an older app on the same Pages origin. It supplies each record's stable ID explicitly for those stores, preserving the user's existing browser data instead of deleting or rebuilding the database.

Each set record carries its block, prescription, exercise, kind, set index, superset round, move index, load, reps, RIR, timestamps, and accounting flags. Warm-ups explicitly set progression, PR, and working-volume flags to false.

## Rest and resume

The rest timer begins after an exercise set or completed superset round using the programmed target. Its remaining time is derived from `startedAt` and the target duration—not an in-memory decrement—so backgrounding and reload do not distort the clock. The timer supports ±15-second adjustment, skip, the next target, silent visual completion, and a brief best-effort vibration where the browser permits it. It does not block completed-set correction.

Pause freezes workout elapsed time and persists the current position. Resume excludes accumulated paused time. A reload restores the newest unfinished session and exposes a Resume action.

## Exercises and supersets

- Exercise guides are available from the active card and every alternative preview, with setup instructions, muscle context, breathing guidance, common mistakes, and reduced-motion behavior.
- Alternatives reuse the Phase 4 ranking and recalibration owners. Selecting one replaces exactly the current unstarted prescription; the option locks after its first working record.
- A superset is one combined two-move card and one workout-list row. Each move still receives a separate durable record with a shared round index.
- Editing a completed superset move updates that exact record without creating another round or rest timer.
- The last move of the last round closes directly to the completion surface.
- Warm-ups, working sets, and optional drop sets remain visually and analytically distinct.

## Utilities and custom content

Exercise notes are saved independently and copied into the active session as cue memory. Plate Math explains per-side plates for barbells, per-hand dumbbell loading, and non-plate load types without pretending every exercise uses a barbell.

The active-session schema can carry validated custom-exercise snapshots, including user-owned image/video metadata and instructions. `CustomExerciseGuide` renders that local content without a remote hotlink. Creating and backing up custom media blobs remains part of the Phase 8 data-safety workflow.

## Responsive and phase boundaries

The execution screen is tested at 360, 375, 412, and 430 CSS pixels, plus the effective 240-pixel layout viewport produced by 360 pixels at 150% zoom. The current action, timer, and sheets remain usable without horizontal overflow.

Phase 7 extends durable execution with compact live PR feedback, completed-workout history, analytics, and a full Session Summary. Final production demonstration coverage, complete backup/restore, migration safety, and acceptance polish belong to Phase 8.
