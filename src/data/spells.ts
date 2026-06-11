import spellOrderingRaw from "@data/spell-ordering.json";
import spellsRaw from "@data/spells.json";

export type SpellType = "auto" | "spell" | "rune";
export type ScalesWith = "magic" | "melee" | "fist" | "distance" | "none";
export type Element = "ice" | "fire" | "earth" | "energy" | "physical" | "holy" | "death";
export type SpellElement = Element | "weapon";
export type Rounding = "floor" | "round" | "ceil";

export type Spell = {
  id: number;
  scope: string;
  name: string;
  spellType: SpellType;
  scalesWith: ScalesWith;
  element: SpellElement;
  power: number;
  skillFactor: number;
  buckets: number;
  additionalDamageMultiplier: number;
  spells: number[];
  isSpender: boolean;
  isSelectable: boolean;
  isExtra: boolean;
  vocations: string[];
  runic: string[];
  rounding: Rounding;
};

export type SpellOrdering = {
  vocation: string;
  order: string[];
};

export type DamageRange = {
  min?: number;
  avg: number;
  max?: number;
};

export type BreakdownDamageRange = {
  min: number;
  avg: number;
  max: number;
  probability: number;
};

export type DamageEffective = {
  avg: number;
  elementalCharmDmg: number; // not included in effectiveAvg
  critCharmDmg: number; // is included in effectiveAvg
};

export type DamageBreakdown = {
  noBonus: BreakdownDamageRange;
  crit: BreakdownDamageRange;
  fatal: BreakdownDamageRange;
  critFatal: BreakdownDamageRange;
  effective: DamageEffective;
};

export type RawBreakdown = {
  raw: DamageRange;
  breakdown: DamageBreakdown;
};

export type RawEffective = {
  raw: DamageRange;
  effective: DamageEffective;
};

export type SpellRawBreakdown = Spell & RawBreakdown;

export type SpellRawEffective = Spell & RawEffective;

export const allSpells: Spell[] = (spellsRaw as unknown[] as Spell[]).map((s) => ({
  ...s,
  scope: s.scope,
  additionalDamageMultiplier: s.additionalDamageMultiplier ?? 1,
  spells: s.spells ?? [s.id],
  isSpender: s.isSpender ?? false,
  isSelectable: s.isSelectable ?? true,
  isExtra: s.isExtra ?? false,
  runic: s.runic ?? [],
}));

export const spellOrdering: SpellOrdering[] = spellOrderingRaw as SpellOrdering[];
