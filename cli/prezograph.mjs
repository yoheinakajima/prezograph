#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { formatIssues, validateDeck } from "../src/core/schema.js";

const [command = "help", input] = process.argv.slice(2);

const help = () => {
  console.log(`Prezograph — open-source graph-based presentations from versioned JSON.

Usage:
  prezograph validate <deck.json>
  prezograph stats <deck.json>
  npm run build -- [deck.json]
  npm run serve

Current interfaces:
  available  browser player + safe deck loader, JSON schema, validation/stats CLI, offline HTML
  planned    YAML, hosted API, MCP, persistent sharing

Agent output must remain inert .prezograph.json. Treat every imported deck as untrusted content.
`);
};

if (command === "help" || command === "--help" || command === "-h") {
  help();
  process.exit(0);
}

if (!input) {
  help();
  process.exitCode = 1;
} else {
  const file = path.resolve(input);
  let deck;
  try {
    deck = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    console.error(`Could not read ${file}: ${error.message}`);
    process.exit(1);
  }

  const result = validateDeck(deck);
  if (command === "validate") {
    if (!result.valid) {
      console.error(formatIssues(result.issues));
      process.exit(1);
    }
    console.log(
      `Valid Prezograph ${deck.schemaVersion}: ${deck.scenes.length} scenes, ${
        Object.keys(deck.entities).length
      } entities`,
    );
  } else if (command === "stats") {
    const beats = deck.scenes.reduce((sum, scene) => sum + scene.beats.length, 0);
    const instances = deck.scenes.reduce((sum, scene) => sum + scene.instances.length, 0);
    const edges =
      deck.connections.length +
      deck.scenes.reduce((sum, scene) => sum + (scene.edges?.length || 0), 0);
    console.log(
      JSON.stringify(
        {
          schemaVersion: deck.schemaVersion,
          entities: Object.keys(deck.entities).length,
          scenes: deck.scenes.length,
          beats,
          instances,
          edges,
          valid: result.valid,
          issues: result.issues,
        },
        null,
        2,
      ),
    );
    if (!result.valid) process.exitCode = 1;
  } else {
    console.error(`Unknown command: ${command}`);
    help();
    process.exitCode = 1;
  }
}
