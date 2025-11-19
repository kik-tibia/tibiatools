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
  critChance: number;
  critDamage: number;
  fatalChance: number;
  shielding: number;
  fishing: number;
};

export type RotationSpell = { id: string; targets: number; ratio: number };
