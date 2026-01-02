import type { ActivePerk, RotationSpell, WeaponBuild } from "./damage-calc";

export type Vocation = "knight" | "paladin" | "sorcerer" | "druid" | "monk";

export type BuildStats = {
  vocation: Vocation;
  level: number | null;
  bonus: number | null;
  skill: number | null;
  magicLevel: number | null;
  critChance: number | null;
  critDamage: number | null;
  fatalChance: number | null;
  baseMagicLevel: number | null;
  axe: number | null;
  club: number | null;
  sword: number | null;
  fist: number | null;
  distance: number | null;
  shielding: number | null;
  fishing: number | null;
};

export type Build = { stats: BuildStats; weapon: WeaponBuild; perks: ActivePerk[]; rotation: RotationSpell[] };

export type CalculatorState = {
  A: Build;
  B: Build;
  showSecondBuild: boolean;
};

const defaultStats = (): BuildStats => ({
  vocation: "knight",
  level: 8,
  bonus: 0,
  skill: 10,
  magicLevel: 0,
  critChance: 10,
  critDamage: 50,
  fatalChance: 0,
  baseMagicLevel: 0,
  axe: 0,
  club: 0,
  sword: 0,
  fist: 0,
  distance: 0,
  shielding: 0,
  fishing: 0,
});

const defaultWeapon = (): WeaponBuild => ({
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
