import type { ActivePerk, RotationSpell, WeaponBuild } from "./damage-calc";

export type BuildStats = {
  level: number | null;
  bonus: number | null;
  skill: number | null;
  magicLevel: number | null;
  weapon: number | null;
  critChance: number | null;
  critDamage: number | null;
  fatalChance: number | null;
  shielding: number | null;
  fishing: number | null;
};

export type Build = { stats: BuildStats; weapon: WeaponBuild; perks: ActivePerk[]; rotation: RotationSpell[] };

export type CalculatorState = {
  A: Build;
  B: Build;
  showSecondBuild: boolean;
};

const defaultStats = () => ({
  level: 8,
  bonus: 0,
  skill: 10,
  magicLevel: 0,
  weapon: 0,
  critChance: 10,
  critDamage: 50,
  fatalChance: 0,
  shielding: 10,
  fishing: 10,
});

const defaultWeapon = () => ({
  id: "fists",
});

export const defaultBuild = () => ({
  stats: defaultStats(),
  weapon: defaultWeapon(),
  perks: [],
  rotation: [],
});

export const defaultState = (): CalculatorState => ({
  A: defaultBuild(),
  B: defaultBuild(),
  showSecondBuild: false,
});
