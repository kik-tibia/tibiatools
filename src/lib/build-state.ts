import type { ActivePerk } from "./damage-calc";

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
  showSecondBuild: boolean;
  A: Build;
  B: Build;
};

export const defaultState = (): CalculatorState => ({
  showSecondBuild: false,
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
});
