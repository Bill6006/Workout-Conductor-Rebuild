# Workout generation engine

Workout Conductor Phase 3 generates pre-workout plans entirely in the browser. The engine is pure and deterministic: the same normalized input produces the same workout, without a network request, account, opaque model call, or random choice.

## Input contract

The generator accepts the saved profile and settings plus the active location, equipment, requested duration, date, workout position, current weekly working sets, recent muscle exposure, prior exercise IDs, readiness, and pain/limitation flags. `generationInputFromBundle` adapts the Phase 1 local profile model into that contract. Blank weekly volume and exposure are valid until real history becomes available in later phases.

Equipment names are converted to catalog IDs before conflict validation. Bodyweight and an exercise mat are always available; stations and free weights are added only when the selected equipment profile contains them.

## Decision sequence

1. Build goal- and frequency-aware weekly set targets for all 19 muscles.
2. Calculate each muscle's remaining set deficit.
3. Down-rank muscles still inside their catalog recovery window, weighted by recent hard sets.
4. Exclude exercises that conflict with equipment, location, shoulder sensitivity, pain tags, or squat preferences.
5. Score the remaining catalog by muscle need, strength or hypertrophy suitability, setup cost, preferences, recovery warnings, and progression continuity.
6. Place a progression anchor first, then add balanced hypertrophy, lower-body, specialization, and support work as the duration permits.
7. Build only compatible optional technique blocks.
8. Estimate total preparation, ramp, setup, transition, execution, and rest time; reduce low-priority sets until the plan fits its ceiling.
9. Runtime-validate the complete output schema.

## Duration behavior

The Today screen has one duration control and no parallel workout-mode system.

| Selection  | Generation intent                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| 15 minutes | One high-value progression anchor plus one efficient support or safe two-move superset; one compact ramp set. |
| 30 minutes | One anchor, a balanced support movement, and targeted paired work.                                            |
| 45 minutes | Abbreviated complete session with strength, hypertrophy, lower-body/support, and specialization volume.       |
| Default    | The profile's intended full session with the broadest priority volume and standard hybrid structure.          |

The highest-value anchor remains stable across the four durations for identical inputs. Longer selections add useful work around it instead of switching to a different workout type.

## Progression and warm-ups

Every exercise prescription has one durable progression family and one session role:

- `strength-anchor` protects the main progression opportunity while fatigue is lowest.
- `hypertrophy-builder` supplies repeatable working volume.
- `specialization` targets isolation and emphasis work.
- `support` handles corrective and trunk work.

Prescriptions include working sets, rep range, load guidance, target RIR, rest, rationale, and optional ramp or drop-set records. Warm-ups are typed records with all three accounting flags fixed to `false`: they cannot count toward progression, PRs, or weekly working volume.

## Canonical block model

A session is an ordered list of blocks. An exercise block holds one prescription. A superset block holds exactly two distinct prescriptions and one canonical readable row such as `Dumbbell Curl + Close-Grip Push-Up`. A circuit holds two to four prescriptions and one canonical row. Each move retains its own stable prescription ID, exercise ID, progression family, reps, RIR, and volume contribution.

This model avoids duplicating a superset across two list rows while preserving move-level data for later logging and recalibration.

## Technique guardrails

- Supersets must save transition time without pairing two heavy priority lifts, high-grip moves, incompatible patterns, overlapping primary muscles, shared joint stress, or a scarce station.
- Drop sets require the setting to be enabled, a muscle-building goal, a catalog-safe movement, and placement after all later priority work. At most one is generated.
- Circuits require the setting to be enabled, a General Fitness goal, a 15- or 30-minute request, low transition cost, and compatible equipment. Primary-strength exercises are not forced into circuits.

## Time and volume accounting

The estimator separately accounts for general preparation, exercise-specific ramp sets, equipment setup, block transitions, working-set execution, inter-set or inter-round rest, and a possible final drop set. Unilateral exercises receive additional execution time.

Planned weekly volume counts direct working sets at full value and secondary muscle work at half value. Drop sets add one working set. Warm-ups never enter the calculation.

## Phase boundary

Phase 3 owns generation before a workout begins. The output contains stable metadata that later phases can use, but Phase 3 does not perform central recalibration, loading overlays, workout locks, active set logging, one-tap replacement, rollback, or PR mutation. Those behaviors remain gated to Phases 4 and 5.
