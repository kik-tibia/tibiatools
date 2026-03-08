import perksRaw from "@data/perks.json";

export type PerkScope = "auto-attack" | "melee" | "spell" | "rune" | "ice" | "fierce-berserk" | "all";

export type PerkBonusType =
  | "base-damage"
  | "crit-damage"
  | "crit-chance"
  | "attack"
  | "magic-level"
  | "axe-percent-extra"
  | "club-percent-extra"
  | "sword-percent-extra"
  | "distance-percent-extra"
  | "fist-percent-extra"
  | "shield-percent-extra"
  | "fishing-percent-extra"
  | "magic-level-percent-extra"
  | "all";

export type PerkDef = {
  id: string;
  name: string;
  scope: PerkScope;
  spell: boolean;
  bonusType: PerkBonusType;
};

export const perks: PerkDef[] = (perksRaw as unknown[] as PerkDef[]).map((p) => ({
  ...p,
  spell: p.spell ?? false,
}));

/*
 * PERK TYPES (with examples):
 * + attack (could be specified via the normal attack input but no harm adding it here)
 *      1
 * + skill (could be specified via the normal skill input but no harm adding it here)
 *      2
 *
 * auto attack crit chance %
 *      3
 * auto attack crit extra damage %
 *      10
 *
 * % skill as extra damage to auto attack (can take melee, distance, ml, fishing, shielding)
 *      10, fishing - scope:aa, type:extrafishing, value:10
 * % skill as extra damage to spells (can take melee, distance, ml, fishing, shielding)
 *      5, ml - scope:spells, type:extraml, value:5
 *
 * spell base damage
 *      4, exori gran
 * spell crit chance
 *      10, exori gran
 * spell crit damage
 *      20, exori gran
 *
 * damage type + magic level
 *      2, death - scope:death, type:+skill, value:2
 * damage type crit chance %
 *      1, ice
 * damage type crit damage %
 *      5, ice
 *
 * offensive runes crit chance %
 *      1
 * offensive runes crit damage %
 *      5
 *
 * % skill as extra healing
 *      5, shielding
 * % base healing to a spell
 *      10, wound cleansing
 *
 * % damage to bestiary type
 *      5
 * % damage to sinister/bosses
 *      3
 *
 * perfect shot damage
 *      25, 5
 */
