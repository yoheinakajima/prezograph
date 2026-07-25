# QA report

Run date: July 25, 2026

## Automated

- `npm run validate` — passed for both schema-v2 examples; the reviewed adaptation contains 12
  scenes, 133 semantic entities, and 131 rendered instances.
- `npm test` — passed: 33/33 schema, security, loader, compilation, geometry, content, motion-parity,
  hostile-input, public-copy, agent-surface, and workflow-policy assertions.
- `npm run build` — passed: CSP-hashed portable `dist/prezograph.html`.
- `npm run build:site` — passed: static Pages artifact with home, app, agent, raw source,
  schema, and version routes.
- Portable Agent Skill validation — passed.
- Cross-platform agent-file portability — covered by separating the coding-agent `AGENTS.md`
  contract from the source that generates public `/agents.md`; contract tests lock the distinction.
- `git diff --check` — passed.
- Node syntax checks for the migration and player — passed.
- Original attachment vs archived fixture — byte-for-byte match.

## Browser

- Development shell loaded the reviewed 131-instance adaptation.
- Walked all 23 reviewed cues at 1440×900; every active node remained inside the safe area and no
  scene entered overflow.
- Walked all 23 reviewed cues at 390×844; every active node remained inside the safe area and no
  scene entered overflow.
- Inspected the opening and mobile deck-selection bottom sheet visually.
- Confirmed the ending remains scene 12 as a centered 16:9 overlay; whole-graph exploration remains
  optional and reports “overview · 12 scenes.”
- Confirmed the camera scales content below the former 0.8 mobile floor when needed, while retaining
  an emergency floor and explicit overflow behavior for genuinely unfit content.
- Switched between the reviewed and technical-preview decks from the selector and confirmed the
  active title and URL update.
- Confirmed the reviewed deck begins at `01 / 12 · 1/5`.
- Compared the immutable original and modular player at 1440×900. Computed styles match the
  original 700ms node/edge fades and 550ms + 120ms card transition, and a sampled first reveal was
  in flight in both implementations at 300ms.
- Confirmed initial scene entry is simultaneous, while forward beats alone use the original
  80ms + 140ms-per-node stagger and keep connecting edges hidden until both endpoints enter.
- Confirmed scene-to-scene movement retains persistent 55% graph context, all-node ambient float,
  the original camera/push response, and card position glides.
- Confirmed whole-graph mode restores the original moving-window model: fixed overview camera,
  scene-local emphasis, push-out context, the original 500/700/500 pause/move/pause cadence, a
  16:9 outline, and a constant-screen-size `01 / 12` badge.
- Confirmed Next exits overview at scene 1 and Back exits at scene 12.
- Confirmed the 16:9 overview window remains fully visible at 390×844.
- Confirmed reduced-motion mode holds a meaningful first scene window without automatic movement.
- Confirmed the full-motion finale advances its numbered focus window through all 12 scenes once,
  reaches `finale · 12 / 12 · hold`, and remains at the same window after an additional wait.
- Sampled the finale window during scene 2: its x/y/width changed between two frames 300ms apart
  while the attached badge remained `02 / 12`, proving that the outline is moving rather than only
  changing at scene boundaries.
- Confirmed the final Next action holds instead of wrapping, while Back restores scene 11's final
  beat and removes the overlay/tour state.
- Confirmed the mobile finale overlay occupies x=14 through x=376 at 390×844, retains a 16:9
  aspect ratio, and leaves the navigation/progress safe areas clear.
- Confirmed the reduced-motion finale renders a static `12 / 12` window and the same readable close.
- Confirmed the launch homepage has a complete discovery path, a truthful available/planned split,
  six durable example actions, and no dead-end footer.
- Confirmed `/agents/` instructs agents to return inert JSON and labels YAML, API, and MCP as planned.

The in-app browser's iframe instrumentation emitted a `MutationObserver` diagnostic while inspecting
the mobile test harness. Prezograph does not use `MutationObserver`; direct development and
single-file tabs both had empty browser logs.

## Local server security

- Normal in-repository JSON request returned HTTP 200.
- A temporary symlink pointing outside the repository returned HTTP 403.
- The temporary symlink was removed immediately after the check.

## Visual fixes made during QA

- Corrected the camera's vertical card offset so dense-scene titles clear the fixed header.
- Centered scene cards over focused bounds so mobile titles do not clip offscreen.
- Added fixed-chrome safe areas to camera fitting.
- Removed the 0.8 mobile scale floor that caused horizontal clipping.
- Compressed the reviewed three-lane timeline until all three cue states fit at 390×844.
- Replaced the manual editor with a schema-validating deck selector and local file input.
