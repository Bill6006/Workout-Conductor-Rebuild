# Exercise Catalog Model

The Phase 2 catalog is internal, curated, runtime-validated with Zod, and independent of external APIs. Its 28 initial exercises span bodyweight, dumbbell, barbell, cable, machine, band, home, travel, and gym contexts.

Each exercise includes:

- muscles, movement pattern, training role, strength/hypertrophy suitability
- required and optional equipment plus location suitability
- setup and transition cost, rep range, laterality, and mechanics
- stability, grip, joint-stress, and shoulder/knee/lower-back considerations
- drop-set safety and superset compatibility metadata
- progression family and compatible substitutions
- original instructions, common mistakes, difficulty, and media manifest reference
- warm-up ramp metadata and Plate Math load semantics
- an explicit production enablement flag

Separate validated registries own muscles, movement patterns, equipment, progression families, and media. Cross-reference validation prevents missing substitutions and media IDs.

Custom exercises use a separate strict schema so user-owned instructions and local media can be backed up later without blending them into the licensed production catalog. Custom media is capped at 50 MB per item and references durable local blobs rather than remote URLs.
