import { perks } from "@data/perks";
import { weapons, ammo } from "@data/weapons";

import type { BuildStats, Vocation } from "@lib/build-state";
import type { PerkDef } from "@data/perks";

const AUTO_ATTACK_ID = 1;
import { spells, type Spell, type SpellDamage } from "src/data/spells";
import type {
  ActivePerk,
  ActivePerkWithDef,
  CharacterState,
  RotationSpell,
  SpellState,
  WeaponBuild,
} from "@lib/damage-calc";
import type { Ammo, SkillType, Weapon } from "@data/weapons";

/* calculate power via base power and any perks
 * use the updated power and your skills to calculate base damage
 * add on flat damage from level, wheel, and any extra damage perks
 * multiply by additional damage bonus if applicable (amp kor, ulus)
 * multiply by target's resistance
 * if physical damage, subtract the armor block (confirmed this is after res/miti by testing on gazer spectres, and on spike traps)
 * roll for crit and fatal, if successful, multiply by the extra damage bonus including any crit damage perks (crit rounding is ceil)
 * multiply by target's mitigation
 * (calculate leech at this point)
 * multiply damage by attack prey and talisman
 */

const computeAvg = (spell: Spell, state: SpellState) => {
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

const computeMinMax = (spell: Spell, minMax: number, state: SpellState) => {
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

const perkDefsById: Record<number, PerkDef> = Object.fromEntries(perks.map((i) => [i.id, i]));
const weaponsById: Record<number, Weapon> = Object.fromEntries(weapons.map((i) => [i.id, i]));
const ammoById: Record<number, Ammo> = Object.fromEntries(ammo.map((i) => [i.id, i]));

const applyPerkToSpell = (
  spell: Spell,
  perk: ActivePerkWithDef,
  skillType: SkillType,
  vocation: Vocation,
  state: SpellState,
): SpellState => {
  const { basePower: P, flat: F, magicLevel: ML, weaponAttack: W } = state;

  if (
    perk.def.scope === "all" ||
    perk.def.scope === spell.scope ||
    perk.def.scope === spell.spellType ||
    perk.def.scope === spell.element ||
    perk.def.scope === spell.scalesWith
  ) {
    switch (perk.def.bonusType) {
      case "base-damage":
        return { ...state, basePower: P * (1 + perk.value / 100) };
      case "crit-damage":
        return { ...state, critDamage: state.critDamage + perk.value / 100 };
      case "crit-chance":
        return { ...state, critChance: state.critChance + perk.value / 100 };
      case "attack":
        return { ...state, weaponAttack: W + perk.value };
      case "magic-level":
        return { ...state, magicLevel: ML + perk.value };
      case "axe-percent-extra": {
        const S = state.axe == 0 ? state.skill : state.axe;
        return { ...state, flat: F + Math.floor((S * perk.value) / 100) };
      }
      case "club-percent-extra": {
        const S = state.club == 0 ? state.skill : state.club;
        return { ...state, flat: F + Math.floor((S * perk.value) / 100) };
      }
      case "sword-percent-extra": {
        const S = state.sword == 0 ? state.skill : state.sword;
        return { ...state, flat: F + Math.floor((S * perk.value) / 100) };
      }
      case "distance-percent-extra": {
        const S = state.distance == 0 ? state.skill : state.distance;
        return { ...state, flat: F + Math.floor((S * perk.value) / 100) };
      }
      case "fist-percent-extra": {
        const S = state.fist == 0 ? state.skill : state.fist;
        return { ...state, flat: F + Math.floor((S * perk.value) / 100) };
      }
      case "shield-percent-extra":
        return { ...state, flat: F + Math.floor((state.shielding * perk.value) / 100) };
      case "fishing-percent-extra":
        return { ...state, flat: F + Math.floor((state.fishing * perk.value) / 100) };
      case "magic-level-percent-extra":
        return { ...state, flat: F + Math.floor((ML * perk.value) / 100) };
      case "runic-mastery":
        if (spell.spellType === "rune") {
          // If you use a rune, you have a 25% chance of increasing your magic level by 10%,
          // or by 20% if you use a rune your vocation can create, for that specific rune effect.
          const increaseAmount = spell.runic.includes(vocation) ? 0.2 : 0.1;
          // Not sure if it's floor
          const runicIncrease = Math.floor(state.baseMagicLevel * increaseAmount);
          return { ...state, runicIncrease };
        } else return state;
    }
  }

  return state;
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

const computeDamageRanges = (spell: Spell, state: SpellState, highRollAA: boolean, vocation: Vocation): SpellDamage => {
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

    const effectiveAvg = highRollAA
      ? pNoBonus * avg +
        pCrit * (state.flat + attackValueWithoutFlat * 1.75) * (1 + critDamage) +
        pFatal * (state.flat + attackValueWithoutFlat * 1.75) * 1.6 +
        pCritFatal * (state.flat + attackValueWithoutFlat * 1.75) * (1.6 + critDamage)
      : avg * (pNoBonus + pCrit * (1 + critDamage) + pFatal * 1.6 + pCritFatal * (1.6 + critDamage));

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

const derive = (inp: BuildStats, weaponDef: Weapon, ammoDef: Ammo | null): CharacterState => {
  const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;
  const L = n(inp.level);
  const B = n(inp.bonus);
  const skill = n(inp.skill);
  const magicLevel = n(inp.magicLevel);
  const critChance = n(inp.critChance) / 100;
  const critDamage = n(inp.critDamage) / 100;
  const fatalChance = n(inp.fatalChance) / 100;
  const transcendenceChance = n(inp.transcendenceChance) / 100;
  const baseMagicLevel = n(inp.baseMagicLevel);
  const axe = n(inp.axe);
  const club = n(inp.club);
  const sword = n(inp.sword);
  const fist = n(inp.fist);
  const distance = n(inp.distance);
  const shielding = n(inp.shielding);
  const fishing = n(inp.fishing);
  const step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
  const flat = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;
  const weaponAttack = (weaponDef.attack ?? 0) + (ammoDef?.attack ?? 0);
  const weaponDamage = weaponDef.damage ?? 0;
  return {
    flat,
    magicLevel,
    skill,
    weaponAttack,
    weaponDamage,
    critChance,
    critDamage,
    fatalChance,
    transcendenceChance,
    baseMagicLevel,
    axe,
    club,
    sword,
    fist,
    distance,
    shielding,
    fishing,
  };
};

export const computeResults = (inp: BuildStats, weapon: WeaponBuild, activePerks: ActivePerk[]) => {
  const perksWithDefs: ActivePerkWithDef[] = assignDefsToPerks(activePerks);

  const weaponDef = weaponsById[weapon.id];
  const ammoDef = weapon.ammo ? ammoById[weapon.ammo] : null;

  const state = derive(inp, weaponDef, ammoDef);

  const skillType = weaponDef.skill; // TODO removed usages of this, check if the field even needs to exist on the type
  // actually we do still need it, in the case of selecting a sword, then selecting an axe perk
  // if not specifying axe skill we need to assume it's 0, not the sword skill
  const highRollAA = !ammoDef?.aoe;

  const spellResults = spells
    .filter((s) => s.vocations.includes(inp.vocation))
    .map((spell) => {
      const initial: SpellState = { ...state, basePower: spell.power, runicIncrease: 0 };
      const final: SpellState = perksWithDefs.reduce(
        (acc, perk) => applyPerkToSpell(spell, perk, skillType, inp.vocation, acc),
        initial,
      );
      return computeDamageRanges(spell, final, highRollAA, inp.vocation);
    });
  return spellResults;
};

// damage per turn
export const computeDpt = (spellDamages: SpellDamage[], rotation: RotationSpell[]) => {
  const hasAutoAttack = rotation.some((r) => r.id === AUTO_ATTACK_ID);
  const spellRotation = rotation.filter((r) => r.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);

  const autoAttackDamage = hasAutoAttack
    ? (spellDamages.find((s) => s.id === AUTO_ATTACK_ID)?.effectiveAvg ?? 0) *
      (rotation.find((r) => r.id === AUTO_ATTACK_ID)?.targets ?? 1)
    : 0;

  return (
    autoAttackDamage +
    spellRotation.reduce((damage, r) => {
      const spellDamage = spellDamages.find((s) => s.id === r.id)?.effectiveAvg ?? 0;
      const weightedDamage = ratioSum > 0 ? (spellDamage * r.targets * r.ratio) / ratioSum : 0;
      return damage + weightedDamage;
    }, 0)
  );
};

// damage per hit
export const computeDph = (spellDamages: SpellDamage[], rotation: RotationSpell[]) => {
  const spellRotation = rotation.filter((r) => r.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);
  const fullRotation = rotation.map((r) => (r.id === AUTO_ATTACK_ID ? { ...r, ratio: ratioSum || 1 } : r));
  const ratioTargetSum = fullRotation.reduce((sum, r) => sum + r.targets * r.ratio, 0);

  if (ratioTargetSum === 0) return 0;

  return (
    fullRotation.reduce((damage, r) => {
      const spellDamage = spellDamages.find((s) => s.id === r.id)?.effectiveAvg ?? 0;
      const weightedDamage = spellDamage * r.targets * r.ratio;
      return damage + weightedDamage;
    }, 0) / ratioTargetSum
  );
};
