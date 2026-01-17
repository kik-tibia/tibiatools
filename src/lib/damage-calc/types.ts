import type { PerkDef } from "src/data/perks";

export type ActivePerk = {
  id: string;
  value: number;
};

export type ActivePerkWithDef = ActivePerk & { def: PerkDef };

export type SpellState = {
  basePower: number;
  flat: number;
  magicLevel: number;
  skill: number;
  weaponAttack: number;
  critChance: number;
  critDamage: number;
  fatalChance: number;
  baseMagicLevel: number;
  axe: number;
  club: number;
  sword: number;
  fist: number;
  distance: number;
  shielding: number;
  fishing: number;
};

export type RotationSpell = { id: string; targets: number; ratio: number };

export type WeaponBuild = { id: string; ammo?: string };
