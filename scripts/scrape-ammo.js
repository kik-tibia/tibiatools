#!/usr/bin/env node

/**
 * Tibia Wiki Ammo Scraper
 *
 * Fetches ammo data from a custom wiki page that outputs JSON via DPL,
 * using the MediaWiki API, then saves the result split into arrows and bolts.
 *
 * Usage:
 *   node scrape-ammo.js
 */

import { JSDOM } from "jsdom";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE = "User:Kikaro/json/ammo";

const API_BASE =
  "https://tibia.fandom.com/api.php?action=parse&prop=text&format=json&page=";

function toId(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

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

async function main() {
  const items = await fetchAmmoJson();

  const arrows = [];
  const bolts = [];

  for (const item of items.filter((i) => i.name)) {
    const entry = {
      id: toId(item.name),
      name: item.name,
      attack: Number(item.attack),
      aoe: false,
    };

    const nameLower = item.name.toLowerCase();
    if (nameLower.includes("arrow")) {
      arrows.push(entry);
    } else if (nameLower.includes("bolt")) {
      bolts.push(entry);
    } else {
      console.error(`Warning: "${item.name}" is neither arrow nor bolt, skipping`);
    }
  }

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
