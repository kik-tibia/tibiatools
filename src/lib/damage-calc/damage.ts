import type { Creature } from "@data/creatures";
import type { Element, Spell, SpellDamage } from "@data/spells";
import type { Weapon } from "@data/weapons";
import type { BuildStats } from "@lib/build-state";
import type { SpellState, TargetWithCreature } from "@lib/damage-calc";

export function computeDamageRanges(
  spell: Spell,
  state: SpellState,
  aoeAA: boolean,
  buildStats: BuildStats,
  weapon: Weapon,
  targetsWithCreatures: TargetWithCreature[],
): SpellDamage {
  const highRollAA = !aoeAA;

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

  const effectiveAvgElements: Record<Element, number> = {
    death: 0,
    earth: 0,
    energy: 0,
    fire: 0,
    holy: 0,
    ice: 0,
    physical: 0,
  };
  const ratioAdjustedHp = targetsWithCreatures.reduce(
    (total, creture) => total + creture.ratio * creture.creature.hitpoints,
    0,
  );

  weapon = applyElementalAttackImbuement(weapon, aoeAA, buildStats);

  if (spell.spellType === "auto") {
    const attackValueWithoutFlat = (Math.floor((6 * state.weaponAttack) / 5) * (state.skill + 4)) / 28;
    const attackIncrease = buildStats.vocation == "monk" ? 1.5 : 1;
    let min, avg, max, highRollAvg;
    if (state.weaponDamage) {
      min = undefined;
      avg = state.weaponDamage;
      max = undefined;
      highRollAvg = avg;
    } else {
      min = Math.floor(state.flat + (attackValueWithoutFlat * attackIncrease) / 2);
      avg = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease);
      max = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 2);
      highRollAvg = Math.floor(state.flat + attackValueWithoutFlat * 1.75 * attackIncrease);
    }

    const effectiveAvgHighRollElements: Record<Element, number> = {
      death: 0,
      earth: 0,
      energy: 0,
      fire: 0,
      holy: 0,
      ice: 0,
      physical: 0,
    };
    let effectiveAvg = avg;
    let effectiveAvgHighRoll = highRollAvg;
    let physAvg = 0;

    if (weapon.damageType) {
      // wand or rod
      effectiveAvgElements[weapon.damageType] = weapon.damage ?? 0;
      physAvg = weapon.damageType == "physical" ? (weapon.damage ?? 0) : 0;
    } else {
      // regular weapon
      if (weapon.attack && weapon.attack > 0) {
        effectiveAvgElements.death = (effectiveAvg * (weapon.attackDeath ?? 0)) / weapon.attack;
        effectiveAvgElements.earth = (effectiveAvg * (weapon.attackEarth ?? 0)) / weapon.attack;
        effectiveAvgElements.energy = (effectiveAvg * (weapon.attackEnergy ?? 0)) / weapon.attack;
        effectiveAvgElements.fire = (effectiveAvg * (weapon.attackFire ?? 0)) / weapon.attack;
        effectiveAvgElements.ice = (effectiveAvg * (weapon.attackIce ?? 0)) / weapon.attack;

        effectiveAvgHighRollElements.death = (highRollAvg * (weapon.attackDeath ?? 0)) / weapon.attack;
        effectiveAvgHighRollElements.earth = (highRollAvg * (weapon.attackEarth ?? 0)) / weapon.attack;
        effectiveAvgHighRollElements.energy = (highRollAvg * (weapon.attackEnergy ?? 0)) / weapon.attack;
        effectiveAvgHighRollElements.fire = (highRollAvg * (weapon.attackFire ?? 0)) / weapon.attack;
        effectiveAvgHighRollElements.ice = (highRollAvg * (weapon.attackIce ?? 0)) / weapon.attack;

        physAvg = (avg * (weapon.attackPhysical ?? 0)) / (weapon.attack ?? 0);
      }
    }

    const physAvgHighRoll = (highRollAvg * (weapon.attackPhysical ?? 0)) / (weapon.attack ?? 0);

    if (ratioAdjustedHp > 0) {
      effectiveAvg = weightedElementalEffective(
        effectiveAvgElements,
        physAvg,
        physAvg,
        state,
        targetsWithCreatures,
        ratioAdjustedHp,
      );
      effectiveAvgHighRoll = weightedElementalEffective(
        effectiveAvgHighRollElements,
        physAvgHighRoll,
        physAvgHighRoll,
        state,
        targetsWithCreatures,
        ratioAdjustedHp,
      );
    }

    if (weapon.damageType) {
      // wand or rod
      effectiveAvg =
        effectiveAvg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));
    } else {
      // regular weapon
      effectiveAvg = highRollAA
        ? pNoBonus * effectiveAvg +
          pCrit * effectiveAvgHighRoll * (1 + critDamage) +
          pFatal * effectiveAvgHighRoll * 1.6 +
          pCritFatal * effectiveAvgHighRoll * (1.6 + critDamage)
        : effectiveAvg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));
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
    let physMin = 0;
    let physMax = 0;

    if (spell.element == "weapon") {
      if (weapon.attack && weapon.attack > 0) {
        if (weapon.bond) {
          effectiveAvgElements[weapon.bond] = effectiveAvg;
          if (weapon.bond == "physical") {
            physMin = min ?? effectiveAvg;
            physMax = max ?? effectiveAvg;
          }
        } else {
          effectiveAvgElements.death = (effectiveAvg * (weapon.attackDeath ?? 0)) / weapon.attack;
          effectiveAvgElements.earth = (effectiveAvg * (weapon.attackEarth ?? 0)) / weapon.attack;
          effectiveAvgElements.energy = (effectiveAvg * (weapon.attackEnergy ?? 0)) / weapon.attack;
          effectiveAvgElements.fire = (effectiveAvg * (weapon.attackFire ?? 0)) / weapon.attack;
          effectiveAvgElements.ice = (effectiveAvg * (weapon.attackIce ?? 0)) / weapon.attack;
          physMin = ((min ?? effectiveAvg) * (weapon.attackPhysical ?? 0)) / (weapon.attack ?? 0);
          physMax = ((max ?? effectiveAvg) * (weapon.attackPhysical ?? 0)) / (weapon.attack ?? 0);
        }
      }
    } else {
      effectiveAvgElements[spell.element] = effectiveAvg;
      if (spell.element == "physical") {
        physMin = min ?? avg;
        physMax = max ?? avg;
      }
    }

    if (ratioAdjustedHp > 0) {
      effectiveAvg = weightedElementalEffective(
        effectiveAvgElements,
        physMin,
        physMax,
        state,
        targetsWithCreatures,
        ratioAdjustedHp,
      );
    }

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

