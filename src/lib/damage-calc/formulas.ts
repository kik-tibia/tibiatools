import type { Vocation } from "@lib/build-state";
import type { Spell, SpellDamage } from "src/data/spells";
import type { SpellState, TargetWithCreature } from "@lib/damage-calc";

export const computeAvg = (spell: Spell, state: SpellState) => {
  const { basePower: P, flat: F, magicLevel: ML, skill: S, weaponAttack: W } = state;
  const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
  const damage =
    spell.element === "weapon"
      ? F + round((P / spell.skillFactor) * S * W + P / 4)
      : spell.scalesWith === "distance"
        ? F + round((P / spell.skillFactor) * S + P / 4)
        : F + round((P / spell.skillFactor) * ML + P / 4);
  return Math.ceil(damage * spell.additionalDamageMultiplier);
};

export const computeMinMax = (spell: Spell, minMax: number, state: SpellState) => {
  const { basePower: P, flat: F, magicLevel: ML, skill: S, weaponAttack: W } = state;
  const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
  const variation = spell.buckets / P / 2;
  const damage =
    spell.element === "weapon"
      ? F + round((1 + minMax * variation) * ((P / spell.skillFactor) * S * W + P / 4))
      : spell.scalesWith === "distance"
        ? F + round((1 + minMax * variation) * ((P / spell.skillFactor) * S + P / 4))
        : F + round((1 + minMax * variation) * ((P / spell.skillFactor) * ML + P / 4));
  return Math.ceil(damage * spell.additionalDamageMultiplier);
};

export const computeDamageRanges = (
  spell: Spell,
  state: SpellState,
  highRollAA: boolean,
  vocation: Vocation,
  targetsWithCreatures: TargetWithCreature[],
): SpellDamage => {
  let nTranscendenceAttacks;
  if (spell.spellType === "auto") nTranscendenceAttacks = 3;
  else nTranscendenceAttacks = 3.9;

  const pT = state.transcendenceChance;
  const pTCrit = (nTranscendenceAttacks * pT) / (nTranscendenceAttacks * pT - pT + 1);
  const critChance = Math.min(state.critChance, 1);
  const c = 1 - (1 - critChance) * (1 - pTCrit);
  const o = state.fatalChance;
  const pCrit = c * (1 - o);
  const pFatal = o * (1 - c);
  const pCritFatal = c * o;
  const pNoBonus = (1 - c) * (1 - o);
  // Increase crit damage by the ratio of transcendence crits, which have 15% extra damage
  const critDamage = state.critDamage + (0.15 * pTCrit) / (pTCrit + (1 - pTCrit) * critChance || 1);

  if (spell.spellType === "auto") {
    const attackValueWithoutFlat = (Math.floor((6 * state.weaponAttack) / 5) * (state.skill + 4)) / 28;
    const attackIncrease = vocation == "monk" ? 1.5 : 1;
    let min, avg, max;
    if (state.weaponDamage) {
      avg = state.weaponDamage;
    } else {
      min = Math.floor(state.flat + (attackValueWithoutFlat * attackIncrease) / 2);
      avg = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease);
      max = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 2);
    }

    let effectiveAvg;
    if (state.weaponDamage) {
      effectiveAvg = avg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));
    } else {
      effectiveAvg = highRollAA
        ? pNoBonus * avg +
          pCrit * (state.flat + attackValueWithoutFlat * 1.75) * (1 + critDamage) +
          pFatal * (state.flat + attackValueWithoutFlat * 1.75) * 1.6 +
          pCritFatal * (state.flat + attackValueWithoutFlat * 1.75) * (1.6 + critDamage)
        : avg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));
    }

    return { ...spell, min, avg, max, effectiveAvg };
  } else {
    // TODO implement harmony properly, with a stance system that all vocations will benefit from
    if (spell.isSpender) state.basePower *= 3.08;
    const avg = computeAvg(spell, state);
    const min = spell.buckets != 0 ? computeMinMax(spell, -1, state) : undefined;
    const max = spell.buckets != 0 ? computeMinMax(spell, 1, state) : undefined;
    let effectiveAvg =
      state.runicIncrease == 0
        ? avg
        : computeAvg(spell, { ...state, magicLevel: state.magicLevel + 0.25 * state.runicIncrease });
    effectiveAvg =
      effectiveAvg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));
    return { ...spell, min, avg, max, effectiveAvg };
  }
};
