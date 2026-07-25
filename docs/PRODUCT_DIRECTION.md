# Product and engine direction

Status: approved direction; current technical-preview behavior is identified separately below.

## Product thesis

**One graph. Many views. Many routes.**

Prezograph should feel like a controlled traversal through a living graph, not a sequence of
independent graph-themed slides:

- the graph is the semantic source of truth;
- a slide is a local view with its own deterministic layout;
- a cue changes attention, visibility, relationships, camera, or overlay;
- a route chooses the story;
- Explore mode can leave and return to the compiled route.

The current schema-v2 entity/instance representation approximates local placement but is
transitional. It must not be advertised as the final conceptual model.

## Binding decisions

| Topic | Decision | Current status |
|---|---|---|
| Semantic identity | One node ID across every slide and route | Transitional entity + instance IDs |
| Placement | Build a slide-local placement graph; ignore external semantic edges by default | Explicit local positions only |
| Layout | Deterministic connected-component layouts with controllers and structured conflict diagnostics | Planned schema/compiler migration |
| Animation | First-class cues for nodes, edges, emphasis, camera, captions, pauses, and overlays | Beats are the compatibility layer |
| Navigation | Back returns to the exact preceding compiled cue, including across slides | Implemented for current beats |
| Authoring | JSON/YAML and programmatic interfaces are the source of truth | JSON available; YAML planned |
| Manual editing | No drag editing, sliders, undo snapshots, or browser position writeback | Removed from production runtime |
| Modes | Present, Speaker, Explore, and developer-only Layout Debug | Present/overview available; others planned |
| Routes | Select short/long routes and optional forks before playback | Planned |
| Finale | Generic centered overlay over an optional one-cycle overview tour | Planned |
| Performance | Event-driven rendering, viewport culling, two-hop context, semantic zoom | Planned |
| Company stage | Names only; sourced facts live in metadata/details | Implemented in reviewed example |

## Slide-local layout contract

For every slide, the future compiler should:

1. resolve the participating semantic node IDs;
2. construct a placement graph from slide-local layout edges only;
3. find its connected components;
4. resolve one controller per component;
5. lay out each component deterministically;
6. pack component bounds inside the slide safe area;
7. cache `renderTarget(nodeId, slideId)`;
8. animate the same semantic node toward its new local target.

An edge to an inactive node must not change coordinates. Reveals solve against all eventual slide
nodes by default and must not reflow unless `reflowOnCue` is explicit.

Controller conflicts resolve by global semantic degree, then slide-placement degree, then authored
controller order. Every conflict emits a structured diagnostic.

Initial deterministic algorithms: grid, columns, rows, circle, radial, concentric, tree, DAG,
timeline, explicit JSON positions, and inherited Explore positions.

## Cue and route contract

The cue model should control node entry/exit, edge draw/remove, emphasis, captions, camera policy,
overlays, and pauses. Recommended presets include `revealCluster`, `drawPath`, `expandHub`,
`compareGroups`, `replaceGroup`, `traceLoop`, and `focusComponent`.

Before playback, route compilation resolves the selected route and forks, assigns route-relative
slide numbers, validates rejoin points, and flattens slides and cues into one ordered state list.
Explore mode never mutates that list implicitly.

## Trust and performance

Decks, assets, notes, metadata, prompts, and URLs remain untrusted. Safe mode uses allow-listed
structured visuals, safe DOM APIs, same-origin loading, bounded inputs, safe YAML when added, and a
restrictive CSP. Agent fallback output is inert `.prezograph.json` or future
`.prezograph.yaml`, never executable HTML.

Present mode should render only active and prewarmed cue content. Explore mode should render the
viewport, a configurable two-hop context, selected paths, and search results. Text outside the
viewport should not be mounted. Idle and hidden runtimes should stop requesting frames.

## Reviewed GraphCon example

The reviewed adaptation deliberately:

- preserves “Order versus chaos” and “Rows and edges”;
- removes raw authored HTML and active SVG;
- adds the missing NRT→SEA flight relationship;
- corrects the four swapped “Pick your graph” explanations;
- separates Operator from the Responses API and adds A2A;
- places timeline milestones in three progressively revealed lanes;
- shows 15 representative independent graph companies by name only;
- substitutes active Cognee for sunsetting Graphlit;
- stores reviewed company facts as focus details with sources and review dates.

The main-stage company selection is a density decision, not a comprehensive market judgment. A
complete landscape and the proposed six-stage market lifecycle belong in a later route/Explore
implementation.

## Execution order

1. Preserve fixtures and visual baselines.
2. Migrate from entity/instance placement to semantic nodes plus slide-local targets.
3. Add deterministic layout controllers, component packing, and diagnostics.
4. Compile current beats into first-class cues.
5. Add generic overlay and slide-shaped overview-tour windows.
6. Compile routes and forks; add Present, Speaker, Explore, and Layout Debug.
7. Add culling, semantic zoom, idle rendering, and performance budgets.
8. Add safe YAML and interface parity only after the trust gates pass.

The schema, README promises, examples, Agent Skill, CLI help, and migration notes must move
together when these contracts become available.
