# Prezograph audit and revision report

> Historical note: this initial audit predates the binding decisions in
> [PRODUCT_DIRECTION.md](PRODUCT_DIRECTION.md). Where they conflict, the newer direction controls:
> preserve “Order versus chaos” and “Rows and edges,” keep one semantic graph with slide-local
> targets, and do not ship a manual browser editor.

Reviewed artifact: `graph-deck_1.html`
Review date: July 24, 2026
Scope: tool architecture, security, data model, interaction, accessibility, animation order,
narrative, slide flow, node inclusion, company landscape, factual claims, and open-source readiness.

## Executive assessment

The prototype had a distinctive idea worth open-sourcing: the presentation was genuinely a graph,
not a conventional slide deck decorated with nodes. Its strongest moments were the continuous spatial
world, the zoom-to-subgraph camera, and the final return to the whole system.

Its main weakness was coupling. Content, renderer, editor, layout, and deck data lived in one HTML
file; shared nodes also shared physical coordinates; numeric step rules hid narrative state; and
deck-authored strings entered `innerHTML`. That made the artifact difficult to trust, test, reuse,
and explain as an open-source tool.

The revision keeps the spatial premise but makes the graph legible at three levels:

1. entities define facts once;
2. scenes create local visual instances;
3. beats explicitly define the story state and camera focus.

The example is now 12 scenes, 38 beats, 151 visual instances, and an optional whole-graph view that
is not counted as a thirteenth slide.

## Priority 0 — release blockers

| Change | Finding | Benefit | Cost / tradeoff | Resolution |
|---|---|---|---|---|
| Remove JSON-to-`innerHTML` rendering | Authored strings could become executable markup | Closes the clearest injection path; makes untrusted local decks safer | Custom HTML cards are no longer possible by default | Implemented with `textContent` and structured visuals |
| Validate before render | Dangling references, invalid sizes, and arbitrary visual types could reach runtime | Predictable failures and clearer contributor feedback | Schema evolution now requires versioning | Implemented as schema 2.0 |
| Split the monolith | Tool, deck, CSS, and editor could not be tested or reused independently | Maintainable public API boundaries and focused review | More files than the one-file prototype | Implemented; single-file output remains available |
| Separate entity from placement | Reusing FalkorDB/Mem0 in the title also reused distant company-map coordinates, corrupting fit | Facts can recur without camera side effects | Authors learn two IDs: entity and instance | Implemented |
| Preserve the original | A rewrite risked destroying provenance | Every change remains auditable | Repository includes a large legacy fixture | Implemented unchanged |

## Priority 1 — narrative and presentation quality

| Change | Finding | Benefit | Cost / tradeoff | Resolution |
|---|---|---|---|---|
| Reframe “order vs chaos” | “Graphs good, tables chaos” was an avoidable strawman | More credible to technical audiences: same facts, different cost of relationship questions | Less combative opening | Implemented |
| Add an agent-exhaust bridge | “Everything is a graph” jumped too quickly to a product timeline | Shows why agents create relationship-shaped data in practice | Adds one conceptual scene | Replaced the rows/edges scene |
| Make timeline progressive | The dense timeline arrived as a single visual claim | Gives each era a reason to exist and limits reading load | Five beats take longer to present | Implemented |
| Qualify ontology inversion | “Old ontology” was framed as a dead end | Preserves the insight while acknowledging stable-domain value | Thesis becomes conditional rather than universal | Implemented |
| Tie market to durable questions | Market categories followed the “new job” but did not visibly answer it | Creates causal flow from problem → workload → company | Mapping is illustrative and must be labeled as such | Implemented with explicit caption |
| Reveal companies by segment | The full company map was visually and cognitively overloaded | Each segment can be discussed at readable scale | Whole landscape is now the final beat, not the default | Implemented |
| Replace the loop slide | A recursive system diagram repeated the deck’s premise near the end | The tool itself becomes the proof: “this deck is a graph” | Loses one abstract systems metaphor | Implemented; legacy version remains archived |
| Close with a concrete action | “You are a graph person” had emotional closure but no next step | Converts interest into a fork/build action | Repository URL must remain current | Implemented |

