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
  transcendenceChance: number | null;
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

export type CollapsedSections = {
  basicStats: boolean;
  advancedStats: boolean;
  weapon: boolean;
  perks: boolean;
  rotation: boolean;
};

export type CalculatorState = {
  version: number;
  A: Build;
  B: Build;
  perkOrder: number[];
  rotationOrder: number[];
  showSecondBuild: boolean;
  collapsed: CollapsedSections;
};

const defaultStats = (): BuildStats => ({
  vocation: "knight",
  level: 8,
  bonus: 0,
  skill: 10,
  magicLevel: 0,
  critChance: 10,
  critDamage: 50,
  fatalChance: null,
  transcendenceChance: null,
  baseMagicLevel: null,
  axe: null,
  club: null,
  sword: null,
  fist: null,
  distance: null,
  shielding: null,
  fishing: null,
});

const defaultWeapon = (): WeaponBuild => ({
  id: 1,
});

export const defaultBuild = () => ({
  stats: defaultStats(),
  weapon: defaultWeapon(),
  perks: [],
  rotation: [],
});

export const defaultCollapsed = (): CollapsedSections => ({
  basicStats: false,
  advancedStats: true,
  weapon: false,
  perks: false,
  rotation: false,
});

export const defaultState = (): CalculatorState => ({
  version: 1,
  A: defaultBuild(),
  B: defaultBuild(),
  perkOrder: [],
  rotationOrder: [],
  showSecondBuild: false,
  collapsed: defaultCollapsed(),
});
