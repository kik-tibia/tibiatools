export type ParamType = "percent" | "number" | "int" | "enum";

export type PerkParam = {
    key: string;                    // id for this parameter (e.g. "mult", "amount", "stat")
    label: string;                  // UI label
    type: ParamType;
    min?: number; max?: number; step?: number;
    options?: { value: string; label: string }[];  // for enum
    default: number | string;
};

export type PerkScope =
    | "auto-attack"
    | "spell"
    | "rune"
    | "ice"
    | "fierce-berserk"
    | "all";

export type PerkBonusType =
    | "base-damage"
    | "crit-chance"
    | "magic-level"
    | "axe-percent-extra"
    | "fishing-percent-extra"
    | "all";

export type PerkDef = {
    id: string;
    name: string;
    scope: PerkScope;
    bonusType: PerkBonusType;
};

export const perks: PerkDef[] = [
    {
        id: "fierce-berserk-base",
        name: "Fierce Berserk (exori gran) base damage",
        scope: "fierce-berserk",
        bonusType: "base-damage"
    },
    {
        id: "crit-chance",
        name: "Critical hit chance",
        scope: "all",
        bonusType: "crit-chance"
    },
    {
        id: "runes-crit-chance",
        name: "Runes critical hit chance",
        scope: "rune",
        bonusType: "crit-chance"
    },
    {
        id: "ice-magic-level",
        name: "Ice magic level",
        scope: "ice",
        bonusType: "magic-level"
    },
    {
        id: "axe-percent-spell-damage",
        name: "% axe fighting as extra damage for spells",
        scope: "spell",
        bonusType: "axe-percent-extra"
    },
    {
        id: "fishing-percent-aa-damage",
        name: "% fishing as extra damage for auto-attacks",
        scope: "auto-attack",
        bonusType: "fishing-percent-extra"
    },
]

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
