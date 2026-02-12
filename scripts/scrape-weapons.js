#!/usr/bin/env node

/**
 * Tibia Wiki Weapon Scraper
 *
 * Fetches weapon data from custom wiki pages that output JSON via DPL,
 * using the MediaWiki API, then saves the result.
 *
 * Usage:
 *   node scrape-weapons.js
 */

import { JSDOM } from "jsdom";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGES = {
  swords: "User:Kikaro/json/swords",
  axes: "User:Kikaro/json/axes",
  clubs: "User:Kikaro/json/clubs",
  fists: "User:Kikaro/json/fists",
  bows: "User:Kikaro/json/bows",
  crossbows: "User:Kikaro/json/crossbows",
  throwing: "User:Kikaro/json/throwing",
  wands: "User:Kikaro/json/wands",
};

const API_BASE =
  "https://tibia.fandom.com/api.php?action=parse&prop=text&format=json&page=";

async function fetchWeaponJson(page) {
  const url = API_BASE + encodeURIComponent(page);
  console.error(`Fetching ${page}...`);

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
  const weapons = JSON.parse(text);

  console.error(`Parsed ${weapons.length} weapons`);
  return weapons;
}

async function main() {
  const outDir = join(__dirname, "scraped");
  mkdirSync(outDir, { recursive: true });

  for (const [name, page] of Object.entries(PAGES)) {
    const weapons = await fetchWeaponJson(page);
    const outPath = join(outDir, `${name}.json`);
    writeFileSync(outPath, JSON.stringify(weapons, null, 2) + "\n");
    console.error(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
