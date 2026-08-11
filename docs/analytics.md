# Analytics and Session Summary Contract

Phase 7 derives progress evidence from completed, locally stored workout sessions. Analytics are computed on demand; no duplicate analysis snapshots, remote analytics, or telemetry are stored.

## Eligible records

- Only sessions with `status: complete` and a completion timestamp are analyzed.
- Working volume, personal records, coverage, and strength estimates use working-set records that explicitly count toward working volume.
- Warm-ups and optional drop sets are excluded from normal PR and working-volume calculations.
- Incomplete drafts and unfinished superset rounds never become evidence.
- Manually corrected completed records remain the source of truth.

## Measures

- **Working volume:** sum of `load × reps` over eligible working sets.
- **Four-week consistency:** completed sessions in the last 28 days divided by `weekly frequency × 4`, capped at 100%.
- **Duration efficiency:** planned minutes divided by actual active minutes, capped at 150%. Paused time is excluded by the session timer.
- **Training density:** eligible working sets divided by active minutes.
- **Estimated strength:** Epley `load × (1 + reps ÷ 30)`, with reps capped at 12. A percentage trend appears only after at least two qualifying sessions.
- **Weekly muscle coverage:** a primary-muscle set contributes 1.0 direct set; a secondary-muscle set contributes 0.5 indirect set, using the catalog's volume factors.
- **Target bands:** priority muscles use 10–16 effective sets; support muscles use 6–12. These are planning bands, not automatic prescriptions.

## Personal records

Normal PR detection is exercise-specific and compares the completed session with earlier completed sessions:

- highest working load;
- most reps at the same load;
- highest exercise volume within one session;
- first completion of every prescribed working set at the top of its rep range.

The first eligible result establishes a baseline load/range milestone. Rep and volume PRs require previous comparable evidence. Compact PR badges are shown during and after the workout.

## Confidence and explanations

Confidence is low for 1–2 completed sessions, medium for 3–7, and high from 8 onward. Progress surfaces always expose the sample count and calculation notes so a small sample cannot masquerade as certainty.

## Session Summary and notes

The completion summary reports completed working sets, exercises, volume, duration, PRs, trained muscles, recovery guidance, substitutions, next targets, next focus, sample size, and confidence. Exercise cue notes are read from the latest completed session and surfaced in progress/history where useful.

## Saved workouts

Generated or completed workouts can be copied into the browser-local `savedWorkouts` store and started again from Plan. Every save is schema-validated, written, read back, and verified before success is reported. A saved workout is a reusable prescription; it does not copy private history into source control.
