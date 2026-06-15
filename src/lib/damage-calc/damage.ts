import type { Creature } from "@data/creatures";
import type { DamageBreakdown, DamageRange, Element, Spell, SpellElement } from "@data/spells";
import type { Weapon } from "@data/weapons";
import type { BuildStats } from "@lib/build-state";
import type { CreatureChoice, SpellChoice, SpellState, WeaponChoice } from "@lib/damage-calc";

export function computeRaw(state: SpellState, buildStats: BuildStats): DamageRange {
  if (state.spell.spellType === "auto") {
    const attackValueWithoutFlat = (Math.floor((6 * state.weaponAttack) / 5) * (state.skill + 4)) / 28;
    const attackIncrease = buildStats.vocation == "monk" ? 1.5 : 1;
    let min, avg, max;
    if (state.weaponDamage) {
      min = undefined;
      avg = state.weaponDamage;
      max = undefined;
    } else {
      min = Math.floor(state.flat + (attackValueWithoutFlat * attackIncrease) / 2);
      avg = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease);
      max = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 2);
    }
    return { ...state.spell, min, avg, max };
  } else {
    const avg = computeAvg(state.spell, state);
    const min = state.spell.buckets != 0 ? computeMinMax(state.spell, -1, state) : undefined;
    const max = state.spell.buckets != 0 ? computeMinMax(state.spell, 1, state) : undefined;
    return { min, avg, max };
  }
}

// For a single spell+creature combo.
export function computeDamageBreakdown(
  state: SpellState,
  buildStats: BuildStats,
  weaponChoice: WeaponChoice,
  spellChoices: SpellChoice[],
  creatureChoice?: CreatureChoice,
  masteryElement?: SpellElement,
): DamageBreakdown {
  let charmCritChance = 0;
  let charmCritDamage = 0;
  if (creatureChoice?.charm && creatureChoice.charmTier) {
    if (creatureChoice.charm.effect == "low-blow") {
      if (creatureChoice.charmTier == 1) charmCritChance = 0.04;
      else if (creatureChoice.charmTier == 2) charmCritChance = 0.08;
      else charmCritChance = 0.09;
    } else if (creatureChoice.charm.effect == "savage-blow") {
      if (creatureChoice.charmTier == 1) charmCritDamage = 0.2;
      else if (creatureChoice.charmTier == 2) charmCritDamage = 0.4;
      else charmCritDamage = 0.44;
    }
  }

  let nTranscendenceAttacks;
  if (state.spell.spellType === "auto") nTranscendenceAttacks = 3;
  else nTranscendenceAttacks = 3.9;
  const pT = state.transcendenceChance;
  const pTCrit = (nTranscendenceAttacks * pT) / (nTranscendenceAttacks * pT - pT + 1);
  const critChance = Math.min(state.critChance + charmCritChance, 1);
  const c = 1 - (1 - critChance) * (1 - pTCrit);
  const o = state.fatalChance;
  const pCrit = c * (1 - o);
  const pFatal = o * (1 - c);
  const pCritFatal = c * o;
  const pNoBonus = (1 - c) * (1 - o);
  // Increase crit damage by the ratio of transcendence crits, which have 15% extra damage
  const critDamage = state.critDamage + charmCritDamage + (0.15 * pTCrit) / (pTCrit + (1 - pTCrit) * critChance || 1);

  let mergedWeaponChoice = mergeAmmoIntoWeapon(weaponChoice);

  let breakdown;
  if (state.spell.spellType === "auto") {
    breakdown = computeEffectiveAuto(
      state,
      buildStats,
      pCrit,
      pFatal,
      pCritFatal,
      pNoBonus,
      critDamage,
      mergedWeaponChoice,
      creatureChoice,
    );
  } else {
    breakdown = computeEffectiveSpell(
      state.spell,
      buildStats,
      state,
      pCrit,
      pFatal,
      pCritFatal,
      pNoBonus,
      critDamage,
      mergedWeaponChoice,
      spellChoices,
      creatureChoice,
      masteryElement,
    );
  }

  let elementalCharmDmg = 0;
  let critCharmDmg = 0;

  if (creatureChoice?.charm && creatureChoice.charmTier) {
    let elementalChance = 0;
    switch (creatureChoice.charmTier) {
      case 1:
        elementalChance = 0.05;
        break;
      case 2:
        elementalChance = 0.1;
        break;
      case 3:
        elementalChance = 0.11;
        break;
    }
    if (creatureChoice.charm.effect == "low-blow" || creatureChoice.charm.effect == "savage-blow") {
      const breakdownWithoutCharm = computeDamageBreakdown(state, buildStats, mergedWeaponChoice, spellChoices, {
        ...creatureChoice,
        charm: undefined,
        charmTier: undefined,
      });
      critCharmDmg = breakdown.effective.avg - breakdownWithoutCharm.effective.avg;
    } else {
      elementalCharmDmg = elementalChance * calculateElementalCharmDmg(creatureChoice, buildStats);
    }
  }

  let effectiveAvg = breakdown.effective.avg;

  // AOE auto-attacks only proc charms on the primary target
  if (state.spell.spellType == "auto") {
    const autoAttack = spellChoices.find((s) => s.spell.spellType == "auto");
    const targets = Math.max(autoAttack?.targets ?? 1, 1);
    effectiveAvg -= critCharmDmg * (1 - 1 / targets);
    critCharmDmg /= targets;
    elementalCharmDmg /= targets;
  }

  const effective = { avg: effectiveAvg, critCharmDmg, elementalCharmDmg };
  return { ...breakdown, effective };
}

