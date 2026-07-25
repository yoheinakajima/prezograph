import { PrezographPlayer } from "./player/player.js";
import { attachDeckSelector, fetchDeck } from "./loader/deck-loader.js";
import { formatIssues } from "./core/schema.js";

const app = document.querySelector("#app");

async function loadInitialDeck() {
  if (globalThis.PREZOGRAPH_DECK) return globalThis.PREZOGRAPH_DECK;
  const params = new URLSearchParams(location.search);
  const requested = params.get("deck") ?? "./examples/graphs-are-awesome/reviewed.deck.json";
  return fetchDeck(requested, { baseUrl: location.href });
}

try {
  const deck = await loadInitialDeck();
  const player = new PrezographPlayer(app, deck);
  attachDeckSelector(player);
  globalThis.prezograph = player;
} catch (error) {
  const heading = document.createElement("h1");
  heading.textContent = "Prezograph could not load this deck";
  const message = document.createElement("pre");
  message.textContent = error.issues ? formatIssues(error.issues) : error.message;
  app.className = "pz-fatal";
  app.replaceChildren(heading, message);
}
