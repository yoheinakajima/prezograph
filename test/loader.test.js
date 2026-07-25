import test from "node:test";
import assert from "node:assert/strict";
import { fetchDeck, MAX_DECK_BYTES, parseAndValidateDeck, resolveDeckUrl } from "../src/loader/deck-loader.js";

const validDeck = {
  schemaVersion: "2.0",
  meta: { title: "Safe fixture" },
  entities: { fact: { title: "Fact" } },
  scenes: [{
    id: "scene",
    title: "Scene",
    anchor: [0, 0],
    instances: [{ id: "scene_fact", entity: "fact", pos: [0, 0] }],
    beats: [{ id: "beat", show: ["scene_fact"], focus: ["scene_fact"] }],
  }],
};

test("deck URLs are limited to the current HTTP(S) origin", () => {
  assert.equal(
    resolveDeckUrl("./deck.json", "https://example.test/app/").href,
    "https://example.test/app/deck.json",
  );
  assert.throws(
    () => resolveDeckUrl("https://attacker.test/deck.json", "https://example.test/app/"),
    /same HTTP\(S\) origin/,
  );
  assert.throws(
    () => resolveDeckUrl("javascript:alert(1)", "https://example.test/app/"),
    /same HTTP\(S\) origin/,
  );
});

test("local JSON is parsed and schema-validated before use", () => {
  assert.deepEqual(parseAndValidateDeck(JSON.stringify(validDeck)), validDeck);
  assert.throws(() => parseAndValidateDeck("{"), /JSON parse error/);
  assert.throws(
    () => parseAndValidateDeck(JSON.stringify({ ...validDeck, schemaVersion: "old" })),
    /schemaVersion/,
  );
  assert.throws(
    () => parseAndValidateDeck(" ".repeat(MAX_DECK_BYTES + 1)),
    /exceeds 5 MB/,
  );
});

test("same-origin fetches enforce response limits and validation", async () => {
  const deck = await fetchDeck("./deck.json", {
    baseUrl: "https://example.test/app/",
    fetcher: async (url) => {
      assert.equal(url.href, "https://example.test/app/deck.json");
      return new Response(JSON.stringify(validDeck), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(deck.meta.title, "Safe fixture");

  await assert.rejects(
    fetchDeck("./large.json", {
      baseUrl: "https://example.test/app/",
      fetcher: async () => new Response("{}", {
        headers: { "content-length": String(MAX_DECK_BYTES + 1) },
      }),
    }),
    /response exceeds 5 MB/,
  );
});