function weightedElementalEffective(
  elements: Record<Element, number>,
  physMin: number,
  physMax: number,
  spellState: SpellState,
  targets: TargetWithCreature[],
  ratioAdjustedHp: number,
): number {
  return targets.reduce((total, creature) => {
    const ratio = (creature.ratio * creature.creature.hitpoints) / ratioAdjustedHp;
    const armor = Math.round(creature.creature.armor * (1 - spellState.armorPenetration));
    const extraDamage = 1 + bestiaryExtraDamage(creature.creature, spellState);
    return (
      total +
      ratio *
        (elements.death * applyPierce(creature.creature.deathDmgMod, spellState.deathPierce) +
          elements.earth * applyPierce(creature.creature.earthDmgMod, spellState.earthPierce) +
          elements.energy * applyPierce(creature.creature.energyDmgMod, spellState.energyPierce) +
          elements.fire * applyPierce(creature.creature.fireDmgMod, spellState.firePierce) +
          elements.holy * applyPierce(creature.creature.holyDmgMod, spellState.holyPierce) +
          elements.ice * applyPierce(creature.creature.iceDmgMod, spellState.icePierce) +
          avgDamageVsArmor(
            physMin * applyPierce(creature.creature.physicalDmgMod, spellState.physicalPierce),
            physMax * applyPierce(creature.creature.physicalDmgMod, spellState.physicalPierce),
            Math.max(Math.floor(armor / 2), 0),
            Math.max(Math.floor(armor / 2) * 2 - 1, 0),
          )) *
        (1 - creature.creature.mitigation / 100) *
        extraDamage
    );
  }, 0);
}

