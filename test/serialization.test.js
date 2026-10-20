import test from "node:test";
import assert from "node:assert/strict";
import { compileDeck, serializeDeck } from "../src/core/compile.js";
import { parseAndValidateDeck } from "../src/loader/deck-loader.js";

function fixture() {
  return {
    schemaVersion: "2.0",
    meta: { title: "Hidden relationships fixture" },
    entities: {
      shared: { title: "Shared fact", source: "https://example.test/fact", sourceDate: "2026-01-01" },
      detail: { title: "Hidden detail", body: "Synthetic fixture, not a factual claim." },
      unused: { title: "Authored but not placed" },
    },
    scenes: [
      {
        id: "one", title: "One", anchor: [100, 200],
        instances: [
          { id: "one_shared", entity: "shared", pos: [0, 0] },
          { id: "one_detail", entity: "detail", pos: [200, 0] },
        ],
        edges: [{ id: "local", from: "one_shared", to: "one_detail", label: "has detail", kind: "light", curve: 0.2 }],
        beats: [
          { id: "first", show: ["one_shared"] },
          { id: "reveal", show: ["one_shared", "one_detail"], focus: ["one_detail"] },
        ],
      },
      {
        id: "two", title: "Two", anchor: [1000, 1200],
        instances: [{ id: "two_shared", entity: "shared", pos: [50, -50] }],
      },
    ],
    connections: [{ id: "cross", from: "one_detail", to: "two_shared", label: "connects to", kind: "cross" }],
  };
}

for (const inputKind of ["authored", "compiled"]) {
  test(`${inputKind} serialization preserves hidden instances, both edge scopes and metadata`, () => {
    const deck = fixture();
    const input = inputKind === "compiled" ? compileDeck(deck) : deck;
    const source = serializeDeck(input);
    const parsed = parseAndValidateDeck(source);
    const reopened = compileDeck(parsed);

    assert.deepEqual(parsed, deck, "save/reload preserves the entire authored representation");
    assert.deepEqual(reopened.scenes[0].beats[0].show, ["one_shared"]);
    assert.ok(reopened.instanceMap.has("one_detail"), "not in the first beat does not mean absent");
    assert.deepEqual(reopened.scenes[0].beats[1].show, ["one_shared", "one_detail"]);
    assert.deepEqual(reopened.entityIndex.get("shared"), ["one_shared", "two_shared"]);
    assert.deepEqual(reopened.edges, [
      { ...deck.scenes[0].edges[0], sceneId: "one" },
      { ...deck.connections[0], sceneId: null },
    ]);
    assert.ok(reopened.entities.has("unused"), "unplaced authored entities also survive");
    assert.ok(source.endsWith("\n"));
  });
}

test("compiled visibility arrays do not write back into the serialized source deck", () => {
  const deck = fixture();
  const compiled = compileDeck(deck);
  const original = serializeDeck(compiled);
  const beat = compiled.scenes[0].beats[1];

  // Exercise the current compiler's array isolation, not a future view API.
  beat.show.splice(0, beat.show.length, "one_shared");
  beat.focus.splice(0, beat.focus.length, "one_shared");
  beat.revealOrder.reverse();

  assert.equal(serializeDeck(compiled), original);
  assert.deepEqual(compiled.deck, deck);
  const reopened = compileDeck(parseAndValidateDeck(serializeDeck(compiled)));
  assert.deepEqual(reopened.scenes[0].beats[1].show, ["one_shared", "one_detail"]);
  assert.deepEqual(reopened.scenes[0].beats[1].focus, ["one_detail"]);
});

test("the derived edge list is not the source of serialized relationships", () => {
  const deck = fixture();
  const compiled = compileDeck(deck);
  compiled.edges[0].label = "temporary display label";
  compiled.edges[1].label = "temporary cross-scene label";
  compiled.edges.splice(0, compiled.edges.length);

  const reopened = compileDeck(parseAndValidateDeck(serializeDeck(compiled)));
  assert.deepEqual(reopened.deck, deck);
  assert.deepEqual(reopened.edges.map((edge) => edge.id), ["local", "cross"]);
});

test("compiler defaults and renderer annotations are not written into authored JSON", () => {
  const deck = fixture();
  const compiled = compileDeck(deck);
  assert.equal(compiled.scenes[1].beats[0].id, "all");
  assert.ok(compiled.scenes[0].layout);
  // buildGraph adds sceneAnchor to compiled instances in the current player.
  compiled.instanceMap.get("one_shared").sceneAnchor = compiled.scenes[0].anchor;

  assert.deepEqual(parseAndValidateDeck(serializeDeck(compiled)), deck);
});

test("repeated save/load/compile cycles retain a stable complete source deck", () => {
  const deck = fixture();
  const expected = serializeDeck(deck);
  let compiled = compileDeck(deck);
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const source = serializeDeck(compiled);
    assert.equal(source, expected);
    compiled = compileDeck(parseAndValidateDeck(source));
    assert.deepEqual(compiled.deck, deck);
    assert.deepEqual(compiled.edges.map((edge) => edge.id), ["local", "cross"]);
  }
});
