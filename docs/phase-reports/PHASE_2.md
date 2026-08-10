# Phase 2 Report — Exercise Catalog, Media, and Conflict Engine

Status: **YELLOW — awaiting user Android review**

Phase 2 establishes the trusted exercise-intelligence layer used by future generation, recalibration, alternatives, active workout, coaching, and analytics features. The live Workout tab exposes the real catalog and conflict-filtered ranking functions through a clearly labeled preview; it does not mutate a generated workout.

## Delivery

- Repository: https://github.com/Bill6006/Workout-Conductor-Rebuild
- Live app: https://bill6006.github.io/Workout-Conductor-Rebuild/
- Project status: https://github.com/Bill6006/Workout-Conductor-Rebuild/blob/main/PROJECT_STATUS.md
- Master issue: https://github.com/Bill6006/Workout-Conductor-Rebuild/issues/1
- Milestone: https://github.com/Bill6006/Workout-Conductor-Rebuild/milestone/1
- Combined evidence: [Phase 2 preview sheet](../screenshots/phase-2/combined-preview.svg)
- Android screenshots: [catalog](../screenshots/phase-2/catalog-412x915.png), [alternatives](../screenshots/phase-2/alternatives-412x915.png), and [exercise detail](../screenshots/phase-2/exercise-detail-412x915.png)
- Desktop screenshot: [1280×900](../screenshots/phase-2/catalog-desktop-1280x900.png)

## Catalog and media

- 28 curated exercises across bodyweight, dumbbell, barbell, cable, machine, band, home, travel, and gym contexts
- 19 muscles, 15 movement patterns, 15 equipment definitions, and 16 progression families
- Structured metadata for joint stress, limitations, warm-ups, Plate Math, drop-set safety, superset compatibility, setup/transition cost, and progression continuity
- Strict custom exercise, instruction, and user-owned local-media schemas
- Five original diagram-style development posters with a source/license field and public [license register](../media-license-register.md)
- Integrity validation for substitution and media references
- Production gate requiring a licensed poster and demonstration before an exercise can be production-enabled

No exercise is production-enabled in Phase 2. Development posters are visibly labeled and are not represented as final demonstrations.

## Conflict and alternative owners

The reusable conflict engine reports 13 structured conflict categories covering duplicates, overlap, joint stress, grip, equipment, stations, supersets, recovery, time, limitations, location, and progression roles. Blocking conflicts are excluded before deterministic alternative scoring; warnings remain available as explanation evidence.

Alternative results expose score, reason, difference, equipment, setup time, progression continuity, and superset impact. The one-slot replacement helper proves that unrelated workout slots remain unchanged.

## Verification

- ESLint: passed
- Prettier check: passed
- Privacy scan and production-build verification: passed
- Vitest: 29 of 29 app, storage, catalog, schema, conflict, and ranking tests passed
- Playwright Android project: 4 of 4 flows passed
- Supported widths: 360, 375, 412, and 430 px without horizontal overflow
- App-shell DOM readiness: asserted under 2 seconds in the local browser suite
- Alternative ranking: 100-run average asserted below the 200 ms target
- TypeScript and production PWA build: passed
- Phase 2 JavaScript bundle: approximately 353 kB / 101 kB gzip
- In-app browser at 412×915 and desktop 1280×900: visually verified
- Browser console: no errors
- GitHub Pages: final Phase 2 commit deployed and verified on the permanent URL

## Deferred by phase boundary

- Phase 3 workout generation, duration intelligence, warm-up output, and actual superset construction
- Phase 4 central recalibration and remaining-workout conflict repair
- Phase 5 active one-tap replacement and demonstration playback
- Phase 8 final licensed demonstration coverage, offline playback acceptance, and backup/restore of custom content

## Review gate

Phase 3 has not started. Phase 2 remains YELLOW until the user responds with `GREEN - NEXT PHASE`.
