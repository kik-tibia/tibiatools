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
  const { P, F, ML, S, W, critChance, critDamage } = state;

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
        return { ...state, critChance: critChance + perk.value };
      case "crit-damage":
        return { ...state, critDamage: critDamage + perk.value };
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

const derive = (inp: BuildStats) => {
  const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;
  const L = n(inp.level);
  const B = n(inp.bonus);
  const S = n(inp.skill);
  const ML = n(inp.magicLevel);
  const W = n(inp.weapon);
  const step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
  const F = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;
  const critChance = n(inp.critChance);
  const critDamage = n(inp.critDamage);
  return { F, ML, S, W, critChance, critDamage };
};

const assignDefsToPerks = (activePerks: ActivePerk[]) => {
  return activePerks
    .map((ap) => {
      const def = perkDefsById[ap.id];
      if (!def) {
        console.warn(`Unknown perk id: ${ap.id}`);
        return null;
      }
      return { ...ap, def };
    })
    .filter((x): x is ActivePerkWithDef => x !== null);
};

const computeDamageRanges = (spell: Spell, state: SpellState) => {
  if (spell.spellType === "auto") {
    const attackValueWithoutFlat = Math.floor((Math.floor((6 * state.W) / 5) * (state.S + 4)) / 28);
    const min = Math.floor(state.F + attackValueWithoutFlat / 2);
    const avg = Math.floor(state.F + attackValueWithoutFlat);
    const max = Math.floor(state.F + attackValueWithoutFlat * 2);
    const effectiveAvg = (
      (1 - state.critChance / 100) * avg +
      (state.critChance / 100) * (state.F + attackValueWithoutFlat * 1.85) * (1 + state.critDamage / 100)
    ).toFixed(1);
    return { ...spell, min, avg, max, effectiveAvg };
  } else {
    const avg = computeAvg(spell, state.P, state.F, state.ML, state.S, state.W);
    const min = computeMinMax(spell, -1, state.P, state.F, state.ML, state.S, state.W);
    const max = computeMinMax(spell, 1, state.P, state.F, state.ML, state.S, state.W);
    const effectiveAvg = (avg * ((state.critChance * state.critDamage) / 10000 + 1)).toFixed(1);
    return { ...spell, min, avg, max, effectiveAvg };
  }
};

export const computeResults = (inp: BuildStats, activePerks: ActivePerk[]) => {
  const perksWithDefs: ActivePerkWithDef[] = assignDefsToPerks(activePerks);
  const { F, ML, S, W, critChance, critDamage } = derive(inp);
  const spellResults = spells
    .filter((s) => s.spellType !== "rune") // TODO remove this eventually
    .map((spell) => {
      const initial: SpellState = { P: spell.power, F, ML, S, W, critChance, critDamage };
      const final: SpellState = perksWithDefs.reduce((acc, perk) => applyPerkToSpell(spell, perk, acc), initial);
      return computeDamageRanges(spell, final);
    });
  return spellResults;
};
