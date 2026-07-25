# Prezograph JSON reference

The canonical contract is `schemas/deck.schema.json`; the runtime validator is
`src/core/schema.js`. Both currently require `schemaVersion: "2.0"`.

## Minimal shape

```json
{
  "schemaVersion": "2.0",
  "meta": { "title": "A graph story" },
  "entities": {
    "idea": { "title": "A reusable fact" }
  },
  "scenes": [{
    "id": "opening",
    "title": "Opening",
    "anchor": [500, 400],
    "instances": [
      { "id": "opening_idea", "entity": "idea", "pos": [0, 0], "kind": "hub" }
    ],
    "edges": [],
    "beats": [{
      "id": "first",
      "show": ["opening_idea"],
      "focus": ["opening_idea"],
      "revealOrder": ["opening_idea"]
    }]
  }],
  "connections": []
}
```

## Invariants

- Entity, scene, instance, beat, and edge IDs begin with a letter.
- Instance IDs are globally unique.
- Every instance references an existing entity.
- Every edge endpoint references an existing instance.
- Beat lists reference instances in their own scene and contain no duplicates.
- Visuals are allow-listed structured renderers: `network7`, `table7`, or `jsonSnippet`.
- Entity source links use only `http` or `https`.
- A deck is limited to 5,000 instances and 12,000 edges by the default validator.
- Deck content is plain text. Raw HTML, SVG, JavaScript, event attributes, and arbitrary visual
  names are not schema fields.

## Optional overlay scene

Any scene may add a centered slide-shaped overlay. `title` and `caption` are always inert text. An
`overviewTour` background reuses the numbered 16:9 scene window; bounded timing and cycle fields
keep imported decks from creating unbounded authored animation work.

```json
{
  "overlay": {
    "position": "center",
    "shape": "slide",
    "aspectRatio": "16:9",
    "title": "(you)-[:builds]->(graphs)",
    "caption": "thank you — go draw the edges",
    "background": {
      "type": "overviewTour",
      "dim": 0.1,
      "interactive": false
    },
    "tour": {
      "cycles": 1,
      "moveMs": 760,
      "pauseMs": 420,
      "endBehavior": "hold"
    }
  }
}
```

## Content heuristics

- Prefer 6–12 scenes and 1–5 beats per scene.
- Focus fewer nodes than are shown when context should remain visible.
- Use local instances of a shared entity rather than stretching one visual node across scenes.
- Label market maps and dated landscapes with an as-of date and disclose selection conflicts.
