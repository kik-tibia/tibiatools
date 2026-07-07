import perksRaw from "@data/perks.json";
import type { BestiaryClass } from "@data/creatures";
import type { Element } from "@data/spells";

export type PierceKind = "pierceRegular" | "pierceWeapon";

type SpaceToDash<S extends string> = S extends `${infer Head} ${infer Tail}` ? `${Head}-${SpaceToDash<Tail>}` : S;
export type BestiaryDamageBonusType = `damage-${Lowercase<SpaceToDash<BestiaryClass>>}`;

// Runtime mirror of BestiaryDamageBonusType, e.g. "Extra Dimensional" -> "damage-extra-dimensional"
export function bestiaryDamageBonusType(bestiaryClass: BestiaryClass): BestiaryDamageBonusType {
  return `damage-${bestiaryClass.toLowerCase().split(" ").join("-")}` as BestiaryDamageBonusType;
}

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
  | `${Element}-pierce-regular`
  | `${Element}-pierce-weapon`
  | BestiaryDamageBonusType
  | "base-harmony-bonus"
  | "alpha-strike"
  | "omega-strike"
  | "combat-mastery"
  | "master-of-flames"
  | "master-of-thunder"
  | "master-of-decay"
  | "lord-of-destruction"
  | "charm-upgrade"
  | "focus-mastery";

export type Perk = {
  id: number;
  name: string;
  scope: string;
  spell: boolean;
  revelation: boolean;
  bonusType: PerkBonusType;
  visible: boolean;
};

export const allPerks: Perk[] = (perksRaw as unknown[] as Perk[]).map((p) => ({
  ...p,
  spell: p.spell ?? false,
  revelation: p.revelation ?? false,
  visible: p.visible ?? true,
}));
