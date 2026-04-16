import perksRaw from "@data/perks.json";

export type PerkBonusType =
  | "attack"
  | "axe-fighting"
  | "axe-percent-extra"
  | "base-damage"
  | "club-fighting"
  | "club-percent-extra"
  | "crit-chance"
  | "crit-damage"
  | "distance-fighting"
  | "distance-percent-extra"
  | "fishing-percent-extra"
  | "fist-fighting"
  | "fist-percent-extra"
  | "magic-level"
  | "magic-level"
  | "magic-level-percent-extra"
  | "runic-mastery"
  | "shield-percent-extra"
  | "sword-fighting"
  | "sword-percent-extra"
  | "armor-penetration"
  | "death-pierce"
  | "earth-pierce"
  | "energy-pierce"
  | "fire-pierce"
  | "holy-pierce"
  | "ice-pierce"
  | "physical-pierce";

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
