import type { PerkDef } from "src/data/perks";

export type ActivePerk = {
  id: string;
  value: number;
};

export type ActivePerkWithDef = ActivePerk & { def: PerkDef };

export type SpellState = {
  P: number;
  F: number;
  ML: number;
  S: number;
  W: number;
  shielding: number;
  fishing: number;
  critChance: number;
  critDamage: number;
};

// TODO add avg targets
export type RotationSpell = { id: string; ratio: number };