// Calculates the full charm damage, ignoring the chance
export function calculateElementalCharmDmg(creatureChoice: CreatureChoice, buildStats: BuildStats): number {
  if (!creatureChoice.charm) return 0;
  if (creatureChoice.charm.element) {
    const cap = Math.min((buildStats.level ?? 0) * 2, creatureChoice.creature.hitpoints * 0.05);
    let resistance;
    switch (creatureChoice.charm.element) {
      case "ice":
        resistance = creatureChoice.creature.iceDmgMod;
        break;
      case "fire":
        resistance = creatureChoice.creature.fireDmgMod;
        break;
      case "earth":
        resistance = creatureChoice.creature.earthDmgMod;
        break;
      case "energy":
        resistance = creatureChoice.creature.energyDmgMod;
        break;
      case "physical":
        resistance = creatureChoice.creature.physicalDmgMod;
        break;
      case "holy":
        resistance = creatureChoice.creature.holyDmgMod;
        break;
      case "death":
        resistance = creatureChoice.creature.deathDmgMod;
        break;
    }
    return cap * resistance * (1 - creatureChoice.creature.mitigation / 100);
  } else if (creatureChoice.charm.effect == "overpower") {
    return Math.min((buildStats.hitPoints ?? 0) * 0.05, creatureChoice.creature.hitpoints * 0.08);
  } else if (creatureChoice.charm.effect == "overflux") {
    return Math.min((buildStats.manaPoints ?? 0) * 0.025, creatureChoice.creature.hitpoints * 0.08);
  } else return 0;
}

// Adds all of the ammo's attack values onto the weapon, for simplicity
function mergeAmmoIntoWeapon(weaponChoice: WeaponChoice): WeaponChoice {
  const { weapon, ammo } = weaponChoice;
  if (!ammo) return weaponChoice;
  const attack = (weapon.attack ?? 0) + ammo.attack;
  const scale = ammo.attack > 0 ? attack / ammo.attack : 0;
  return {
    ...weaponChoice,
    weapon: {
      ...weapon,
      attack,
      ...(ammo.attack > 0 && {
        attackDeath: (ammo.attackDeath ?? 0) * scale,
        attackEarth: (ammo.attackEarth ?? 0) * scale,
        attackEnergy: (ammo.attackEnergy ?? 0) * scale,
        attackFire: (ammo.attackFire ?? 0) * scale,
        attackIce: (ammo.attackIce ?? 0) * scale,
        attackPhysical: ammo.attackPhysical * scale,
      }),
    },
    ammo: {
      ...ammo,
      attack: 0,
      attackDeath: 0,
      attackEarth: 0,
      attackEnergy: 0,
      attackFire: 0,
      attackIce: 0,
      attackPhysical: 0,
    },
  };
}

