#!/usr/bin/env node

/**
 * Merges bestiary.json, additional-creatures.json and bestiary-ids.json into
 * src/data/creatures.json.
 *
 * additional-creatures.json holds creatures that are missing from the scraped
 * bestiary.json (e.g. bosses without a bestiary entry) and are maintained by
 * hand. Entries use the same shape as bestiary.json, optionally with an
 * explicit "id" when the creature is not in bestiary-ids.json either.
 *
 * Usage:
 *   node merge-bestiary.js
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bestiary = JSON.parse(readFileSync(join(__dirname, "bestiary.json"), "utf-8"));
const additional = JSON.parse(readFileSync(join(__dirname, "additional-creatures.json"), "utf-8"));
const bestiaryIds = JSON.parse(readFileSync(join(__dirname, "bestiary-ids.json"), "utf-8"));

const idsByName = new Map(bestiaryIds.map((b) => [b.name, b.id]));

const scrapedNames = new Set(bestiary.map((c) => c.name));
const extras = additional.filter((creature) => {
	if (scrapedNames.has(creature.name)) {
		console.error(`Note: "${creature.name}" is now in bestiary.json, ignoring the manual entry`);
		return false;
	}
	return true;
});

const merged = [...bestiary, ...extras].sort((a, b) => a.name.localeCompare(b.name));

const creatures = merged.map((creature) => {
	const id = creature.id ?? idsByName.get(creature.name);
	if (id == null) {
		console.error(`Warning: no id found for "${creature.name}"`);
	}
	return { id, ...creature };
});

const outPath = join(__dirname, "..", "src", "data", "creatures.json");
writeFileSync(outPath, JSON.stringify(creatures, null, "\t") + "\n");
console.error(`Wrote ${creatures.length} creatures to src/data/creatures.json`);
