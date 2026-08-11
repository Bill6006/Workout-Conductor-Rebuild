# PWA and Accessibility Acceptance

Phase 8 makes the installable app's update lifecycle explicit. A downloaded service-worker update never activates silently while the application is open. Workout Conductor displays **Safe update ready** and waits for the user to apply it. If an unfinished active workout exists, the update action is withheld until that session is completed or otherwise made safe. The offline-ready state is announced without blocking the primary workout action.

The generated manifest includes the application name, short name, standalone display mode, theme/background colors, start URL, scope, and install icons. The production service worker precaches the app shell and all project-owned exercise demonstrations required by the enabled catalog. Automated acceptance installs the worker, confirms a controller, switches the browser offline, and reloads the application successfully.

## Accessibility contract

- One main landmark and one unique primary heading per screen.
- A keyboard-accessible skip link moves focus to main content.
- Form fields, buttons, navigation, disclosure controls, and dialogs have accessible names.
- Interactive targets used in primary flows are at least 44 by 44 CSS pixels.
- Focus-visible styling covers links, buttons, inputs, selects, textareas, summaries, and other focusable controls.
- Reduced-motion preferences disable decorative guide animation.
- Exercise images carry meaningful alternative text.
- Exercise-guide dialogs move focus inside, contain keyboard focus, close with Escape, make the application background inert, and restore focus to their opener.
- The mobile layout is checked at 360, 375, 412, and 430 CSS pixels, plus effective widths of 240 pixels at 150% zoom and 180 pixels at 200% zoom, without horizontal overflow.

The semantic acceptance suite is intentionally local and deterministic. The optional third-party axe package was not added after its package registry certificate could not be verified; the release does not weaken TLS verification to obtain a test dependency.
