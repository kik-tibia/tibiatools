#!/usr/bin/env node

/**
 * Post-processes scraped weapon JSON files from scripts/scraped/
 * and combines them into scripts/processed/weapons.json.
 *
 * Stable integer ids are assigned by name from scripts/weapons-ids.json.
 * New weapons must be added there (otherwise their id is left undefined).
 *
 * Usage:
 *   node post-process-weapons.js
 */

import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { writeJson } from "./write-json.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scrapedDir = join(__dirname, "scraped");
const outPath = join(__dirname, "processed", "weapons.json");
const idsPath = join(__dirname, "weapons-ids.json");

const ALL_VOCATIONS = ["druid", "knight", "monk", "paladin", "sorcerer"];

const FILE_TO_SKILL = {
  swords: "sword",
  axes: "axe",
  clubs: "club",
  fists: "fist",
  bows: "distance",
  crossbows: "distance",
  throwing: "distance",
  wands: null,
};

const FILE_TO_AMMO = {
  bows: "arrows",
  crossbows: "bolts",
};

/**
 * Wiki page titles that carry a disambiguation suffix because another page
 * (usually a creature) shares the name. Keyed by scraped name.
 */
const NAME_OVERRIDES = {
  "Souleater (Axe)": "Souleater",
};

/**
 * Map of known vocation strings to their canonical singular forms.
 */
const VOCATION_MAP = {
  knight: "knight",
  knights: "knight",
  paladin: "paladin",
  paladins: "paladin",
  sorcerer: "sorcerer",
  sorcerers: "sorcerer",
  druid: "druid",
  druids: "druid",
  monk: "monk",
  monks: "monk",
};

/**
 * Parse the vocation field from the wiki into a vocations array.
 *
 * Examples:
 *   "" or "None" or "without" -> all vocations
 *   "knights" -> ["knight"]
 *   "sorcerers and druids" -> ["druid", "sorcerer"]
 */
function parseVocations(raw) {
  const trimmed = raw.trim().toLowerCase();

  if (!trimmed || trimmed === "none" || trimmed === "without") {
    return [...ALL_VOCATIONS];
  }

  // Split on "and", ",", or "&" to handle multi-vocation strings
  const parts = trimmed.split(/\s*(?:and|,|&)\s*/);
  const vocations = [];

  for (const part of parts) {
    const mapped = VOCATION_MAP[part.trim()];
    if (mapped && !vocations.includes(mapped)) {
      vocations.push(mapped);
    } else if (!mapped) {
      console.error(`Warning: unknown vocation "${part.trim()}"`);
    }
  }

  if (vocations.length === 0) {
    return [...ALL_VOCATIONS];
  }

  vocations.sort();
  return vocations;
}

function processWeapon(weapon, skill, ammo, idsByName) {
  const { vocation, hit_mod, ...rest } = weapon;

  if (rest.name in NAME_OVERRIDES) {
    rest.name = NAME_OVERRIDES[rest.name];
  }

  // Remove fields with empty string values
  for (const key of Object.keys(rest)) {
    if (rest[key] === "") delete rest[key];
  }

  // Convert attack to total attack (physical + elemental)
  const elementalKeys = ["attackDeath", "attackEarth", "attackEnergy", "attackFire", "attackHoly", "attackIce"];
  const physical = parseInt(rest.attack) || 0;
  const elemental = elementalKeys.reduce((sum, key) => sum + (parseInt(rest[key]) || 0), 0);
  const totalAttack = physical + elemental;

  // Lowercase bond field if present
  if (rest.bond) {
    rest.bond = rest.bond.toLowerCase();
  }

  // Lowercase hands field if present
  if (rest.hands) {
    rest.hands = rest.hands.toLowerCase();
  }

  // Convert defenseMod to a number if present
  if (rest.defenseMod) {
    rest.defenseMod = parseInt(rest.defenseMod);
  }

  // Convert hit_mod to a number if present (can be signed, e.g. "+6" or "-2")
  const hitMod = hit_mod ? parseInt(hit_mod) : undefined;

  // For wands/rods, convert damageRange to damage and remove attack
  if ("damageRange" in weapon) {
    delete rest.attack;
    const raw = rest.damageRange || "";
    delete rest.damageRange;
    if (!raw) {
      rest.damage = 0;
    } else if (/^\d+\s*\(/.test(raw)) {
      // Format: "92 (86-98)" — take the leading number
      rest.damage = parseInt(raw);
    } else if (raw.includes("-")) {
      // Format: "70-110" — take the mean
      const [lo, hi] = raw.split("-").map(Number);
      rest.damage = Math.round((lo + hi) / 2);
    } else {
      rest.damage = parseInt(raw) || 0;
    }
  }

  // Lowercase damageType if present
  if (rest.damageType) {
    rest.damageType = rest.damageType.toLowerCase();
  }

  // Pull out elemental fields to control ordering
  const { attack: _, name, ...remaining } = rest;
  const elementalFields = {};
  for (const key of elementalKeys) {
    if (remaining[key]) {
      elementalFields[key] = parseInt(remaining[key]);
      delete remaining[key];
    }
  }

  const id = idsByName.get(name);
  if (id == null) {
    console.error(`Warning: no id found for "${name}" (add it to weapons-ids.json)`);
  }

  const hasAttack = !("damageRange" in weapon);
  return {
    id,
    name,
    ...(hasAttack && { attack: totalAttack }),
    ...elementalFields,
    ...(hitMod != null && { hitMod }),
    ...(skill && { skill }),
    ...(ammo && { ammo }),
    ...remaining,
    vocations: parseVocations(vocation || ""),
  };
}

async function main() {
  const files = readdirSync(scrapedDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.error("No JSON files found in scripts/scraped/");
    process.exit(1);
  }

  const idEntries = JSON.parse(readFileSync(idsPath, "utf-8"));
  const idsByName = new Map(idEntries.map((e) => [e.name, e.id]));

  let allWeapons = [
    {
      id: idsByName.get("Fists"),
      name: "Fists",
      attack: 7,
      skill: "fist",
      vocations: [...ALL_VOCATIONS],
    },
  ];

  for (const file of files) {
    const baseName = file.replace(".json", "");
    if (!(baseName in FILE_TO_SKILL)) {
      console.error(`  Skipping ${file} (not a weapon file)`);
      continue;
    }
    const skill = FILE_TO_SKILL[baseName];

    const filePath = join(scrapedDir, file);
    console.error(`Processing ${file}...`);

    const raw = JSON.parse(readFileSync(filePath, "utf-8"));

    // Filter out empty objects (DPL quirk)
    const filtered = raw.filter(
      (w) => w && Object.keys(w).length > 0
    );

    const ammo = FILE_TO_AMMO[baseName];
    const processed = filtered.map((w) => processWeapon(w, skill, ammo, idsByName));
    console.error(`  ${processed.length} weapons`);
    allWeapons = allWeapons.concat(processed);
  }

  await writeJson(outPath, allWeapons);
  console.error(`Wrote ${allWeapons.length} weapons to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
