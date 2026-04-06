import type { Spell, SpellDamage } from "@data/spells";
import type { Vocation } from "@lib/build-state";
import type { SpellState, TargetWithCreature } from "@lib/damage-calc";

export function computeDamageRanges(
  spell: Spell,
  state: SpellState,
  highRollAA: boolean,
  vocation: Vocation,
  targetsWithCreatures: TargetWithCreature[],
): SpellDamage {
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
}

function computeAvg(spell: Spell, state: SpellState): number {
  const { basePower: P, flat: F, magicLevel: ML, skill: S, weaponAttack: W } = state;
  const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
  const damage =
    spell.element === "weapon"
      ? F + round((P / spell.skillFactor) * S * W + P / 4)
      : spell.scalesWith === "distance"
        ? F + round((P / spell.skillFactor) * S + P / 4)
        : F + round((P / spell.skillFactor) * ML + P / 4);
  return Math.ceil(damage * spell.additionalDamageMultiplier);
}

function computeMinMax(spell: Spell, minMax: number, state: SpellState): number {
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
}

/**
 * The calculation splits the damage values into three regions (fully blocked, partially blocked, fully exceeds),
 * and then for each value d in that region, we can calculate how much damage it should do for all armor rolls.
 * Then we sum every d, which simplifies to a closed-form formula in every case.
 */
function avgDamageVsArmor(dMin: number, dMax: number, aMin: number, aMax: number): number {
  // number of damage and armor values that can be rolled
  const nD = dMax - dMin + 1;
  const nA = aMax - aMin + 1;
  if (nD <= 0 || nA <= 0) return 0;

  let S = 0;
  // Region 1: d is fully blocked by all possible armor values, so contributes 0

  // Region 2: d partially overlaps armor range
  // d in [max(dMin, aMin+1), min(dMax, aMax)]
  // contribution per d: triangular sum m(m+1)/2 where m = d - aMin
  // total of all d in this region is a sum of triangular numbers, which is a tetrahedral number (te)
  const lo2 = Math.max(dMin, aMin + 1);
  const hi2 = Math.min(dMax, aMax);
  if (lo2 <= hi2) {
    const p = lo2 - aMin;
    const q = hi2 - aMin;
    const te = (k: number) => (k * (k + 1) * (k + 2)) / 6;
    S += te(q) - te(p - 1);
  }

  // Region 3: d exceeds entire armor range, some damage always gets through
  // d in [max(dMin, aMax+1), dMax]
  // contribution per d: nA * (d - avg_armor)
  const lo3 = Math.max(dMin, aMax + 1);
  if (lo3 <= dMax) {
    const count = dMax - lo3 + 1;
    S += nA * count * ((lo3 + dMax) / 2 - (aMin + aMax) / 2);
  }

  return S / (nD * nA);
}
