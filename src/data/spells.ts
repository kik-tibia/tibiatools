import spellsRaw from "@data/spells.json";
import spellOrderingRaw from "@data/spell-ordering.json";

export type SpellType = "auto" | "spell" | "healing" | "rune";
export type ScalesWith = "magic" | "melee" | "distance" | "none";
export type Element = "ice" | "fire" | "earth" | "energy" | "physical" | "holy" | "death" | "weapon";
export type Rounding = "floor" | "round" | "ceil";

export type Spell = {
  id: string;
  scope: string;
  name: string;
  spellType: SpellType;
  scalesWith: ScalesWith;
  element: Element;
  power: number;
  skillFactor: number;
  buckets: number;
  additionalDamageMultiplier: number;
  vocations: string[];
  rounding: Rounding;
};

export type SpellOrdering = {
  vocation: string;
  order: string[];
};

export interface SpellDamage extends Spell {
  min: number;
  avg: number;
  max: number;
  effectiveAvg: number;
}

export const spells: Spell[] = (spellsRaw as unknown[] as Spell[]).map((s) => ({
  ...s,
  scope: s.scope ?? s.id,
  additionalDamageMultiplier: s.additionalDamageMultiplier ?? 1,
}));

export const spellOrdering: SpellOrdering[] = spellOrderingRaw as SpellOrdering[];
