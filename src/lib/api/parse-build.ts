import type {
  Build,
  BuildStats,
  CreatureChoiceRef,
  ImbuementElement,
  PerkChoiceRef,
  SpellChoiceRef,
  WeaponChoiceRef,
} from "@lib/build-state";
import type { ApiIssue } from "./http";
import {
  ammoById,
  charmsById,
  charmTiers,
  creaturesById,
  DEFAULT_WEAPON_ID,
  imbuementElements,
  perksById,
  shieldsById,
  spellsById,
  stancesById,
  vocations,
  weaponsById,
} from "./registry";

/**
 * Turns an untrusted JSON body into a `Build`. The whole request fails on anything that isn't a
 * well-formed build: wrong shapes, wrong types, unknown fields, or ids that don't exist. Whether the
 * build is a sensible one is the caller's business — the calculator will happily price up a knight
 * holding a shield in both hands.
 */

export type ParseResult = { ok: true; build: Build } | { ok: false; issues: ApiIssue[] };

const buildKeys = ["stats", "weapon", "perks", "rotation", "targets"] as const;

const statsKeys = [
  "vocation",
  "stanceIds",
  "level",
  "bonus",
  "skill",
  "magicLevel",
  "critChance",
  "critDamage",
  "fatalChance",
  "transcendenceChance",
  "hitPoints",
  "manaPoints",
  "baseMagicLevel",
  "axe",
  "club",
  "sword",
  "fist",
  "distance",
  "shielding",
  "fishing",
  "imbuementElement",
  "imbuementValue",
] as const;

export const numericStatKeys = [
  "level",
  "bonus",
  "skill",
  "magicLevel",
  "critChance",
  "critDamage",
  "fatalChance",
  "transcendenceChance",
  "hitPoints",
  "manaPoints",
  "baseMagicLevel",
  "axe",
  "club",
  "sword",
  "fist",
  "distance",
  "shielding",
  "fishing",
] as const satisfies readonly (keyof BuildStats)[];

type NumericStatKey = (typeof numericStatKeys)[number];

function parseStats(issues: ApiIssue[], value: unknown): BuildStats | null {
  const obj = objectAt(issues, "stats", value ?? {}, statsKeys);
  if (!obj) return null;

  if (obj.vocation === undefined || obj.vocation === null) {
    issues.push({ field: "stats.vocation", message: `Required. One of: ${vocations.join(", ")}.` });
    return null;
  }
  const vocation = fieldToEnumValue(issues, "stats.vocation", obj.vocation, vocations, "vocation");
  if (!vocation) return null;

  const numbers = {} as Record<NumericStatKey, number | null>;
  for (const key of numericStatKeys) {
    numbers[key] = optionalNumber(issues, `stats.${key}`, obj[key]);
  }

  let imbuementElement: ImbuementElement | null = null;
  if (obj.imbuementElement !== undefined && obj.imbuementElement !== null) {
    imbuementElement = fieldToEnumValue(
      issues,
      "stats.imbuementElement",
      obj.imbuementElement,
      imbuementElements,
      "element",
    );
  }

  return {
    vocation,
    stanceIds: parseStanceIds(issues, obj.stanceIds),
    ...numbers,
    imbuementElement,
    imbuementValue: optionalNumber(issues, "stats.imbuementValue", obj.imbuementValue),
  };
}

function parseStanceIds(issues: ApiIssue[], value: unknown): number[] {
  const arr = arrayAt(issues, "stats.stanceIds", value);
  if (!arr) return [];
  return arr.flatMap((raw, i) => {
    const stance = lookUpItemById(issues, index("stats.stanceIds", i), raw, stancesById, "stance");
    return stance ? [stance.id] : [];
  });
}

function parseWeapon(issues: ApiIssue[], value: unknown): WeaponChoiceRef {
  if (value === undefined || value === null) return { id: DEFAULT_WEAPON_ID };

  const obj = objectAt(issues, "weapon", value, ["id", "ammoId", "shieldId"]);
  if (!obj) return { id: DEFAULT_WEAPON_ID };

  const weapon = lookUpItemById(issues, "weapon.id", obj.id, weaponsById, "weapon");
  const ammo =
    obj.ammoId === undefined || obj.ammoId === null
      ? null
      : lookUpItemById(issues, "weapon.ammoId", obj.ammoId, ammoById, "ammo", "ammo");
  const shield =
    obj.shieldId === undefined || obj.shieldId === null
      ? null
      : lookUpItemById(issues, "weapon.shieldId", obj.shieldId, shieldsById, "shield");

  return {
    id: weapon?.id ?? DEFAULT_WEAPON_ID,
    ...(ammo && { ammoId: ammo.id }),
    ...(shield && { shieldId: shield.id }),
  };
}

function parseRotation(issues: ApiIssue[], value: unknown): SpellChoiceRef[] {
  const arr = arrayAt(issues, "rotation", value);
  if (!arr) return [];

  return arr.flatMap((raw, i) => {
    const base = index("rotation", i);
    const obj = objectAt(issues, base, raw, ["id", "targets", "ratio", "extraSpell"]);
    if (!obj) return [];

    const spell = lookUpItemById(issues, child(base, "id"), obj.id, spellsById, "spell");
    if (!spell) return [];

    return [
      {
        id: spell.id,
        targets: optionalNumber(issues, child(base, "targets"), obj.targets) ?? 1,
        ratio: optionalNumber(issues, child(base, "ratio"), obj.ratio) ?? 1,
        extraSpell: spell.isExtra,
      },
    ];
  });
}