function computeEffectiveAuto(
  state: SpellState,
  buildStats: BuildStats,
  pCrit: number,
  pFatal: number,
  pCritFatal: number,
  pNoBonus: number,
  critDamage: number,
  weaponChoice: WeaponChoice,
  creatureChoice?: CreatureChoice,
): DamageBreakdown {
  const aoeAA = !!weaponChoice.ammo?.aoe;
  let weapon = weaponChoice.weapon;
  weapon = applyElementalAttackImbuement(weapon, aoeAA, buildStats);

  let min, avg, max, hrMin, hrAvg, hrMax;
  const minElements = initElements();
  const avgElements = initElements();
  const maxElements = initElements();
  const hrMinElements = initElements();
  const hrAvgElements = initElements();
  const hrMaxElements = initElements();

  const attackValueWithoutFlat = (Math.floor((6 * state.weaponAttack) / 5) * (state.skill + 4)) / 28;
  const attackIncrease = buildStats.vocation == "monk" ? 1.5 : 1;

  if (weapon.damageType) {
    // wand or rod, no high roll and no variance
    const damage = weapon.damage ?? 0;
    min = hrMin = damage;
    avg = hrAvg = damage;
    max = hrMax = damage;
    minElements[weapon.damageType] = damage;
    avgElements[weapon.damageType] = damage;
    maxElements[weapon.damageType] = damage;
    hrMinElements[weapon.damageType] = damage;
    hrAvgElements[weapon.damageType] = damage;
    hrMaxElements[weapon.damageType] = damage;
  } else {
    // regular weapon
    min = Math.floor(state.flat + (attackValueWithoutFlat * attackIncrease) / 2);
    avg = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease);
    // This is not the true max and should never be shown directly to the user. It is only used for slightly improved calculations.
    max = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 1.5);
    hrMin = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 1.5);
    hrAvg = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 1.75);
    hrMax = Math.floor(state.flat + attackValueWithoutFlat * attackIncrease * 2);
    if (weapon.attack && weapon.attack > 0) {
      updateElementsFromWeapon(minElements, min, weapon);
      updateElementsFromWeapon(avgElements, avg, weapon);
      updateElementsFromWeapon(maxElements, max, weapon);
      updateElementsFromWeapon(hrMinElements, hrMin, weapon);
      updateElementsFromWeapon(hrAvgElements, hrAvg, weapon);
      updateElementsFromWeapon(hrMaxElements, hrMax, weapon);
    }
  }

  let effectiveAvg = 0;
  let hrEffectiveAvg = 0;
  if (creatureChoice) {
    min = elementalEffective(minElements, minElements, minElements, state, creatureChoice);
    avg = elementalEffective(avgElements, avgElements, avgElements, state, creatureChoice);
    max = elementalEffective(maxElements, maxElements, maxElements, state, creatureChoice);
    hrMin = elementalEffective(hrMinElements, hrMinElements, hrMinElements, state, creatureChoice);
    hrAvg = elementalEffective(hrAvgElements, hrAvgElements, hrAvgElements, state, creatureChoice);
    hrMax = elementalEffective(hrMaxElements, hrMaxElements, hrMaxElements, state, creatureChoice);
    effectiveAvg = elementalEffective(minElements, avgElements, maxElements, state, creatureChoice);
    hrEffectiveAvg = elementalEffective(hrMinElements, hrAvgElements, hrMaxElements, state, creatureChoice);
  } else {
    effectiveAvg = avg;
    hrEffectiveAvg = hrAvg;
  }

  if (weapon.damageType) {
    // wand or rod, doesn't get high roll crits
    effectiveAvg =
      effectiveAvg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));
  } else {
    // regular weapon
    effectiveAvg = aoeAA
      ? effectiveAvg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage))
      : pNoBonus * effectiveAvg +
        pCrit * hrEffectiveAvg * (1 + critDamage) +
        pFatal * hrEffectiveAvg * 1.6 +
        pCritFatal * hrEffectiveAvg * (1.6 + critDamage);
  }

  const breakdown: DamageBreakdown = {
    noBonus: { min, avg, max, probability: pNoBonus },
    crit: {
      min: hrMin * (1 + critDamage),
      avg: hrAvg * (1 + critDamage),
      max: hrMax * (1 + critDamage),
      probability: pCrit,
    },
    fatal: { min: hrMin * 1.6, avg: hrAvg * 1.6, max: hrMax * 1.6, probability: pFatal },
    critFatal: {
      min: hrMin * (1.6 + critDamage),
      avg: hrAvg * (1.6 + critDamage),
      max: hrMax * (1.6 + critDamage),
      probability: pCritFatal,
    },
    effective: { avg: effectiveAvg, elementalCharmDmg: 0, critCharmDmg: 0 },
  };
  return breakdown;
}

