import { PrezographPlayer } from "../src/player/player.js";

const response = await fetch("../examples/graphs-are-awesome/reviewed.deck.json");
const deck = await response.json();
const player = new PrezographPlayer(document.querySelector("#app"), deck, {
  reducedMotion: false,
});

globalThis.prezograph = player;
