import { perks } from "@data/perks";
import { creatures, type Creature } from "@data/creatures";
import { weapons, ammo } from "@data/weapons";

import type { BuildStats, Vocation } from "@lib/build-state";
import type { PerkDef } from "@data/perks";

import { spells, type Spell, type SpellDamage } from "src/data/spells";
import { computeDamageRanges } from "./formulas";
import type {
  ActivePerk,
  ActivePerkWithDef,
  CharacterState,
  RotationSpell,
  SpellState,
  Target,
  TargetWithCreature,
  WeaponBuild,
} from "@lib/damage-calc";
import type { Ammo, SkillType, Weapon } from "@data/weapons";

const AUTO_ATTACK_ID = 1;

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

const perkDefsById: Record<number, PerkDef> = Object.fromEntries(perks.map((i) => [i.id, i]));
const weaponsById: Record<number, Weapon> = Object.fromEntries(weapons.map((i) => [i.id, i]));
const ammoById: Record<number, Ammo> = Object.fromEntries(ammo.map((i) => [i.id, i]));
const creaturesById: Record<number, Creature> = Object.fromEntries(creatures.map((i) => [i.id, i]));

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
      case "axe-percent-extra": {
        const S = skillType === "axe" ? state.skill : state.axe;
        return { ...state, flat: F + Math.round((S * perk.value) / 100) };
      }
      case "club-percent-extra": {
        const S = skillType === "club" ? state.skill : state.club;
        return { ...state, flat: F + Math.round((S * perk.value) / 100) };
      }
      case "sword-percent-extra": {
        const S = skillType === "sword" ? state.skill : state.sword;
        return { ...state, flat: F + Math.round((S * perk.value) / 100) };
      }
      case "distance-percent-extra": {
        const S = skillType === "distance" ? state.skill : state.distance;
        return { ...state, flat: F + Math.round((S * perk.value) / 100) };
      }
      case "fist-percent-extra": {
        const S = skillType === "fist" ? state.skill : state.fist;
        return { ...state, flat: F + Math.round((S * perk.value) / 100) };
      }
      case "shield-percent-extra":
        return { ...state, flat: F + Math.round((state.shielding * perk.value) / 100) };
      case "fishing-percent-extra":
        return { ...state, flat: F + Math.round((state.fishing * perk.value) / 100) };
      case "magic-level-percent-extra":
        return { ...state, flat: F + Math.round((ML * perk.value) / 100) };
      case "runic-mastery":
        if (spell.spellType === "rune") {
          const increaseAmount = spell.runic.includes(vocation) ? 0.2 : 0.1;
          const runicIncrease = Math.round(state.baseMagicLevel * increaseAmount);
          return { ...state, runicIncrease };
        } else return state;
      case "axe-fighting":
        if (skillType === "axe") return { ...state, skill: state.skill + perk.value };
        else return { ...state, axe: state.axe + perk.value };
      case "club-fighting":
        if (skillType === "club") return { ...state, skill: state.skill + perk.value };
        else return { ...state, club: state.club + perk.value };
      case "sword-fighting":
        if (skillType === "sword") return { ...state, skill: state.skill + perk.value };
        else return { ...state, sword: state.sword + perk.value };
      case "fist-fighting":
        if (skillType === "fist") return { ...state, skill: state.skill + perk.value };
        else return { ...state, fist: state.fist + perk.value };
      case "distance-fighting":
        if (skillType === "distance") return { ...state, skill: state.skill + perk.value };
        else return { ...state, distance: state.distance + perk.value };
      case "magic-level":
        return { ...state, magicLevel: ML + perk.value };
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

const assignCreaturesToTargets = (targets: Target[]) => {
  return targets
    .map((t) => {
      const creature = creaturesById[t.id];
      if (!creature) {
        console.warn(`Unknown creature id: ${t.id}`);
        return null;
      }
      return { ...t, creature };
    })
    .filter((x): x is TargetWithCreature => x !== null);
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

export const computeResults = (inp: BuildStats, weapon: WeaponBuild, activePerks: ActivePerk[], targets: Target[]) => {
  const perksWithDefs: ActivePerkWithDef[] = assignDefsToPerks(activePerks);
  const targetsWithCreatures: TargetWithCreature[] = assignCreaturesToTargets(targets);

  const weaponDef = weaponsById[weapon.id];
  const ammoDef = weapon.ammo ? ammoById[weapon.ammo] : null;

  const state = derive(inp, weaponDef, ammoDef);

  const highRollAA = !ammoDef?.aoe;

  const spellResults = spells
    .filter((s) => s.vocations.includes(inp.vocation))
    .map((spell) => {
      const initial: SpellState = { ...state, basePower: spell.power, runicIncrease: 0 };
      const final: SpellState = perksWithDefs.reduce(
        (acc, perk) => applyPerkToSpell(spell, perk, weaponDef.skill, inp.vocation, acc),
        initial,
      );
      return computeDamageRanges(spell, final, highRollAA, inp.vocation, targetsWithCreatures);
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
