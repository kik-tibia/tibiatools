#!/usr/bin/env node

/**
 * Tibia Wiki Shield Scraper
 *
 * Fetches shield data from a custom wiki page that outputs JSON via DPL,
 * using the MediaWiki API, then saves the result.
 *
 * Stable integer ids are assigned by name from scripts/shields-ids.json.
 * New shields must be added there (otherwise their id is left undefined).
 *
 * Usage:
 *   node scrape-shields.js
 */

import { JSDOM } from "jsdom";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE = "User:Kikaro/json/shields";

const idsPath = join(__dirname, "shields-ids.json");

const API_BASE =
  "https://tibia.fandom.com/api.php?action=parse&prop=text&format=json&page=";

async function fetchShieldJson() {
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
  const shields = JSON.parse(text).filter((s) => s.name);

  console.error(`Parsed ${shields.length} shields`);
  return shields;
}

async function main() {
  const shields = await fetchShieldJson();

  const idEntries = JSON.parse(readFileSync(idsPath, "utf-8"));
  const idsByName = new Map(idEntries.map((e) => [e.name, e.id]));

  const withIds = shields.map((shield) => {
    const id = idsByName.get(shield.name);
    if (id == null) {
      console.error(`Warning: no id found for "${shield.name}" (add it to shields-ids.json)`);
    }
    return { id, ...shield, defense: Number(shield.defense) };
  });

  const outDir = join(__dirname, "scraped");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "shields.json");
  writeFileSync(outPath, JSON.stringify(withIds, null, 2) + "\n");
  console.error(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
