import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateDeck } from "../src/core/schema.js";

const fixture = JSON.parse(
  await readFile(new URL("../examples/graphs-are-awesome/deck.json", import.meta.url), "utf8"),
);

test("example deck validates", () => {
  assert.deepEqual(validateDeck(fixture), { valid: true, issues: [] });
});

test("dangling references fail with a useful path", () => {
  const deck = structuredClone(fixture);
  deck.connections[0].to = "missing_instance";
  const result = validateDeck(deck);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) =>
    issue.path === "connections[0].to" && issue.message.includes("missing_instance"),
  ));
});

test("untrusted text remains data and arbitrary visuals are rejected", () => {
  const textDeck = structuredClone(fixture);
  textDeck.entities.t_hub.title = '<img src=x onerror="globalThis.pwned=true">';
  assert.equal(validateDeck(textDeck).valid, true);

  textDeck.scenes[0].instances[0].visual = "rawHtml";
  assert.equal(validateDeck(textDeck).valid, false);
});

test("active URLs and unknown document properties are rejected", () => {
  const deck = structuredClone(fixture);
  deck.entities.t_hub.source = "javascript:alert(1)";
  deck.scenes[0].instances[0].rawHtml = "<svg onload=alert(1)>";
  const result = validateDeck(deck);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.path === "entities.t_hub.source"));
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".rawHtml")));
});

test("resource limits are enforced", () => {
  const result = validateDeck(fixture, { maxNodes: 2 });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.message.includes("maximum is 2")));
});

test("safe scene overlays validate while executable or unbounded fields do not", () => {
  const deck = structuredClone(fixture);
  deck.scenes.at(-1).overlay = {
    position: "center",
    shape: "slide",
    aspectRatio: "16:9",
    title: '<img src=x onerror="globalThis.pwned=true">',
    caption: "Inert closing copy",
    background: {
      type: "overviewTour",
      dim: 0.1,
      interactive: false,
    },
    tour: {
      cycles: 1,
      moveMs: 760,
      pauseMs: 420,
      endBehavior: "hold",
    },
  };
  assert.equal(validateDeck(deck).valid, true, "overlay copy remains inert text");

  deck.scenes.at(-1).overlay.rawHtml = "<script>alert(1)</script>";
  deck.scenes.at(-1).overlay.tour.cycles = 1000;
  const result = validateDeck(deck);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".overlay.rawHtml")));
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".overlay.tour.cycles")));
});
