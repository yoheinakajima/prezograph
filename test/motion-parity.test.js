import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { frameEase, GRAPH_DECK_MOTION } from "../src/player/motion.js";

const [css, legacy] = await Promise.all([
  readFile(new URL("../src/player/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../legacy/graph-deck_1.html", import.meta.url)),
]);

test("the executable motion reference remains byte-for-byte immutable", () => {
  assert.equal(
    createHash("sha256").update(legacy).digest("hex"),
    "a35945c599de456eb014da6c85e953d697532b9d2c7418473e85d7f8a2a5effb",
  );
});

test("motion constants preserve the original graph-deck timing profile", () => {
  assert.deepEqual(GRAPH_DECK_MOTION.initialCamera, {
    x: 2000,
    y: 1200,
    scale: 0.3,
  });
  assert.equal(GRAPH_DECK_MOTION.revealStartMs, 80);
  assert.equal(GRAPH_DECK_MOTION.revealStaggerMs, 140);
  assert.equal(GRAPH_DECK_MOTION.tourStartDelayMs, 500);
  assert.equal(GRAPH_DECK_MOTION.tourMoveMs, 700);
  assert.equal(GRAPH_DECK_MOTION.tourPauseMs, 500);
  assert.equal(GRAPH_DECK_MOTION.edgeFrameStride, 2);
});

test("elapsed-time easing equals the original per-frame factors at 60fps", () => {
  assert.ok(Math.abs(frameEase(0.065, 1 / 60) - 0.065) < Number.EPSILON * 8);
  assert.ok(Math.abs(frameEase(0.06, 1 / 60) - 0.06) < Number.EPSILON * 8);
  assert.ok(frameEase(0.065, 1 / 30) > 0.065, "a slower frame catches up instead of slowing motion");
});

test("CSS locks original node, edge, card, and context fades", () => {
  assert.match(css, /--pz-node-fade:\s*700ms/);
  assert.match(css, /--pz-edge-fade:\s*700ms/);
  assert.match(css, /--pz-card-fade:\s*550ms/);
  assert.match(css, /--pz-card-delay:\s*120ms/);
  assert.match(css, /--pz-card-move:\s*700ms/);
  assert.match(css, /\.pz-node\.is-context\s*\{[^}]*opacity:\s*0\.55/s);
  assert.match(css, /\.pz-edge\.is-on\s*\{[^}]*opacity:\s*0\.9/s);
  assert.match(css, /\.pz-edge\.is-half\s*\{[^}]*opacity:\s*0\.3/s);
  assert.match(css, /\.pz-dot\s*\{[^}]*transition:\s*background 300ms ease/s);
  assert.match(css, /\.pz-tip\s*\{[^}]*transition:\s*opacity 180ms ease/s);
});