## Priority 1 — facts and company landscape

| Change | Finding | Benefit | Cost / tradeoff | Resolution |
|---|---|---|---|---|
| Correct Mem0 | “AWS default” overstated the relationship; funding total needed a date | Precise, sourced wording | Slightly longer label | “$24M raised · AWS Agent SDK memory provider” |
| Correct Graphwise | Name obscured that it combined Ontotext and Semantic Web Company | Explains why older brands disappeared | Merger detail may age | Sourced and dated |
| Correct metaphacts | Acquisition was shown as 2022 | Removes a factual error | None | Changed to January 2023 |
| Update Linkurious | Ownership/status had changed | Current company map | Acquisition status can age | Shown as Nuix / Linkurious, acquired 2026 |
| Remove WhyHow | The company had pivoted from general graph-construction infrastructure into litigation agents | Avoids presenting a stale category claim | Omits a historically relevant startup | Removed from rendered entities; documented here |
| Add platform context | Independent vendors were shown without hyperscaler graph products | More honest market shape | Company scene gets two more nodes | Added Amazon Neptune and Google Spanner Graph |
| Remove high-risk vanity numbers | Several totals, valuations, and “leader” labels were unsourced or time-sensitive | Less fact-check debt and less promotional tone | Reduces visual signals of company scale | Removed or replaced with durable descriptors |
| Disclose portfolio | FalkorDB and Mem0 are connected to the speaker/investor | Audience can interpret selection bias | Adds caption and label text | Marked with ◈ and disclosed in metadata |
| Add as-of date | A company landscape silently implied permanence | Makes staleness visible | Requires future updates | July 24, 2026 |

