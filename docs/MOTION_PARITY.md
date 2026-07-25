# Motion parity with the original graph-deck

Status: implemented compatibility contract

The immutable reference is `legacy/graph-deck_1.html`. The modular player preserves its
presentation-motion language while retaining deliberate Prezograph changes: safe inert content,
mobile safe areas, exact previous-cue Back behavior, reduced-motion support, a 16:9 numbered
overview window, and a finite final overlay hold.

| Reference lines | Original behavior | Modular equivalent | Decision |
|---|---|---|---|
| 18–28 | Context nodes stay at 55% opacity; active nodes fade to 100%; hidden nodes fade to zero over 700ms | `.pz-node`, `.is-active`, `.is-context`, `.is-beat-hidden`, `.is-revealing` | Matched |
| 20–23, 378–399 | Scene cards fade over 550ms after a 120ms delay and glide between positions over 700ms; cards refade only when the scene changes | `.pz-card.is-in` plus scene-keyed refade in `updateChrome` | Matched |
| 42–46 | Edges start at 8%, activate at 90%, cross-context edges sit at 30%, and labels/paths fade over 700ms | `.pz-edge`, `.is-on`, `.is-half`, `.pz-edge-label` | Matched; the later non-reference line-draw effect was removed |
| 314–363 | Entering a scene shows its initial reveal together; only an in-scene forward reveal staggers at 80ms + 140ms per node; connected nodes can be authored first | `advance()` opts into staggering; `goScene()` and Back do not; reviewed beats keep explicit `revealOrder` | Matched without reintroducing accidental global-edge ordering |
| 365–376 | Active endpoints light their edge; one active endpoint gives a cross-edge half emphasis; overview initially dims spine edges and labels cross-edges | `updateEdges()` | Matched |
| 401–468 | Each scene refits the camera; entering a new scene glides from the prior view; newly revealed content refits without snapping | `fitCurrent()` and elapsed-time camera interpolation | Matched; mobile safe-area fit and exact previous-cue Back are retained |
| 470–537 | The whole-graph tour waits 500ms, moves for 700ms with cubic easing, pauses 500ms, highlights each scene, and pushes context beyond the moving window | overview-tour state machine | Matched timing and push behavior; the window remains intentionally 16:9, numbered, and finite on the final overlay |
| 544–557 | Non-active nodes ease beyond the selected view rectangle | `pushTarget()` with the original 0.06/frame response | Matched |
| 560–610 | Camera response is 0.065/frame, push response 0.06/frame, all nodes float continuously, and edges repaint every other frame | `frameEase()`, all-node float, and `edgeFrameStride` | Matched at 60fps and normalized across refresh rates |
| 597–607 | Curved-edge label position follows the curve offset | `renderEdges()` | Matched |
| 54–57, 68–69 | Tooltips fade over 180ms and scene dots change over 300ms | `.pz-tip.is-visible` and `.pz-dot` | Matched |

The parity constants live in `src/player/motion.js` and are covered by
`test/motion-parity.test.js`. This makes later tuning an explicit contract change instead of a
collection of unrelated CSS and runtime edits.
