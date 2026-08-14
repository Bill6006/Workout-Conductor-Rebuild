# Phase 8 Custom-GIF Tempo-Guide Repair

Status: **YELLOW — implementation complete; independent adversarial retest required**

Release: `0.8.8`

Build marker: `WC-P8UXR4-0814`

Phase 9 was not started. This repair responds to the physical-Android finding that selecting a user GIF removed the visible movement-tempo indicator.

## Defect-to-implementation mapping

| Finding                                      | Implementation                                                                                                                                                                                                                               | Regression evidence                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uploaded GIF obscured the tempo indicator    | `TempoIndicator` is a separate sibling below the guide media and a higher-layer child on the compact thumbnail, so Android GIF compositing cannot cover it. The same component renders for packaged, uploaded, replaced, and restored media. | Component persistence coverage and Android Chromium upload/reload/replace/remove checks assert the indicator remains rendered and follows the media in document order. |
| Progress was a generic symmetric fill        | `getTempoFrame` interprets eccentric, bottom pause, concentric, and top pause independently. Eccentric drains, bottom pause remains empty, concentric refills, and top pause remains full. Zero-duration phases are skipped without delay.   | Exact `3–1–1–0` boundary assertions plus zero-duration coverage in every phase position.                                                                               |
| Pause/reopen could accumulate animation work | One owned animation frame is requested only while playing. Pause, reduced motion, unmount, guide close, and exercise changes cancel the frame; resume continues from the frozen elapsed position.                                            | Rendered request/cancel ownership checks plus browser pause/resume and repeated guide-open coverage.                                                                   |
| Reduced motion needed equivalent information | Runtime `prefers-reduced-motion` changes stop motion and display the full labeled phase sequence and duration values.                                                                                                                        | Rendered runtime-media-query test and Android Chromium reduced-motion custom-GIF coverage.                                                                             |
| Custom media needed an explicit return path  | `Use packaged guide` removes the per-exercise override with IndexedDB read-back verification; the prescribed tempo remains unchanged.                                                                                                        | Component remount and browser reload coverage prove verified removal and packaged-guide restoration.                                                                   |

## Preserved contracts

- Custom media remains local, per exercise, size/type validated, backup protected, and durable across reload and offline use.
- Tempo remains an evidence-informed starting recommendation rather than a claim of one uniquely optimal cadence.
- Existing unit-safe analytics, idempotent submissions, repetition limits, durable skip/return, finish consent, omission accounting, one-time celebration, Catalog access, data recovery, migration, PWA, accessibility, and responsive behavior are unchanged.
- The user's physical Android passes for valid backup/restore, true offline reload, GIF selection/persistence, portrait/landscape, software keyboard, text scaling, and runtime reduced motion are retained as manual evidence. The repaired custom-GIF tempo path still requires independent deployed retesting.

## Release gate

The complete automated suite passes: 168/168 unit and integration tests, 26/26 Android Chromium scenarios, lint, TypeScript, formatting, privacy scan, production build, and built-asset/PWA verification. The deployed identity, asset hash, and repair handoff are recorded after release. Phase 8 remains YELLOW. Malformed/tampered restore rejection and physical-keyboard operation remain manual gates unless independently exercised. No GREEN approval is issued here.
