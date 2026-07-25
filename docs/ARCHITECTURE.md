# Architecture

```mermaid
flowchart LR
  JSON["deck.json"] --> V["Schema validator"]
  V --> C["Compiler"]
  C --> P["Player"]
  L["Deck selector / local file"] --> V
  P --> DOM["Safe DOM + SVG"]
  C --> B["Single-file builder"]
  B --> HTML["Portable HTML + hashed CSP"]
```

## Boundaries

| Module | Responsibility | Must not do |
|---|---|---|
| `core/schema.js` | Reject malformed, oversized, or dangling graph data | Touch the DOM |
| `core/compile.js` | Clone input, resolve entities, normalize beats and layout | Mutate caller data |
| `core/geometry.js` | Bounds, camera fit, edge endpoints | Depend on browser globals |
| `player/player.js` | Render, navigate, animate, pan, zoom, announce | Interpret arbitrary HTML |
| `player/visuals.js` | Render allow-listed structured mini-visuals | Execute deck-provided code |
| `loader/deck-loader.js` | Same-origin catalog fetch and validated local import | Replace a valid active deck before validation |
| `cli/` | Validate and summarize deck files | Render |

## Current v2 entity and instance model

An entity is a reusable fact. An instance is a scene-local view of that fact:

```mermaid
flowchart TD
  E["entity: co_mem0"] --> A["instance: title_mem0"]
  E --> B["instance: co_mem0"]
  A --> S1["title scene"]
  B --> S2["company landscape"]
```

This prevents a shared node's physical coordinates from expanding an unrelated scene's camera
bounds. Instance IDs are globally unique; entity IDs may be referenced by many instances.

This is a transitional representation, not the final conceptual model. The target compiler keeps
one semantic node identity and derives a slide-local render target for every participating node.
See [PRODUCT_DIRECTION.md](PRODUCT_DIRECTION.md). A schema migration must precede any change to
this public contract.

## Beat semantics

Each beat has three explicit lists:

- `show` — nodes present in the current narrative state;
- `focus` — nodes used for camera fitting and keyboard interaction;
- `revealOrder` — newly added nodes animated in sequence.

There is no implicit “all nodes with step less than N” behavior. A beat is a complete snapshot,
which makes deletions, reorderings, and tests deterministic.
