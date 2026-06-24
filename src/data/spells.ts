import spellOrderingRaw from "@data/spell-ordering.json";
import spellsRaw from "@data/spells.json";

export type SpellType = "auto" | "spell" | "rune";
export type ScalesWith = "magic" | "melee" | "shielding" | "distance" | "none";
export type Element = "ice" | "fire" | "earth" | "energy" | "physical" | "holy" | "death";
export type SpellElement = Element | "weapon";
export type Rounding = "floor" | "round" | "ceil";

export type Spell = {
  id: number;
  scope: string;
  name: string;
  displayName: string;
  spellType: SpellType;
  scalesWith: ScalesWith;
  element: SpellElement;
  power: number;
  skillFactor: number;
  buckets: number;
  rounding: Rounding;
  additionalDamageMultiplier: number;
  isSpender: boolean;
  vocations: string[];
  runic: string[];
  spells: number[];
  stage?: number;
  isSelectable: boolean;
  isExtra: boolean;
  targetsLabel?: string;
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
  displayName: s.displayName ?? s.name,
  additionalDamageMultiplier: s.additionalDamageMultiplier ?? 1,
  spells: s.spells ?? [s.id],
  isSpender: s.isSpender ?? false,
  isSelectable: s.isSelectable ?? true,
  isExtra: s.isExtra ?? false,
  runic: s.runic ?? [],
}));

export const spellOrdering: SpellOrdering[] = spellOrderingRaw as SpellOrdering[];
