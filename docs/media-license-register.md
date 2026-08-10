# Exercise Media License Register

Workout Conductor does not scrape, hotlink, or redistribute third-party exercise media. Every asset listed here was created specifically for this clean rebuild and may be redistributed with the public repository and GitHub Pages application.

Phase 2 assets are intentionally marked **original development placeholder**. They are static diagram-style posters used to validate the media manifest, layout, reduced-motion fallback, and offline packaging. They are not represented as final exercise demonstrations, and all associated exercises remain `productionEnabled: false` until a licensed looping demonstration is registered.

| Manifest ID         | Asset                                     | Source                     | Rights                                  | Phase 2 status          |
| ------------------- | ----------------------------------------- | -------------------------- | --------------------------------------- | ----------------------- |
| `press-placeholder` | `public/exercise-media/posters/press.svg` | Workout Conductor original | Project-owned; redistribution permitted | Development placeholder |
| `pull-placeholder`  | `public/exercise-media/posters/pull.svg`  | Workout Conductor original | Project-owned; redistribution permitted | Development placeholder |
| `lower-placeholder` | `public/exercise-media/posters/lower.svg` | Workout Conductor original | Project-owned; redistribution permitted | Development placeholder |
| `arms-placeholder`  | `public/exercise-media/posters/arms.svg`  | Workout Conductor original | Project-owned; redistribution permitted | Development placeholder |
| `core-placeholder`  | `public/exercise-media/posters/core.svg`  | Workout Conductor original | Project-owned; redistribution permitted | Development placeholder |

## Production gate

An exercise may be changed to `productionEnabled: true` only when its manifest entry is `production-ready` and provides both a poster and a redistributable demonstration path. Catalog integrity tests enforce this rule. Final production demonstration coverage remains owned by Phase 8 acceptance.

User-supplied custom media is separate from this register. Its schema accepts only local `blobKey` references marked `user-owned`; undeclared remote URLs are rejected.
