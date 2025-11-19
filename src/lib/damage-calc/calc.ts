import { perks } from "@data/perks";

import type { BuildStats } from "@lib/build-state";
import type { PerkDef } from "@data/perks";
import { spells, type Spell, type SpellDamage } from "src/data/spells";
import type { ActivePerk, ActivePerkWithDef, RotationSpell, SpellState } from "@lib/damage-calc";

/* calculate power via base power and any perks
 * use the updated power and your skills to calculate base damage
 * add on flat damage from level, wheel, and any extra damage perks
 * multiply by additional damage bonus if applicable (amp kor, ulus)
 * multiply by target's resistance and mitigation
 * if physical damage, subtract the armor block
 * roll for crit and fatal, if successful, multiply by the extra damage bonus including any crit damage perks
 */

const computeAvg = (spell: Spell, state: SpellState) => {
  const { P, F, ML, S, W } = state;
  const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
  const damage =
    spell.scalesWith === "magic"
      ? F + round((P / spell.skillFactor) * ML + P / 4)
      : F + round((P / spell.skillFactor) * S * W + P / 4);
  return Math.ceil(damage * spell.additionalDamageMultiplier);
};

const computeMinMax = (spell: Spell, minMax: number, state: SpellState) => {
  const { P, F, ML, S, W } = state;
  const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
  const variation = spell.buckets / P / 2;
  const damage =
    spell.scalesWith === "magic"
      ? F + round((1 + minMax * variation) * ((P / spell.skillFactor) * ML + P / 4))
      : F + round((1 + minMax * variation) * ((P / spell.skillFactor) * S * W + P / 4));
  return Math.ceil(damage * spell.additionalDamageMultiplier);
};

const perkDefsById: Record<string, PerkDef> = Object.fromEntries(perks.map((p) => [p.id, p]));

const applyPerkToSpell = (spell: Spell, perk: ActivePerkWithDef, state: SpellState): SpellState => {
  const { P, F, ML, S, W, shielding, fishing, critChance, critDamage } = state;

  if (
    perk.def.scope === "all" ||
    perk.def.scope === spell.scope ||
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
      case "shield-percent-extra":
        return { ...state, F: F + Math.floor((shielding * perk.value) / 100) };
      case "fishing-percent-extra":
        return { ...state, F: F + Math.floor((fishing * perk.value) / 100) };
      case "magic-level-percent-extra":
        return { ...state, F: F + Math.floor((ML * perk.value) / 100) };
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
  const shielding = n(inp.shielding);
  const fishing = n(inp.fishing);
  const step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
  const F = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;
  const critChance = n(inp.critChance);
  const critDamage = n(inp.critDamage);
  return { F, ML, S, W, shielding, fishing, critChance, critDamage };
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

const computeDamageRanges = (spell: Spell, state: SpellState): SpellDamage => {
  if (spell.spellType === "auto") {
    const attackValueWithoutFlat = (Math.floor((6 * state.W) / 5) * (state.S + 4)) / 28;
    const min = Math.floor(state.F + attackValueWithoutFlat / 2);
    const avg = Math.floor(state.F + attackValueWithoutFlat);
    const max = Math.floor(state.F + attackValueWithoutFlat * 2);
    const effectiveAvg =
      (1 - state.critChance / 100) * avg +
      (state.critChance / 100) * (state.F + attackValueWithoutFlat * 1.75) * (1 + state.critDamage / 100);
    return { ...spell, min, avg, max, effectiveAvg };
  } else {
    const avg = computeAvg(spell, state);
    const min = computeMinMax(spell, -1, state);
    const max = computeMinMax(spell, 1, state);
    const effectiveAvg = avg * ((state.critChance * state.critDamage) / 10000 + 1);
    return { ...spell, min, avg, max, effectiveAvg };
  }
};

export const computeResults = (inp: BuildStats, activePerks: ActivePerk[]) => {
  const perksWithDefs: ActivePerkWithDef[] = assignDefsToPerks(activePerks);
  const { F, ML, S, W, shielding, fishing, critChance, critDamage } = derive(inp);
  const spellResults = spells
    .filter((s) => s.spellType !== "rune") // TODO remove this eventually
    .map((spell) => {
      const initial: SpellState = { P: spell.power, F, ML, S, W, shielding, fishing, critChance, critDamage };
      const final: SpellState = perksWithDefs.reduce((acc, perk) => applyPerkToSpell(spell, perk, acc), initial);
      return computeDamageRanges(spell, final);
    });
  return spellResults;
};

export const computeDpt = (spellDamages: SpellDamage[], rotation: RotationSpell[]) => {
  const ratioSum = rotation.reduce((sum, r) => sum + r.ratio, 0);
  const autoAttackDamage = spellDamages.find((s) => s.id == "auto-attack")?.effectiveAvg ?? 0;
  return (
    autoAttackDamage +
    rotation.reduce((damage, r) => {
      const spellDamage = spellDamages.find((s) => s.id == r.id)?.effectiveAvg ?? 0;
      const weightedDamage = (spellDamage * r.targets * r.ratio) / ratioSum;
      return damage + weightedDamage;
    }, 0)
  );
};
