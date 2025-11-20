import type { ActivePerk, RotationSpell } from "./damage-calc";

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

export type Build = { stats: BuildStats; perks: ActivePerk[] };

export type CalculatorState = {
  A: Build;
  B: Build;
  showSecondBuild: boolean;
  rotation: RotationSpell[];
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

export const defaultBuild = () => ({
  stats: defaultStats(),
  perks: [],
});

export const defaultState = (): CalculatorState => ({
  A: defaultBuild(),
  B: defaultBuild(),
  showSecondBuild: false,
  rotation: [],
});
