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
    params: PerkParam[];          // what the user can set
    appliesTo?: AppliesTo;        // optional targeting
    // interpret params:
    mode: "add" | "mul";          // how to apply numeric param to target
    valueParam?: string;          // which param key is the numeric amount (e.g. "mult", "amount")
    statKeyParam?: string;        // for build:stats (e.g. "stat")
};

// EXAMPLES
export const perks: PerkDef[] = [
    {
        id: "fierce-berserk-base",
        name: "Fierce Berserk – Base Damage %",
        scope: "spell:base",
        appliesTo: { spells: ["fierce-berserk"] },
        mode: "mul",
        valueParam: "mult",
        params: [
            { key: "mult", label: "Base bonus (%)", type: "percent", min: 0, max: 100, step: 0.5, default: 5 },
        ],
    },
    {
        id: "crit-chance",
        name: "Critical Hit Chance",
        scope: "spell:critChance",
        mode: "add",
        valueParam: "chance",
        params: [
            { key: "chance", label: "Crit chance (%)", type: "percent", min: 0, max: 100, step: 0.1, default: 3 },
        ],
    },
    {
        id: "ml-ice",
        name: "Ice Magic Level",
        scope: "build:stats",
        appliesTo: { tags: ["ice"] }, // only affects spells you tag as "ice" later
        mode: "add",
        valueParam: "amount",
        statKeyParam: "stat",
        params: [
            { key: "stat", label: "Stat", type: "enum", options: [{ value: "ML", label: "Magic Level" }], default: "ML" },
            { key: "amount", label: "Amount (+)", type: "int", min: 0, max: 50, step: 1, default: 1 },
        ],
    },
];
