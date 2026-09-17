import { allCharms, type Charm } from "@data/charms";
import { allCreatures, type Creature } from "@data/creatures";
import { allPerks, type Perk, type PerkBonusType } from "@data/perks";
import { allShields, type Shield } from "@data/shields";
import { allSpells, type Spell } from "@data/spells";
import { allStances, type Stance } from "@data/stances";
import { allAmmo, allWeapons, type Ammo, type Weapon } from "@data/weapons";
import type { ImbuementElement, Vocation } from "@lib/damage-calc/build-state";
import { perkAppliesToSpell } from "@lib/damage-calc/spell-perks";

export const weaponsById: Map<number, Weapon> = new Map(allWeapons.map((w) => [w.id, w]));
export const ammoById: Map<number, Ammo> = new Map(allAmmo.map((a) => [a.id, a]));
export const shieldsById: Map<number, Shield> = new Map(allShields.map((s) => [s.id, s]));
export const perksById: Map<number, Perk> = new Map(allPerks.map((p) => [p.id, p]));
export const spellsById: Map<number, Spell> = new Map(allSpells.map((s) => [s.id, s]));
export const creaturesById: Map<number, Creature> = new Map(allCreatures.map((c) => [c.id, c]));
export const charmsById: Map<number, Charm> = new Map(allCharms.map((c) => [c.id, c]));
export const stancesById: Map<number, Stance> = new Map(allStances.map((s) => [s.id, s]));

export const vocations: Vocation[] = ["knight", "paladin", "sorcerer", "druid", "monk"];
export const imbuementElements: ImbuementElement[] = ["death", "earth", "energy", "fire", "ice"];

export const imbuementTierValues: number[] = [0.1, 0.25, 0.5];
export const charmTiers: number[] = [1, 2, 3];

export const DEFAULT_WEAPON_ID = 1;

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const vocationCanUsePerk = (perk: Perk, vocation: Vocation): boolean =>
  allSpells.some((s) => s.vocations.includes(vocation) && perkAppliesToSpell(perk, s));

export const bundledSpellIds = (spell: Spell): number[] => (spell.spells.length > 0 ? spell.spells : [spell.id]);

export type PerkValueType = "percent" | "flat" | "stage" | "spellId" | "ignored";

const flatBonusTypes = new Set<PerkBonusType>([
  "attack",
  "axe-fighting",
  "club-fighting",
  "sword-fighting",
  "fist-fighting",
  "distance-fighting",
  "magic-level",
]);

export function perkValueType(perk: Perk): PerkValueType {
  if (perk.bonusType === "focus-mastery") return "spellId";
  if (perk.bonusType === "runic-mastery") return "ignored";
  if (perk.revelation) return "stage";
  if (flatBonusTypes.has(perk.bonusType)) return "flat";
  return "percent";
}

export function perkValueDescription(perk: Perk): string {
  switch (perkValueType(perk)) {
    case "spellId":
      return "Id of the rotation spell that receives the bonus.";
    case "ignored":
      return "Ignored: just include the perk to enable it.";
    case "stage":
      return "Staged perk. From 0 (inactive) to 3.";
    case "flat":
      return "Flat amount added to the stat, e.g. 5 for +5.";
    case "percent":
      if (perk.bonusType.startsWith("homing-missile"))
        return "Level percentage the missile deals, e.g. 200 or 300 for 200%/300% of your level.";
      if (perk.bonusType.endsWith("-percent-extra"))
        return "Percentage of the named skill added as flat damage, e.g. 5 for 5%.";
      return "Percentage as shown in game, e.g. 5 for +5%.";
  }
}