Primary sources embedded in the deck cover dated claims including
[OpenAI function calling](https://openai.com/index/function-calling-and-other-api-updates/),
[OpenAI Assistants status](https://help.openai.com/en/articles/8550641-assistants-),
[Operator](https://openai.com/index/introducing-operator/),
[MCP](https://www.anthropic.com/news/model-context-protocol),
[MCP and AAIF](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation),
[Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills),
[Microsoft GraphRAG](https://www.microsoft.com/en-us/research/blog/graphrag-new-tool-for-complex-data-discovery-now-on-github/),
[A2A](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/),
[WhyHow's current positioning](https://whyhow.ai/),
[Mem0](https://mem0.ai/series-a),
[Graphwise](https://graphwise.ai/wp-content/uploads/2024/10/Graphwise-press-release-General.pdf),
[metaphacts](https://metaphacts.com/images/PDFs/PR-metaphacts-joins-the-Digital-Science-technology-group-following-acquisition_final.pdf),
[Linkurious](https://www.nuix.com/linkurious),
[Amazon Neptune](https://aws.amazon.com/neptune/graph-and-ai/), and
[Spanner Graph](https://docs.cloud.google.com/spanner/docs/graph/overview).

## Priority 2 — interaction, animation, and accessibility

| Change | Finding | Benefit | Cost / tradeoff | Resolution |
|---|---|---|---|---|
| Explicit beat snapshots | Additive numeric steps made deletions and reorderings implicit | Animation order is reviewable in JSON | Beat lists repeat IDs | Implemented |
| Focus-aware camera | Camera fit included context that was not being discussed | Larger, more readable active nodes | Context may sit outside the viewport | Implemented with pan affordance |
| Readable-scale floor | Dense scenes could shrink text past legibility | Preserves reading size on desktop and mobile | Some scenes overflow and require panning | Implemented with notice |
| No initial overview flash | The whole graph briefly appeared before the first scene settled | Cleaner opening | Requires ready-state opacity | Implemented |
| Optional overview | Whole graph behaved like an automatic final slide | Ending remains intentional; overview becomes exploration | Presenter must choose it | Implemented |
| Elapsed-time motion | Frame-dependent easing varied by refresh rate | More consistent animation across devices | Continuous animation still uses battery | Implemented; reduced motion disables drift |
| Keyboard and touch | Prototype centered mouse/desktop interaction | Wider presentation and exploration access | More event-state code | Implemented |
| Semantic focus | Visual nodes were not a coherent keyboard surface | Active nodes are focusable and announced | Context nodes intentionally leave the tab order | Implemented |
| Contrast cleanup | Some muted text and accent combinations were weak | Better readability in projectors and daylight | Palette differs slightly from the prototype | Implemented |

## Priority 2 — authoring and open-source usability

| Change | Finding | Benefit | Cost / tradeoff | Resolution |
|---|---|---|---|---|
| CLI validation/stats | Contributors had no fast correctness check | Works in CI and before opening a browser | Node.js required for authoring tools | Implemented |
| Reversible editor | Direct manipulation lacked a safety net | Node/layout experiments are recoverable | Undo history is session-local | Implemented |
| Portable build | Splitting files risked losing the prototype’s shareability | Restores one-file distribution with a hashed CSP | Generated file is larger and not hand-editable | Implemented |
| Architecture docs | Core concepts were discoverable only by reading code | Lowers contributor ramp time | Documentation maintenance | Implemented |
| Decision tracker | Audit changes could become invisible after implementation | Preserves why a change exists | Adds process overhead | Implemented |

## Priority 3 — recommended follow-ons

| Possible change | Pros | Cons / reason deferred |
|---|---|---|
| Presenter notes and private display | Makes the tool viable for rehearsed talks | Requires a second-window state protocol and deliberate notes schema |
| Static PNG/PDF export | Easier conference backup and sharing | Graph motion and overflow need print-specific composition |
| Visual plugin API | Community-specific charts and cards | Reintroduces an execution and sanitization boundary; needs sandbox design |
| Automatic graph layout | Faster first draft from raw facts | Can erase intentional narrative geography; should be opt-in and deterministic |
| Scene/beat minimap | Helps authors understand long decks | Adds chrome during presentation; should likely be editor-only |
| Source arrays and citations view | Better support for composite timeline claims | Expands schema and UI; current model supports one primary source per entity |
| Performance sleep mode | Saves battery when all movement has settled | Active float intentionally never settles; needs a design decision on ambient motion |
| Automated visual regression | Catches camera/layout drift across browsers | Requires committed screenshots and stable rendering infrastructure |

## Scene-by-scene revised flow

1. **Graphs Are Awesome** — establish speaker, investor, builder, and disclosed portfolio locally.
2. **Same facts, different relationship cost** — replace an ideological database fight with a query-shape claim.
3. **Everything is already a graph** — generalize across domains.
4. **Agents leave a graph behind** — make the agent-specific bridge concrete.
5. **Agents became graph-shaped in public** — selected 2022–2026 status timeline, progressively revealed.
6. **Invert the ontology workflow** — propose observation-led evolution with human validation.
7. **The new job** — name five durable governance questions.
8. **A market forms around the questions** — connect workloads and infrastructure to those questions.
9. **The company landscape** — inspect one segment at a time, then reveal the overview.
10. **Pick a relationship-shaped problem** — move from thesis to buildable examples and frontiers.
11. **This deck is a graph** — reveal the open-source tool as the demonstration.
12. **You are a graph person** — close with the repository and an action.

## Release recommendation

The core is suitable for an initial open-source release after browser QA is green. The release should
be positioned as an intentionally small, dependency-free reference implementation—not yet a full
PowerPoint replacement. The strongest public demo is the included deck plus the single-file export.
The most important maintenance rule is to keep dated market claims sourced and visibly dated.
