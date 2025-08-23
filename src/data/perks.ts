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
    | "spell:base"        // modify base term before rounding (your inner term)
    | "spell:critChance"  // modify crit chance for this spell
    | "build:stats";      // modify ML/S/W/F before base term is computed

export type AppliesTo = {
    spells?: string[];    // e.g. ["fierce-berserk"]
    tags?: string[];      // e.g. ["ice"] (use spell tags if you add them later)
};

export type PerkDef = {
    id: string;
    name: string;
    scope: PerkScope;
    appliesTo?: AppliesTo;
};

export const perks: PerkDef[] = [
    {
        id: "fierce-berserk-base",
        name: "Fierce Berserk – Base Damage %",
        scope: "spell:base",
        appliesTo: { spells: ["fierce-berserk"] },
    },
    {
        id: "crit-chance",
        name: "Critical Hit Chance",
        scope: "spell:critChance",
    },
    {
        id: "ml-ice",
        name: "Ice Magic Level",
        scope: "build:stats",
        appliesTo: { tags: ["ice"] },
    },
];
