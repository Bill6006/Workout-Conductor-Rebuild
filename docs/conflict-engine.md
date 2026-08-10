# Conflict and Alternative Foundations

Phase 2 establishes one reusable conflict owner in `src/engine/conflicts` and one deterministic ranking owner in `src/engine/alternatives`. Workout generation, recalibration, and active replacement will call these owners in their approved phases rather than recreating their rules in UI components.

## Conflict contract

`validateExerciseSelection` accepts exercise IDs and a typed context containing location, available equipment, limitations, fatigued muscles, time budget, and proposed superset pairs. It reports structured blocking conflicts and warnings for:

- duplicate exercises and movement-pattern concentration
- excessive primary-muscle overlap
- joint-stress and grip interactions
- unavailable equipment, scarce stations, and location mismatch
- unsafe or quality-reducing supersets
- recovery, time, and explicit limitation conflicts
- excessive primary-strength progression roles

Blocking conflicts remove an option before ranking. Warnings remain available as future explanation evidence.

## Alternative contract

`rankAlternatives` is pure and deterministic. It first excludes wrong-muscle, disliked, unavailable, unsafe, location-incompatible, and time-incompatible candidates. Remaining candidates are scored by primary-muscle match, movement pattern, training role, progression family, known substitution relationships, equipment continuity, setup time, and strength/hypertrophy fit.

The result includes the match score, primary reason, key difference, equipment, setup time, progression-continuity flag, superset impact, and warnings. `replaceExerciseSlot` demonstrates the Phase 2 data contract: replacing one slot preserves every other slot and its metadata.

## Phase boundary

The live safe-swap surface is a synthetic preview of these pure functions. It does not mutate a generated or active workout. Generation begins in Phase 3; central recalibration in Phase 4; active one-tap alternatives in Phase 5.
