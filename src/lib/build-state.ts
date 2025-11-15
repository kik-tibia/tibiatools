import type { ActivePerk, Rotation } from "./damage-calc";

export type BuildStats = {
  level: string | number | null;
  bonus: string | number | null;
  skill: string | number | null;
  magicLevel: string | number | null;
  weapon: string | number | null;
  critChance: string | number | null;
  critDamage: string | number | null;
  shielding: string | number | null;
  fishing: string | number | null;
};

export type Build = { stats: BuildStats; perks: ActivePerk[] };

export type CalculatorState = {
  A: Build;
  B: Build;
  showSecondBuild: boolean;
  rotation: Rotation;
};

export const defaultState = (): CalculatorState => ({
  A: {
    stats: {
      level: "",
      bonus: "",
      skill: "",
      magicLevel: "",
      weapon: "",
      shielding: "",
      fishing: "",
      critChance: "",
      critDamage: "",
    },
    perks: [],
  },
  B: {
    stats: {
      level: "",
      bonus: "",
      skill: "",
      magicLevel: "",
      weapon: "",
      shielding: "",
      fishing: "",
      critChance: "",
      critDamage: "",
    },
    perks: [],
  },
  showSecondBuild: false,
  rotation: [],
});
