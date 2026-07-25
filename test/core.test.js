import test from "node:test";
import assert from "node:assert/strict";
import { compileDeck } from "../src/core/compile.js";
import {
  borderPoint,
  boundsFor,
  fitBounds,
  fitWindow,
  interpolateWindow,
} from "../src/core/geometry.js";

const miniDeck = {
  schemaVersion: "2.0",
  meta: { title: "Fixture" },
  entities: { shared: { title: "Shared fact" } },
  scenes: [
    {
      id: "one",
      title: "One",
      anchor: [100, 200],
      instances: [{ id: "one_shared", entity: "shared", pos: [0, 0], w: 100 }],
      beats: [{ id: "first", show: ["one_shared"], focus: ["one_shared"] }],
    },
    {
      id: "two",
      title: "Two",
      anchor: [1000, 1200],
      instances: [{ id: "two_shared", entity: "shared", pos: [50, -50], w: 100 }],
      beats: [{ id: "first", show: ["two_shared"], focus: ["two_shared"] }],
    },
  ],
  connections: [{ from: "one_shared", to: "two_shared" }],
};

test("compiler resolves one entity into independent visual instances", () => {
  const compiled = compileDeck(miniDeck);
  assert.deepEqual(compiled.entityIndex.get("shared"), ["one_shared", "two_shared"]);
  assert.notEqual(compiled.instanceMap.get("one_shared"), compiled.instanceMap.get("two_shared"));
  compiled.instanceMap.get("one_shared").pos[0] = 99;
  assert.equal(compiled.instanceMap.get("two_shared").pos[0], 50);
  assert.equal(miniDeck.scenes[0].instances[0].pos[0], 0, "caller data remains immutable");
});

test("bounds and camera fit honor scene anchors and mobile safe areas", () => {
  const compiled = compileDeck(miniDeck);
  for (const scene of compiled.scenes) {
    for (const instance of scene.instances) instance.sceneAnchor = scene.anchor;
  }
  const bounds = boundsFor(["one_shared"], compiled.instanceMap, new Map([
    ["one_shared", { width: 100, height: 60 }],
  ]));
  assert.deepEqual(bounds, { x0: 50, y0: 170, x1: 150, y1: 230, width: 100, height: 60 });

  const safeArea = { top: 84, right: 14, bottom: 112, left: 14 };
  const denseBounds = { x0: 0, y0: 0, x1: 620, y1: 260, width: 620, height: 260 };
  const fit = fitBounds(
    denseBounds,
    { width: 390, height: 844 },
    compiled.scenes[0].layout,
    { safeArea },
  );
  assert.ok(fit.scale < 0.8, "mobile may scale below the former clipping floor");
  assert.equal(fit.overflow, false);

  const projectX = (x) => 390 / 2 + (x - fit.x) * fit.scale;
  const projectY = (y) => 844 / 2 + (y - fit.y) * fit.scale;
  assert.ok(projectX(denseBounds.x0) >= safeArea.left);
  assert.ok(projectX(denseBounds.x1) <= 390 - safeArea.right);
  assert.ok(projectY(denseBounds.y0) >= safeArea.top);
  assert.ok(projectY(denseBounds.y1) <= 844 - safeArea.bottom);
});

test("edge endpoints stop at node borders", () => {
  const point = borderPoint(
    { x: 0, y: 0, width: 100, height: 40, isRing: false },
    200,
    0,
  );
  assert.ok(Math.abs(point[0] - 56) < Number.EPSILON * 64);
  assert.equal(point[1], 0);
});

test("overview windows reproduce a scene viewport and interpolate deterministically", () => {
  const viewport = { width: 390, height: 844 };
  const safeArea = { top: 84, right: 14, bottom: 112, left: 14 };
  const bounds = { x0: -300, y0: -100, x1: 300, y1: 100, width: 600, height: 200 };
  const layout = {
    fitMargin: 54,
    pushMargin: 160,
    zoomMax: 1,
    minReadableScale: 0.4,
  };
  const window = fitWindow(bounds, viewport, layout, {
    aspectRatio: 16 / 9,
    safeArea,
    cardSpace: 80,
  });
  assert.equal(window.halfWidth / window.halfHeight, 16 / 9);
  assert.equal(window.margin, 160);

  const halfway = interpolateWindow(
    { x: 0, y: 10, halfWidth: 100, halfHeight: 200, margin: 10, scale: 0.5 },
    { x: 20, y: 30, halfWidth: 200, halfHeight: 400, margin: 20, scale: 1 },
    0.5,
  );
  assert.deepEqual(halfway, {
    x: 10,
    y: 20,
    halfWidth: 150,
    halfHeight: 300,
    margin: 20,
    scale: 0.75,
  });
});

test("compiler adds deterministic safe defaults to optional overlays", () => {
  const deck = structuredClone(miniDeck);
  deck.scenes[1].overlay = {
    title: "The end",
    background: { type: "overviewTour" },
  };
  const overlay = compileDeck(deck).scenes[1].overlay;
  assert.deepEqual(overlay, {
    position: "center",
    shape: "slide",
    aspectRatio: "16:9",
    title: "The end",
    caption: "",
    background: {
      dim: 0.22,
      interactive: false,
      type: "overviewTour",
    },
    tour: {
      cycles: 1,
      moveMs: 850,
      pauseMs: 650,
      endBehavior: "hold",
    },
  });
  assert.equal(deck.scenes[1].overlay.background.dim, undefined, "caller data remains immutable");
});
