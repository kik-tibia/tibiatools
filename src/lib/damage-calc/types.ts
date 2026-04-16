import type { Creature } from "@data/creatures";
import type { PerkDef } from "@data/perks";

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
  transcendenceChance: number;
  baseMagicLevel: number;
  axe: number;
  club: number;
  sword: number;
  fist: number;
  distance: number;
  shielding: number;
  fishing: number;
};

export type SpellState = CharacterState & {
  basePower: number;
  runicIncrease: number;
  armorPenetration: number;
  deathPierce: number;
  earthPierce: number;
  energyPierce: number;
  firePierce: number;
  holyPierce: number;
  icePierce: number;
  physicalPierce: number;
};

export type RotationSpell = { id: number; targets: number; ratio: number; extraSpell: boolean };

export type WeaponBuild = { id: number; ammo?: number };

export type Target = { id: number; ratio: number };

export type TargetWithCreature = Target & { creature: Creature };