function parseTargets(issues: ApiIssue[], value: unknown): CreatureChoiceRef[] {
  const arr = arrayAt(issues, "targets", value);
  if (!arr) return [];

  return arr.flatMap((raw, i) => {
    const base = index("targets", i);
    const obj = objectAt(issues, base, raw, ["id", "ratio", "charmId", "charmTier"]);
    if (!obj) return [];

    const creature = lookUpItemById(issues, child(base, "id"), obj.id, creaturesById, "creature");
    if (!creature) return [];

    const ratio = optionalNumber(issues, child(base, "ratio"), obj.ratio) ?? 1;
    const hasCharmId = obj.charmId !== undefined && obj.charmId !== null;
    const hasCharmTier = obj.charmTier !== undefined && obj.charmTier !== null;
    if (hasCharmId !== hasCharmTier) {
      issues.push({
        field: child(base, hasCharmId ? "charmTier" : "charmId"),
        message: "charmId and charmTier must be set together, or both left out.",
      });
      return [{ id: creature.id, ratio }];
    }
    if (!hasCharmId) return [{ id: creature.id, ratio }];

    const charm = lookUpItemById(issues, child(base, "charmId"), obj.charmId, charmsById, "charm");
    const charmTier = obj.charmTier;
    if (typeof charmTier !== "number" || !charmTiers.includes(charmTier)) {
      issues.push({
        field: child(base, "charmTier"),
        message: `Unknown charm tier. One of: ${charmTiers.join(", ")}.`,
      });
      return [{ id: creature.id, ratio }];
    }
    if (!charm) return [{ id: creature.id, ratio }];

    return [{ id: creature.id, ratio, charmId: charm.id, charmTier }];
  });
}

function parsePerks(issues: ApiIssue[], value: unknown): PerkChoiceRef[] {
  const arr = arrayAt(issues, "perks", value);
  if (!arr) return [];

  return arr.flatMap((raw, i) => {
    const base = index("perks", i);
    const obj = objectAt(issues, base, raw, ["id", "value"]);
    if (!obj) return [];

    const perk = lookUpItemById(issues, child(base, "id"), obj.id, perksById, "perk");
    if (!perk) return [];

    if (obj.value === undefined || obj.value === null) {
      issues.push({
        field: child(base, "value"),
        message: "Required. See valueType and valueDescription in /api/v1/meta/perks.",
      });
      return [];
    }
    const perkValue = optionalNumber(issues, child(base, "value"), obj.value);
    return perkValue === null ? [] : [{ id: perk.id, value: perkValue }];
  });
}

export function parseBuildRequest(body: unknown): ParseResult {
  const issues: ApiIssue[] = [];

  const root = objectAt(issues, "", body, buildKeys);
  if (!root) return { ok: false, issues };

  const stats = parseStats(issues, root.stats);
  if (!stats) return { ok: false, issues };

  const build: Build = {
    stats,
    weapon: parseWeapon(issues, root.weapon),
    perks: parsePerks(issues, root.perks),
    rotation: parseRotation(issues, root.rotation),
    targets: parseTargets(issues, root.targets),
  };

  return issues.length > 0 ? { ok: false, issues } : { ok: true, build };
}

const child = (base: string, key: string): string => (base ? `${base}.${key}` : key);
const index = (base: string, i: number): string => `${base}[${i}]`;

function objectAt(
  issues: ApiIssue[],
  field: string,
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    issues.push({ field: field || "(root)", message: "Expected an object." });
    return null;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.includes(key)) {
      issues.push({ field: child(field, key), message: `Unknown field. Allowed fields: ${allowedKeys.join(", ")}.` });
    }
  }
  return obj;
}

function arrayAt(issues: ApiIssue[], field: string, value: unknown): unknown[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push({ field, message: "Expected an array." });
    return null;
  }
  return value;
}

function optionalNumber(issues: ApiIssue[], field: string, value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ field, message: "Expected a number." });
    return null;
  }
  return value;
}

function fieldToEnumValue<T extends string>(
  issues: ApiIssue[],
  field: string,
  value: unknown,
  allowed: readonly T[],
  label: string,
): T | null {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    issues.push({ field, message: `Unknown ${label}. Required one of: ${allowed.join(", ")}.` });
    return null;
  }
  return value as T;
}

function lookUpItemById<T>(
  issues: ApiIssue[],
  field: string,
  value: unknown,
  map: Map<number, T>,
  label: string,
  resource = `${label}s`,
): T | null {
  if (value === undefined || value === null) {
    issues.push({ field, message: `Required: the id of a ${label} (see /api/v1/meta/${resource}).` });
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.push({ field, message: `Expected a whole number: the id of a ${label}.` });
    return null;
  }
  const item = map.get(value);
  if (!item) {
    issues.push({ field, message: `Unknown ${label} id ${value}. See /api/v1/meta/${resource} for valid ids.` });
    return null;
  }
  return item;
}
