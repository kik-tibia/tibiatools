This is the source code for my Tibia fansite. It contains various tools that were originally spreadsheets, but have been ported to the web.

The site is written in TypeScript, plain CSS, Astro 5, Svelte 5, and tested with Vitest.

## Build instructions

`npm install` and `npm run dev`.

### Checks

These should all pass.

```sh
npx astro check
npx svelte-check
npx vitest run
npx prettier --check src
npm run build
```

## Damage Calculator

A comprehensive tool for calculating damages.

### Updates to game data

For any changes to spells (e.g. base power), just edit `spells.json` directly.
The data for creatures (hp, resistances) and weapons is managed by some scripts. To update those:

#### Weapons

```sh
# Download weapons from TibiaWiki
node scripts/scrape-weapons.js
# Post-process into a proper format
node scripts/post-process-weapons.js
# If it all looks good, copy the json into src
cp scripts/processed/weapons.json src/data/
```

#### Shields and ammo

```sh
# Download shields and ammo from TibiaWiki
node scripts/scrape-ammo.js
node scripts/scrape-shields.js
# If it all looks good, copy the json into src
cp scripts/processed/ammo.json src/data/
cp scripts/processed/shields.json src/data/
```

#### Creatures

```sh
# Download bestiary
curl https://github.com/mathiasbynens/tibia-json/blob/main/data/bestiary.json -o scripts/bestiary.json
# Post-process into a proper format, merging additional creatures not in bestiary (e.g. Bloodjaw)
node scripts/merge-bestiary.sh
# If it all looks good, copy the json into src
cp scripts/processed/creatures.json src/data/
```

### API

This tool comes with a public API if you want to build something on top of the calculator. Docs can be found [here](https://tibiatools.io/api/docs). If you are hitting the public API very frequently, I would be grateful if you forked this repo to run the code or API yourself, so that there is less stress on my VPS.

## Forge Calculator

A basic tool for calculating expected costs for the Exaltation Forge.

## Attribution

Weapon and spell data were compiled with reference to TibiaWiki and verified against in-game values. Bestiary data comes from [tibia-json](https://github.com/mathiasbynens/tibia-json), itself compiled from TibiaWiki.

Tibia and all game content and materials are the property of CipSoft GmbH. This project is unofficial and not affiliated with or endorsed by CipSoft.

## Licence

Copyright (c) 2025-2026 Kikaro

Licensed under the EUPL

The source code in this repository is licensed under the [European Union Public Licence v1.2](LICENCE) (EUPL-1.2) or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence"). You may not use this work except in compliance with the Licence.

The licence covers the source code only. Game data and numerical values are factual information about Tibia and are not covered by this licence.
