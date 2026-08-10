# Central Recalibration Engine

Phase 4 routes every workout-changing condition through one deterministic, browser-local engine in `src/engine/recalibration`. UI components collect intent and render results; they do not contain competing workout-repair logic.

## Request contract

Every recalibration request records:

- the trigger, reason, request ID, and timestamp;
- the current generated workout and complete generation input;
- completed sets and exercises, PR references, exercise notes, and explicit lock categories;
- the current and affected exercise plus any accepted replacement;
- requested duration, elapsed time, location, unavailable and session-busy equipment;
- technique settings, pain/discomfort flags, recovery, readiness, performance, target-load, and harder/easier intent;
- whether the athlete requested an exact end time.

Runtime validation protects completed-work records before the engine acts. The trigger registry gives all supported triggers one default scope, user-facing label, session-only flag, and loading evaluation sequence.

## Recalibration scopes

| Scope     | Typical use                                                                | Behavior                                                                                                 |
| --------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `local`   | Equipment Busy, accepted replacement, target-load update                   | Changes one affected slot or its future target guidance; stable neighboring prescriptions keep their IDs |
| `partial` | Any change after completed work, skip, pain, recovery, unavailable station | Preserves completed/current/explicitly locked blocks and repairs future unlocked work                    |
| `full`    | Pre-workout duration, location, settings, readiness, or intensity change   | Regenerates the plan from the updated input when no completed truth exists                               |

Completed work automatically downgrades a nominal full trigger to partial recalibration. The engine will not replace completed exercises, logged sets, the current exercise after its first completed set, pinned exercises, user-selected exercises, or accepted alternatives. Target-load updates are the exception only because they update future guidance and leave logged records unchanged.

## Time behavior

An active duration change subtracts elapsed time and estimated completed-set time before considering the remaining plan. Locked work is merged first; future unlocked blocks are then trimmed to the available ceiling. If locked work cannot fit an exact requested finish, the engine returns the closest realistic plan, marks `exactTimeImpossible`, and adds a visible timing explanation instead of claiming a false fit.

## Safety and rollback

Before any recalculation, the engine takes an immutable snapshot of the valid workout. It works on cloned state and validates the final workout. A generator, schema, conflict, or lock failure returns the snapshot with `rolled-back` status and a readable error; partial candidate state is never exposed.

Equipment Busy is explicitly session-only. Its unavailable-equipment value influences only the current request and is returned with `persisted: false`; the saved location profile is untouched.

## UI lifecycle

The Today screen starts a blocking evaluation state immediately, disables conflicting controls, lists the checks being performed, and offers **Keep current workout**. Cancellation invalidates the pending request before mutation and restores the selector. Successful changes animate affected rows while stable rows retain their identity, then show scope, elapsed engine time, protected-record count, and a compact summary. The brief transition exists so the state change is perceivable; the engine itself is synchronous, local, and network-free.

Performance budgets are under 250 ms for a one-slot local change and under 700 ms for full regeneration. Automated tests enforce these ceilings with synthetic data.

## Phase boundary

Phase 4 owns plan recalibration and its pre-change snapshot. Phase 5 owns active set-entry controls, completed-work editing, timers, exercise execution, resume UI, and media. The engine schemas already accept completed truth so Phase 5 can call the same centralized path without duplicating repair logic.
