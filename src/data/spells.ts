export type SpellType = "spell" | "healing" | "rune";
export type ScalesWith = "magic" | "melee" | "distance" | "none";
export type Element = "ice" | "weapon";
export type Rounding = "floor" | "round" | "ceil";

export type Spell = {
    id: string;
    name: string;
    spellType: SpellType;
    scalesWith: ScalesWith;
    element: Element;
    power: number;
    skillFactor: number;
    buckets: number;
    vocations: string[];
    rounding: Rounding;
};
