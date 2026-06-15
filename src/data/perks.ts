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
  | "physical-pierce"
  | "damage-amphibic"
  | "damage-aquatic"
  | "damage-bird"
  | "damage-construct"
  | "damage-demon"
  | "damage-dragon"
  | "damage-elemental"
  | "damage-extra-dimensional"
  | "damage-fey"
  | "damage-giant"
  | "damage-human"
  | "damage-humanoid"
  | "damage-inkborn"
  | "damage-lycanthrope"
  | "damage-magical"
  | "damage-mammal"
  | "damage-plant"
  | "damage-reptile"
  | "damage-slime"
  | "damage-undead"
  | "damage-vermin"
  | "base-harmony-bonus"
  | "alpha-strike"
  | "omega-strike"
  | "combat-mastery";

export type Perk = {
  id: number;
  name: string;
  scope: string;
  spell: boolean;
  revelation: boolean;
  bonusType: PerkBonusType;
};

export const allPerks: Perk[] = (perksRaw as unknown[] as Perk[]).map((p) => ({
  ...p,
  spell: p.spell ?? false,
  revelation: p.revelation ?? false,
}));
