#!/usr/bin/env node

/**
 * Tibia Wiki Ammo Scraper
 *
 * Fetches ammo data from a custom wiki page that outputs JSON via DPL,
 * using the MediaWiki API, then saves the result split into arrows and bolts.
 *
 * Stable integer ids are assigned by name from scripts/ammo-ids.json.
 * New ammo must be added there (otherwise its id is left undefined).
 *
 * Usage:
 *   node scrape-ammo.js
 */

import { JSDOM } from "jsdom";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE = "User:Kikaro/json/ammo";

const idsPath = join(__dirname, "ammo-ids.json");

const API_BASE =
  "https://tibia.fandom.com/api.php?action=parse&prop=text&format=json&page=";

const ELEMENTAL_KEYS = ["attackDeath", "attackEarth", "attackEnergy", "attackFire", "attackHoly", "attackIce"];

// Ammo that hits an area rather than a single target
const AOE_AMMO = new Set([
  "Burst Arrow",
  "Diamond Arrow",
  "Shatterstorm Arrow",
  "Firestorm Arrow",
  "Terrastorm Arrow",
  "Froststorm Arrow",
  "Thunderstorm Arrow",
]);

async function fetchAmmoJson() {
  const url = API_BASE + encodeURIComponent(PAGE);
  console.error(`Fetching ${PAGE}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`API error: ${data.error.info}`);
  }

  const html = data.parse.text["*"];
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const container = doc.querySelector(".mw-parser-output");
  if (!container) {
    throw new Error("Could not find .mw-parser-output div");
  }

  const text = container.textContent.trim();
  const items = JSON.parse(text);

  console.error(`Parsed ${items.length} ammo items`);
  return items;
}

function processAmmo(item, idsByName) {
  const id = idsByName.get(item.name);
  if (id == null) {
    console.error(`Warning: no id found for "${item.name}" (add it to ammo-ids.json)`);
  }

  // Convert attack to total attack (physical + elemental)
  const physical = parseInt(item.attack) || 0;
  const elementalFields = {};
  for (const key of ELEMENTAL_KEYS) {
    const value = parseInt(item[key]);
    if (value) elementalFields[key] = value;
  }
  const elemental = Object.values(elementalFields).reduce((sum, v) => sum + v, 0);

  const hitChance = parseInt(item.hit_chance);

  const aoe = AOE_AMMO.has(item.name);
  if (hitChance === 100 && !aoe) {
    console.error(`Warning: "${item.name}" has 100% hit chance but is not in AOE_AMMO (new area ammo?)`);
  }

  return {
    id,
    name: item.name,
    attack: physical + elemental,
    ...elementalFields,
    ...(Number.isFinite(hitChance) && { hitChance }),
    aoe,
  };
}

async function main() {
  const items = await fetchAmmoJson();

  const idEntries = JSON.parse(readFileSync(idsPath, "utf-8"));
  const idsByName = new Map(idEntries.map((e) => [e.name, e.id]));

  const arrows = [];
  const bolts = [];

  for (const item of items.filter((i) => i.name)) {
    const entry = processAmmo(item, idsByName);

    const nameLower = item.name.toLowerCase();
    if (nameLower.includes("arrow")) {
      arrows.push(entry);
    } else if (nameLower.includes("bolt")) {
      bolts.push(entry);
    } else {
      console.error(`Warning: "${item.name}" is neither arrow nor bolt, skipping`);
    }
  }

  // Keep stable id order rather than the wiki's alphabetical order
  const byId = (a, b) => (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
  arrows.sort(byId);
  bolts.sort(byId);

  const result = { arrows, bolts };
  const outDir = join(__dirname, "scraped");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "ammo.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.error(`Wrote ${outPath} (${arrows.length} arrows, ${bolts.length} bolts)`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