function computeEffectiveSpell(
  originalSpell: Spell,
  buildStats: BuildStats,
  state: SpellState,
  pCrit: number,
  pFatal: number,
  pCritFatal: number,
  pNoBonus: number,
  critDamage: number,
  weaponChoice: WeaponChoice,
  spellChoices: SpellChoice[],
  creatureChoice?: CreatureChoice,
  masteryElement?: SpellElement,
): DamageBreakdown {
  let weapon = weaponChoice.weapon;
  weapon = applyElementalAttackImbuement(weapon, false, buildStats);
  const spell =
    masteryElement && originalSpell.spellType == "spell"
      ? { ...originalSpell, element: masteryElement }
      : originalSpell;

  let min, avg, max;
  const minElements = initElements();
  const avgElements = initElements();
  const maxElements = initElements();

  if (state.runicIncrease == 0) {
    // TODO: we removed the buckets==0 check here, make sure everything still looks good for 0 bucket spells
    min = computeMinMax(spell, -1, state);
    avg = computeAvg(spell, state);
    max = computeMinMax(spell, 1, state);
  } else {
    const stateWithRunicBonus = { ...state, magicLevel: state.magicLevel + 0.25 * state.runicIncrease };
    min = computeMinMax(spell, -1, stateWithRunicBonus);
    avg = computeAvg(spell, stateWithRunicBonus);
    max = computeMinMax(spell, 1, stateWithRunicBonus);
  }

  if (spell.scope == "chained-penance") {
    const chainedPenance = spellChoices.find((s) => s.spell.scope == "chained-penance");
    if (chainedPenance) {
      const decay = 0.95;
      const targets = Math.max(chainedPenance.targets, 1);
      min = (min * (1 - Math.pow(decay, targets))) / (1 - decay) / targets;
      avg = (avg * (1 - Math.pow(decay, targets))) / (1 - decay) / targets;
      max = (max * (1 - Math.pow(decay, targets))) / (1 - decay) / targets;
    }
  }

  if (spell.element == "weapon") {
    if (weapon.attack && weapon.attack > 0) {
      if (weapon.bond) {
        minElements[weapon.bond] = min;
        avgElements[weapon.bond] = avg;
        maxElements[weapon.bond] = max;
      } else {
        updateElementsFromWeapon(minElements, min, weapon);
        updateElementsFromWeapon(avgElements, avg, weapon);
        updateElementsFromWeapon(maxElements, max, weapon);
      }
    }
  } else {
    minElements[spell.element] = min;
    avgElements[spell.element] = avg;
    maxElements[spell.element] = max;
  }

  let effectiveAvg = 0;
  if (creatureChoice) {
    min = elementalEffective(minElements, minElements, minElements, state, creatureChoice);
    avg = elementalEffective(avgElements, avgElements, avgElements, state, creatureChoice);
    max = elementalEffective(maxElements, maxElements, maxElements, state, creatureChoice);
    effectiveAvg = elementalEffective(minElements, avgElements, maxElements, state, creatureChoice);
  } else {
    effectiveAvg = avg;
  }

  effectiveAvg = effectiveAvg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));

  const breakdown: DamageBreakdown = {
    noBonus: { min, avg, max, probability: pNoBonus },
    crit: { min: min * (1 + critDamage), avg: avg * (1 + critDamage), max: max * (1 + critDamage), probability: pCrit },
    fatal: { min: min * 1.6, avg: avg * 1.6, max: max * 1.6, probability: pFatal },
    critFatal: {
      min: min * (1.6 + critDamage),
      avg: avg * (1.6 + critDamage),
      max: max * (1.6 + critDamage),
      probability: pCritFatal,
    },
    effective: { avg: effectiveAvg, elementalCharmDmg: 0, critCharmDmg: 0 },
  };
  return breakdown;
}

