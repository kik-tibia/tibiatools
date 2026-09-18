import { allCharms } from "@data/charms";
import { allCreatures } from "@data/creatures";
import { allPerks } from "@data/perks";
import { allShields } from "@data/shields";
import { allSpells } from "@data/spells";
import { allStances } from "@data/stances";
import { allAmmo, allWeapons } from "@data/weapons";
import {
  bundledSpellIds,
  capitalize,
  perkValueDescription,
  perkValueType,
  vocationCanUsePerk,
  vocations,
} from "./registry";

export const metaResourceNames = [
  "vocations",
  "stances",
  "weapons",
  "ammo",
  "shields",
  "perks",
  "spells",
  "creatures",
  "charms",
] as const;

export type MetaResourceName = (typeof metaResourceNames)[number];

export type MetaItem = Record<string, unknown> & { id: number | string; name: string };

type ResourceDefinition = {
  description: string;
  build: () => MetaItem[];
};

function compact(item: Record<string, unknown>): MetaItem {
  return Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined)) as MetaItem;
}

const definitions: Record<MetaResourceName, ResourceDefinition> = {
  vocations: {
    description: "Character vocation.",
    build: () => vocations.map((v) => ({ id: v, name: capitalize(v) })),
  },
  stances: {
    description: "Only selectable stances affect damage.",
    build: () =>
      allStances.map((s) =>
        compact({
          id: s.id,
          name: s.name,
          effect: s.effect,
          vocation: s.vocation,
          group: s.group,
          selectable: s.visible,
        }),
      ),
  },
  weapons: {
    description: "Weapon id 1 (fists) is the default when no weapon is sent.",
    build: () =>
      allWeapons.map((w) =>
        compact({
          id: w.id,
          name: w.name,
          skill: w.skill,
          hands: w.hands,
          attack: w.attack,
          damage: w.damage,
          damageType: w.damageType,
          bond: w.bond,
          ammoType: w.ammo,
          vocations: w.vocations,
        }),
      ),
  },
  ammo: {
    description: "Its type must match the weapon's ammoType.",
    build: () =>
      allAmmo.map((a) =>
        compact({ id: a.id, name: a.name, type: a.type, attack: a.attack, hitChance: a.hitChance, aoe: a.aoe }),
      ),
  },
  shields: {
    description: "Only use with one-handed weapons.",
    build: () => allShields.map((s) => compact({ id: s.id, name: s.name, defense: s.defense })),
  },
  perks: {
    description:
      "The valueType says what type to send. A perk only applies to a spell matching every one of its scopes.",
    build: () =>
      allPerks
        .filter((p) => p.visible)
        .map((p) =>
          compact({
            id: p.id,
            name: p.name,
            scopes: p.scopes,
            bonusType: p.bonusType,
            valueType: perkValueType(p),
            valueDescription: perkValueDescription(p),
            appliesToSpell: p.spell,
            revelation: p.revelation,
            selectable: p.visible,
            vocations: p.spell ? vocations.filter((v) => vocationCanUsePerk(p, v)) : [...vocations],
          }),
        ),
  },
  spells: {
    description: "If bundledSpellIds lists multiple spells, you need to send them all, sharing one ratio.",
    build: () =>
      allSpells.map((s) =>
        compact({
          id: s.id,
          name: s.name,
          scope: s.scope,
          spellType: s.spellType,
          element: s.element,
          scalesWith: s.scalesWith,
          stage: s.stage,
          turnCooldown: s.turnCooldown,
          targetsLabel: s.targetsLabel,
          bundledSpellIds: bundledSpellIds(s),
          isExtra: s.isExtra,
          selectable: s.isSelectable,
          vocations: s.vocations,
        }),
      ),
  },
  creatures: {
    description: "Creatures.",
    build: () =>
      allCreatures.map((c) =>
        compact({
          id: c.id,
          name: c.name,
          bestiaryClass: c.bestiaryClass,
          bestiaryLevel: c.bestiaryLevel,
          hitpoints: c.hitpoints,
          armor: c.armor,
          mitigation: c.mitigation,
          damageMods: {
            physical: c.physicalDmgMod,
            death: c.deathDmgMod,
            earth: c.earthDmgMod,
            energy: c.energyDmgMod,
            fire: c.fireDmgMod,
            holy: c.holyDmgMod,
            ice: c.iceDmgMod,
          },
        }),
      ),
  },
  charms: {
    description: "Charms. The charmTier is a range of 1-3.",
    build: () =>
      allCharms.map((c) =>
        compact({
          id: c.id,
          name: c.displayName,
          effect: c.effect,
          element: c.element,
          requiresStat: c.effect === "overpower" ? "hitPoints" : c.effect === "overflux" ? "manaPoints" : undefined,
        }),
      ),
  },
};

const cache = new Map<MetaResourceName, MetaItem[]>();

function itemsFor(name: MetaResourceName): MetaItem[] {
  const cached = cache.get(name);
  if (cached) return cached;
  const items = definitions[name].build();
  cache.set(name, items);
  return items;
}

export const isMetaResourceName = (value: string): value is MetaResourceName =>
  (metaResourceNames as readonly string[]).includes(value);

export type MetaListResult = {
  resource: MetaResourceName;
  description: string;
  count: number;
  items: MetaItem[];
};

export function listMetaResource(name: MetaResourceName): MetaListResult {
  const items = itemsFor(name);
  return {
    resource: name,
    description: definitions[name].description,
    count: items.length,
    items,
  };
}

export function metaIndex(basePath: string): {
  resources: { name: MetaResourceName; description: string; count: number; url: string }[];
} {
  return {
    resources: metaResourceNames.map((name) => ({
      name,
      description: definitions[name].description,
      count: itemsFor(name).length,
      url: `${basePath}/${name}`,
    })),
  };
}
