import perksRaw from "@data/perks.json";

export type PerkBonusType =
  | "attack"
  | "axe-percent-extra"
  | "base-damage"
  | "club-percent-extra"
  | "crit-chance"
  | "crit-damage"
  | "distance-percent-extra"
  | "fishing-percent-extra"
  | "fist-percent-extra"
  | "magic-level"
  | "magic-level-percent-extra"
  | "runic-mastery"
  | "shield-percent-extra"
  | "sword-percent-extra";

export type PerkDef = {
  id: number;
  name: string;
  scope: string;
  spell: boolean;
  bonusType: PerkBonusType;
};

export const perks: PerkDef[] = (perksRaw as unknown[] as PerkDef[]).map((p) => ({
  ...p,
  spell: p.spell ?? false,
}));
