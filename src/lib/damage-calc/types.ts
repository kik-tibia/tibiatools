import type { PerkDef } from "src/data/perks";

export type ActivePerk = {
  id: number;
  value: number;
};

export type ActivePerkWithDef = ActivePerk & { def: PerkDef };

export type CharacterState = {
  flat: number;
  magicLevel: number;
  skill: number;
  weaponAttack: number;
  weaponDamage: number;
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

export type SpellState = CharacterState & { basePower: number };

export type RotationSpell = { id: string; targets: number; ratio: number; extraSpell: boolean };

export type WeaponBuild = { id: number; ammo?: number };