function bestiaryExtraDamage(creature: Creature, spellState: SpellState): number {
  if (creature.bestiaryClass == "Amphibic") return spellState.damageAmphibic;
  if (creature.bestiaryClass == "Aquatic") return spellState.damageAquatic;
  if (creature.bestiaryClass == "Bird") return spellState.damageBird;
  if (creature.bestiaryClass == "Construct") return spellState.damageConstruct;
  if (creature.bestiaryClass == "Demon") return spellState.damageDemon;
  if (creature.bestiaryClass == "Dragon") return spellState.damageDragon;
  if (creature.bestiaryClass == "Elemental") return spellState.damageElemental;
  if (creature.bestiaryClass == "Extra Dimensional") return spellState.damageExtraDimensional;
  if (creature.bestiaryClass == "Fey") return spellState.damageFey;
  if (creature.bestiaryClass == "Giant") return spellState.damageGiant;
  if (creature.bestiaryClass == "Human") return spellState.damageHuman;
  if (creature.bestiaryClass == "Humanoid") return spellState.damageHumanoid;
  if (creature.bestiaryClass == "Inkborn") return spellState.damageInkborn;
  if (creature.bestiaryClass == "Lycanthrope") return spellState.damageLycanthrope;
  if (creature.bestiaryClass == "Magical") return spellState.damageMagical;
  if (creature.bestiaryClass == "Mammal") return spellState.damageMammal;
  if (creature.bestiaryClass == "Plant") return spellState.damagePlant;
  if (creature.bestiaryClass == "Reptile") return spellState.damageReptile;
  if (creature.bestiaryClass == "Slime") return spellState.damageSlime;
  if (creature.bestiaryClass == "Undead") return spellState.damageUndead;
  if (creature.bestiaryClass == "Vermin") return spellState.damageVermin;
  return 0;
}

function applyPierce(resistance: number, pierce: number): number {
  if (resistance <= 0) return resistance; // "Sensitivities of 0% can never be increased."
  const headroom = Math.max(0, 1 - resistance);
  const fullPierce = Math.min(headroom, pierce);
  const halfPierce = (pierce - fullPierce) / 2; // "The increase is halved above sensitivities of 100% (rounded up)."
  return Math.min(resistance + fullPierce + halfPierce, resistance * 2); // "Can double the sensitivity at most."
}

function applyElementalAttackImbuement(weapon: Weapon, aoeAA: boolean, stats: BuildStats): Weapon {
  if (!stats.imbuementElement || stats.imbuementValue == null) return weapon;
  if (weapon.attack != weapon.attackPhysical) return weapon; // Disallow elemental imbuements on elemental weapons
  if (aoeAA) return weapon; // Disallow elemental imbuements for AOE AAs such as diamond arrows
  const elementalAttack = (weapon.attack ?? 0) * stats.imbuementValue;
  const attackDeath = stats.imbuementElement == "death" ? elementalAttack : weapon.attackDeath;
  const attackEarth = stats.imbuementElement == "earth" ? elementalAttack : weapon.attackEarth;
  const attackEnergy = stats.imbuementElement == "energy" ? elementalAttack : weapon.attackEnergy;
  const attackFire = stats.imbuementElement == "fire" ? elementalAttack : weapon.attackFire;
  const attackIce = stats.imbuementElement == "ice" ? elementalAttack : weapon.attackIce;
  return {
    ...weapon,
    attackDeath,
    attackEarth,
    attackEnergy,
    attackFire,
    attackIce,
    attackPhysical: (weapon.attackPhysical ?? 0) - elementalAttack,
  };
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