function initElements(): Record<Element, number> {
  return {
    death: 0,
    earth: 0,
    energy: 0,
    fire: 0,
    holy: 0,
    ice: 0,
    physical: 0,
  };
}

function updateElementsFromWeapon(elements: Record<Element, number>, damage: number, weapon: Weapon) {
  if (weapon.attack) {
    elements.death = (damage * (weapon.attackDeath ?? 0)) / weapon.attack;
    elements.earth = (damage * (weapon.attackEarth ?? 0)) / weapon.attack;
    elements.energy = (damage * (weapon.attackEnergy ?? 0)) / weapon.attack;
    elements.fire = (damage * (weapon.attackFire ?? 0)) / weapon.attack;
    elements.ice = (damage * (weapon.attackIce ?? 0)) / weapon.attack;
    elements.physical = (damage * (weapon.attackPhysical ?? 0)) / weapon.attack;
  } else {
    console.warn("called with undefined weapon attack:");
    console.warn(weapon);
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

function elementalEffective(
  elementsMin: Record<Element, number>,
  elementsAvg: Record<Element, number>,
  elementsMax: Record<Element, number>,
  spellState: SpellState,
  creatureChoice: CreatureChoice,
): number {
  const armor = Math.round(creatureChoice.creature.armor * (1 - spellState.armorPenetration));
  const extraDamage = 1 + bestiaryExtraDamage(creatureChoice.creature, spellState);
  return (
    (elementsAvg.death * applyPierce(creatureChoice.creature.deathDmgMod, spellState.deathPierce) +
      elementsAvg.earth * applyPierce(creatureChoice.creature.earthDmgMod, spellState.earthPierce) +
      elementsAvg.energy * applyPierce(creatureChoice.creature.energyDmgMod, spellState.energyPierce) +
      elementsAvg.fire * applyPierce(creatureChoice.creature.fireDmgMod, spellState.firePierce) +
      elementsAvg.holy * applyPierce(creatureChoice.creature.holyDmgMod, spellState.holyPierce) +
      elementsAvg.ice * applyPierce(creatureChoice.creature.iceDmgMod, spellState.icePierce) +
      avgDamageVsArmor(
        elementsMin.physical * applyPierce(creatureChoice.creature.physicalDmgMod, spellState.physicalPierce),
        elementsMax.physical * applyPierce(creatureChoice.creature.physicalDmgMod, spellState.physicalPierce),
        Math.max(Math.floor(armor / 2), 0),
        Math.max(Math.floor(armor / 2) * 2 - 1, 0),
      )) *
    (1 - creatureChoice.creature.mitigation / 100) *
    extraDamage
  );
}

/** The best single-variable model that predicts Fist Fighting for the regular mon files with R² = 0.8348
 *  Not currently used.
 * */
function estimatedAverageBlock(creature: Creature): number {
  const defend = creature.mitigation * 38;
  const fistFighting = 10.5 + 1.25 * defend;
  return (defend * (fistFighting * 5 + 50)) / 200;
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
  const halfPierce = Math.ceil(Math.round((pierce - fullPierce) * 100) / 2) / 100; // "The increase is halved above sensitivities of 100% (rounded up)."
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
