#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { escapeInlineScript } from "../src/core/escape.js";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist/prezograph.html");
const deckPath = path.resolve(process.argv[2] || path.join(root, "examples/graphs-are-awesome/reviewed.deck.json"));

const modulePaths = [
  "src/core/schema.js",
  "src/core/geometry.js",
  "src/core/compile.js",
  "src/player/visuals.js",
  "src/player/player.js",
];

const stripModuleSyntax = (code) =>
  code
    .replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, "")
    .replace(/^export\s+(?=(class|function|const|let|var)\s)/gm, "")
    .replace(/^export\s*\{[^}]+\};?\s*$/gm, "");

const [css, deck, ...modules] = await Promise.all([
  readFile(path.join(root, "src/player/styles.css"), "utf8"),
  readFile(deckPath, "utf8"),
  ...modulePaths.map((file) => readFile(path.join(root, file), "utf8")),
]);

const script = escapeInlineScript([
  `"use strict";`,
  `globalThis.PREZOGRAPH_DECK = ${deck.trim()};`,
  ...modules.map(stripModuleSyntax),
  `const app = document.querySelector("#app");`,
  `const player = new PrezographPlayer(app, globalThis.PREZOGRAPH_DECK);`,
  `player.controls.decks.hidden = true;`,
].join("\n\n"));

const digest = (value) => createHash("sha256").update(value).digest("base64");
const csp = [
  "default-src 'none'",
  `style-src 'sha256-${digest(css)}'`,
  `script-src 'sha256-${digest(script)}'`,
  "img-src data:",
  "connect-src 'none'",
  "font-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Prezograph · Single-file deck</title>
  <style>${css}</style>
</head>
<body>
  <main id="app" aria-live="polite"></main>
  <script>${script}</script>
</body>
</html>
`;

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`Built ${output}`);
