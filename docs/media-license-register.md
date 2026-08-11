# Exercise Media License Register

Workout Conductor does not scrape, hotlink, or redistribute third-party exercise media. Every visual listed here was created specifically for this clean rebuild and can be redistributed with the public repository and GitHub Pages application.

Phase 8 promotes the five project-owned movement diagrams to the production demonstration system. Each of the 28 production-enabled exercises maps to one of these offline-packaged visual families, receives exercise-specific setup and execution instructions, and supports play/pause plus a reduced-motion static fallback.

| Manifest ID         | Asset                                     | Coverage                                             | Source                     | Rights                                  | Status           |
| ------------------- | ----------------------------------------- | ---------------------------------------------------- | -------------------------- | --------------------------------------- | ---------------- |
| `press-placeholder` | `public/exercise-media/posters/press.svg` | Horizontal, incline, vertical, and shoulder pressing | Workout Conductor original | Project-owned; redistribution permitted | Production ready |
| `pull-placeholder`  | `public/exercise-media/posters/pull.svg`  | Horizontal/vertical pulling and scapular retraction  | Workout Conductor original | Project-owned; redistribution permitted | Production ready |
| `lower-placeholder` | `public/exercise-media/posters/lower.svg` | Squat, lunge, hinge, and knee flexion                | Workout Conductor original | Project-owned; redistribution permitted | Production ready |
| `arms-placeholder`  | `public/exercise-media/posters/arms.svg`  | Elbow flexion and extension                          | Workout Conductor original | Project-owned; redistribution permitted | Production ready |
| `core-placeholder`  | `public/exercise-media/posters/core.svg`  | Anti-extension and anti-rotation                     | Workout Conductor original | Project-owned; redistribution permitted | Production ready |

The historical manifest IDs remain stable so existing locally generated workouts keep resolving their media after the schema upgrade. Catalog integrity tests require every production-enabled exercise to reference a `production-ready` manifest entry with poster, demonstration, reduced-motion fallback, source, author, and redistribution rights.

User-supplied custom media remains separate. It is stored only in IndexedDB, marked `user-owned`, rejected if it contains undeclared remote URLs, and included in complete backup/restore.
