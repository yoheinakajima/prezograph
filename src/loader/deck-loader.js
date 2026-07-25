import { assertValidDeck, formatIssues } from "../core/schema.js";

export const MAX_DECK_BYTES = 5_000_000;

export const DECK_CATALOG = [
  {
    id: "reviewed",
    label: "Graphs Are Awesome — reviewed",
    url: "./examples/graphs-are-awesome/reviewed.deck.json",
  },
  {
    id: "technical-preview",
    label: "Graphs Are Awesome — technical preview",
    url: "./examples/graphs-are-awesome/deck.json",
  },
];

export function resolveDeckUrl(requested, baseUrl = globalThis.location?.href) {
  if (!baseUrl) throw new Error("A base URL is required");
  const base = new URL(baseUrl);
  const url = new URL(requested, base);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== base.origin) {
    throw new Error("Deck URLs must use the same HTTP(S) origin");
  }
  return url;
}

export function parseAndValidateDeck(source, options = {}) {
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > (options.maxBytes ?? MAX_DECK_BYTES)) {
    throw new Error(`Deck rejected: input exceeds ${Math.floor((options.maxBytes ?? MAX_DECK_BYTES) / 1_000_000)} MB`);
  }
  let deck;
  try {
    deck = JSON.parse(source);
  } catch (error) {
    throw new Error(`JSON parse error: ${error.message}`);
  }
  try {
    return assertValidDeck(deck);
  } catch (error) {
    if (error.issues) throw new Error(formatIssues(error.issues));
    throw error;
  }
}

export async function fetchDeck(requested, options = {}) {
  const url = resolveDeckUrl(requested, options.baseUrl);
  const response = await (options.fetcher ?? fetch)(url);
  if (!response.ok) throw new Error(`Could not load deck: ${response.status} ${response.statusText}`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > (options.maxBytes ?? MAX_DECK_BYTES)) {
    throw new Error("Deck rejected: response exceeds 5 MB");
  }
  return parseAndValidateDeck(await response.text(), options);
}

export function attachDeckSelector(player, options = {}) {
  const catalog = options.catalog ?? DECK_CATALOG;
  const picker = player.shell.querySelector(".pz-deck-picker");
  const select = picker.querySelector("select");
  const fileInput = picker.querySelector("input[type=file]");
  const error = picker.querySelector(".pz-deck-error");
  const openButton = player.controls.decks;
  const closeButton = picker.querySelector('[data-deck-action="close"]');
  const loadButton = picker.querySelector('[data-deck-action="load"]');
  const fileButton = picker.querySelector('[data-deck-action="file"]');

  select.replaceChildren(...catalog.map((entry) => {
    const option = document.createElement("option");
    option.value = entry.url;
    option.textContent = entry.label;
    return option;
  }));

  function setOpen(open) {
    picker.hidden = !open;
    error.textContent = "";
    if (open) select.focus();
    else openButton.focus();
  }

  async function replaceFromUrl(url) {
    error.textContent = "";
    loadButton.disabled = true;
    try {
      const deck = await fetchDeck(url, { baseUrl: location.href });
      player.loadDeck(deck);
      setOpen(false);
      player.toast(`Loaded ${deck.meta.title}`);
      const next = new URL(location.href);
      next.searchParams.set("deck", url);
      history.replaceState(null, "", next);
    } catch (loadError) {
      error.textContent = loadError.message;
    } finally {
      loadButton.disabled = false;
    }
  }

  openButton.addEventListener("click", () => setOpen(true));
  closeButton.addEventListener("click", () => setOpen(false));
  loadButton.addEventListener("click", () => replaceFromUrl(select.value));
  fileButton.addEventListener("click", () => fileInput.click());
  picker.addEventListener("click", (event) => {
    if (event.target === picker) setOpen(false);
  });
  picker.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_DECK_BYTES) throw new Error("Deck rejected: file exceeds 5 MB");
      const deck = parseAndValidateDeck(await file.text());
      player.loadDeck(deck);
      setOpen(false);
      player.toast(`Loaded ${file.name}`);
    } catch (loadError) {
      error.textContent = loadError.message;
    } finally {
      fileInput.value = "";
    }
  });

  return { open: () => setOpen(true), close: () => setOpen(false), replaceFromUrl };
}
