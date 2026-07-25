import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateDeck } from "../src/core/schema.js";

const deckText = await readFile(
  new URL("../examples/graphs-are-awesome/reviewed.deck.json", import.meta.url),
  "utf8",
);
const deck = JSON.parse(deckText);

test("reviewed legacy adaptation is valid, inert, and preserves the authored narrative", () => {
  assert.equal(validateDeck(deck).valid, true);
  assert.equal(deck.scenes.length, 12);
  assert.ok(deck.scenes.some((scene) => scene.id === "order-chaos"));
  assert.ok(deck.scenes.some((scene) => scene.id === "rows-edges"));
  assert.doesNotMatch(deckText, /<script|<svg|<div|javascript:/i);
});

test("reviewed deck locks the requested content corrections", () => {
  const everything = deck.scenes.find((scene) => scene.id === "everything");
  assert.ok(everything.edges.some((edge) =>
    edge.from === "i_nrt" && edge.to === "i_sea" && edge.label === ":flight",
  ));
  assert.match(deck.entities.ex_reason.tip, /reasoning trees/i);
  assert.match(deck.entities.ex_world.tip, /affordance graphs/i);
  assert.match(deck.entities.ex_teams.tip, /delegation/i);
  assert.match(deck.entities.ex_tools.tip, /typed registries/i);
  const timeline = deck.scenes.find((scene) => scene.id === "timeline");
  assert.ok(timeline.instances.some((instance) => instance.entity === "tl_op"));
  assert.ok(timeline.instances.some((instance) => instance.entity === "tl_responses"));
  assert.ok(timeline.instances.some((instance) => instance.entity === "tl_a2a"));
  assert.equal(timeline.beats.length, 3);
});

test("company stage is name-only and reflects active-status review", () => {
  const companies = deck.scenes.find((scene) => scene.id === "companies");
  const visibleEntityIds = companies.instances.map((instance) => instance.entity);
  assert.ok(visibleEntityIds.includes("co_cognee"));
  assert.ok(!visibleEntityIds.includes("co_graphlit"));
  assert.match(deck.entities.co_graphlit.tip, /winding down/i);
  assert.match(deck.entities.co_hypermodedgrap.tip, /Istari Digital/i);
  assert.equal(
    visibleEntityIds.filter((id) => id.startsWith("co_") || id === "t_zep").length,
    15,
  );
  for (const entityId of visibleEntityIds.filter((id) => id.startsWith("co_"))) {
    assert.equal(deck.entities[entityId].sub, undefined, `${entityId} should not show a subtitle`);
    assert.equal(deck.entities[entityId].body, undefined, `${entityId} should not show body copy`);
  }
});
