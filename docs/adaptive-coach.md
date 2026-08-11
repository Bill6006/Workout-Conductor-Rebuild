# Adaptive Coach contract

Phase 6 adds one deterministic, browser-local coaching layer over the existing workout generator, recalibration engine, and verified active-session record.

## Source of truth

- Completed working records use the athlete's actual load, reps, RIR, completion time, rest, tempo, pain signal, and any corrected values.
- Warm-ups and optional drop sets do not count as progression evidence.
- A superset round qualifies only when both moves have completed records. An A-only next-round draft is ignored.
- Recent completed sessions are read directly from IndexedDB. The app does not save large analysis snapshots.
- Exercise alternatives retain continuity when they share a progression family.
- Readiness, location, equipment, selected duration, estimated duration, actual duration, notes, accepted alternatives, and whole-session feedback remain part of the compact local session record.

## Recommendation model

The coach supports double, load, rep, and confirmed set progression. It can recommend a hold, a rep target, the smallest practical load increase, longer rest, a single-exercise reset, lower unfinished volume or intensity, a pain-free Alternative, and a safe optional drop set.

One bad set or workout cannot trigger a plateau diagnosis. Repeated misses require multiple qualifying sessions. Multi-session diagnosis considers load, reps, fatigue, recovery, exercise fit, and weekly coverage without treating any single signal as a diagnosis.

Readiness evaluates energy, soreness, sleep, joint discomfort, motivation, and time pressure together. It preserves the workout where possible and adjusts unfinished work instead of automatically cancelling the session.

## Arbitration and consent

The Conductor selects at most one main action using this order:

1. safety and form
2. recovery and fatigue
3. plateau
4. progression
5. exercise fit
6. weekly coverage
7. tips and convenience

Swaps, deloads, extra sets, dropped sets, drop sets, and material intensity changes are never automatic. The athlete must confirm the action. Completed records—including manually corrected records—are not rewritten.
