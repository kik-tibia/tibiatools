#!/usr/bin/env node

/**
 * Merges bestiary.json and bestiary-ids.json into src/data/creatures.json.
 *
 * Usage:
 *   node merge-bestiary.js
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bestiary = JSON.parse(readFileSync(join(__dirname, "bestiary.json"), "utf-8"));
const bestiaryIds = JSON.parse(readFileSync(join(__dirname, "bestiary-ids.json"), "utf-8"));

const idsByName = new Map(bestiaryIds.map((b) => [b.name, b.id]));

const creatures = bestiary.map((creature) => {
  const id = idsByName.get(creature.name);
  if (id == null) {
    console.error(`Warning: no id found for "${creature.name}"`);
  }
  return { id, ...creature };
});

const outPath = join(__dirname, "..", "src", "data", "creatures.json");
writeFileSync(outPath, JSON.stringify(creatures, null, "\t") + "\n");
console.error(`Wrote ${creatures.length} creatures to src/data/creatures.json`);
