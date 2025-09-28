import { perks } from "@data/perks";
import spellsRaw from "@data/spells.json";

import type { BuildStats } from "@lib/build-state";
import type { PerkDef } from "@data/perks";
import type { Spell } from "src/data/spells";
import type { ActivePerk, ActivePerkWithDef, SpellState } from "@lib/damage-calc";

const spells = spellsRaw as unknown as Spell[];

const computeAvg = (spell: Spell, P: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    return spell.scalesWith === "magic"
        ? F + round((P / spell.skillFactor) * ML + P / 4)
        : F + round((P / spell.skillFactor) * S * W + P / 4);
};

const computeMinMax = (spell: Spell, minMax: number, P: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    const variation = spell.buckets / P / 2;
    return spell.scalesWith === "magic"
        ? F + round((1 + minMax * variation) * ((P / spell.skillFactor) * ML + P / 4))
        : F + round((1 + minMax * variation) * ((P / spell.skillFactor) * S * W + P / 4));
};


const perkDefsById: Record<string, PerkDef> = Object.fromEntries(perks.map((p) => [p.id, p]));

const applyPerkToSpell = (spell: Spell, perk: ActivePerkWithDef, state: SpellState): SpellState => {
    const { P, F, ML, S, W } = state;

    if (
        perk.def.scope === "all" ||
        perk.def.scope === spell.id ||
        perk.def.scope === spell.spellType ||
        perk.def.scope === spell.element
    ) {
        switch (perk.def.bonusType) {
            case "base-damage":
                return { ...state, P: P * (1 + perk.value / 100) };
            case "crit-chance":
                return state;
            case "magic-level":
                return { ...state, ML: ML + perk.value };
            case "axe-percent-extra":
                return { ...state, F: F + Math.floor((S * perk.value) / 100) };
            case "fishing-percent-extra":
                return { ...state, F: F + Math.floor((S * perk.value) / 100) };
        }
    }

    return state;
};

const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;

const derive = (inp: BuildStats) => {
    const L = n(inp.level);
    const B = n(inp.bonus);
    const S = n(inp.skill);
    const ML = n(inp.magicLevel);
    const W = n(inp.weapon);
    const step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
    const F = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;
    return { F, ML, S, W };
};

export const computeResults = (inp: BuildStats, activePerks: ActivePerk[]) => {
    const withDefs: ActivePerkWithDef[] = activePerks
        .map((ap) => {
            const def = perkDefsById[ap.id];
            if (!def) {
                console.warn(`Unknown perk id: ${ap.id}`);
                return null;
            }
            return { ...ap, def };
        })
        .filter((x): x is ActivePerkWithDef => x !== null);
    const { F, ML, S, W } = derive(inp);
    return spells.map((spell) => {
        console.log("------- computing " + spell.name);
        const initial: SpellState = { P: spell.power, F, ML, S, W };
        const final: SpellState = withDefs.reduce((acc, perk) => applyPerkToSpell(spell, perk, acc), initial);
        console.log(initial);
        console.log(final);
        return {
            ...spell,
            min: computeMinMax(spell, -1, final.P, final.F, final.ML, final.S, final.W),
            avg: computeAvg(spell, final.P, final.F, final.ML, final.S, final.W),
            max: computeMinMax(spell, 1, final.P, final.F, final.ML, final.S, final.W),
        };
    });
};
