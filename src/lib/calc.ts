import type { Spell } from "src/data/spells";

export const computeAvg = (spell: Spell, P: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    return spell.scalesWith === "magic"
        ? F + round((P / spell.skillFactor) * ML + P / 4)
        : F + round((P / spell.skillFactor) * S * W + P / 4);
};

export const computeMinMax = (spell: Spell, minMax: number, P: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    const variation = spell.buckets / P / 2;
    return spell.scalesWith === "magic"
        ? F + round((1 + minMax * variation) * ((P / spell.skillFactor) * ML + P / 4))
        : F + round((1 + minMax * variation) * ((P / spell.skillFactor) * S * W + P / 4));
};
