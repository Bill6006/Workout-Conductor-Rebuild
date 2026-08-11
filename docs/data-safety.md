# Data Safety and Recovery

Workout Conductor stores user data in the browser's IndexedDB database. There is no account or server copy. Phase 8 therefore treats export, restore, rollback, and verified writes as release-critical behavior.

## Protected data

Complete backups contain raw key/value records from all nine protected stores:

- `profile`
- `equipment`
- `locations`
- `activeSessions`
- `exerciseNotes`
- `savedWorkouts`
- `customExercises`
- `customMedia`
- `coachTargets`

Raw records are retained in the backup so fields introduced by a newer application version survive an older reader. Known records are also schema-validated before an import can be confirmed. Settings are included as raw local key/value entries.

The `restorePoints` store is temporary recovery data. It is excluded from exports and is the only IndexedDB store the safe-cleanup command may clear.

## Critical-save contract

Profile, workout, note, saved-workout, custom-exercise, custom-media, and Coach target writes are not reported as successful until the write has completed, the record has been read back, and its known schema has validated. Pending critical writes are drained before export or restore. Settings exposes the latest verified profile-save time and a compact storage estimate.

## Restore sequence

1. Parse the selected JSON without changing local data.
2. Validate the backup envelope, keys, and known record fields.
3. Present a no-change preview with the format, counts, warnings, and affected stores.
4. Require explicit confirmation.
5. Snapshot the current protected stores and settings into `restorePoints`.
6. Replace the selected stores and settings.
7. Read everything back and compare the normalized keys and values exactly.
8. Automatically restore the rollback point if any write or verification step fails.

After a successful restore, the user can still select **Roll back last restore** to return to the pre-restore snapshot. A full Phase 8 restore replaces all protected stores. It does not merge records.

## Legacy migration

Phase 8 accepts the documented v1 foundation export only through the same preview-and-confirm flow. A legacy import replaces profile, equipment, locations, and settings, while preserving workout history, active sessions, notes, saved workouts, custom content, media, and Coach targets. Read-back verification and rollback apply to the migration as well.

Invalid, truncated, or unsupported files are rejected before mutation. Cleanup explicitly states that profiles, workouts, notes, media, and targets remain protected.
