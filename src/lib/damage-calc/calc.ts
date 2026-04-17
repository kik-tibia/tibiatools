import { creatures, type Creature } from "@data/creatures";
import { perks, type PerkDef } from "@data/perks";
import { spells, type Spell, type SpellDamage } from "@data/spells";
import { ammo, weapons, type Ammo, type SkillType, type Weapon } from "@data/weapons";
import type { BuildStats, Vocation } from "@lib/build-state";
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
import { computeDamageRanges } from "./damage.ts";

const AUTO_ATTACK_ID = 1;
const perkDefsById: Record<number, PerkDef> = Object.fromEntries(perks.map((i) => [i.id, i]));
const weaponsById: Record<number, Weapon> = Object.fromEntries(weapons.map((i) => [i.id, i]));
const ammoById: Record<number, Ammo> = Object.fromEntries(ammo.map((i) => [i.id, i]));
const creaturesById: Record<number, Creature> = Object.fromEntries(creatures.map((i) => [i.id, i]));

/* calculate power via base power and any perks
 * use the updated power and your skills to calculate base damage
 * add on flat damage from level, wheel, and any extra damage perks
 * multiply by additional damage bonus if applicable (amp kor, ulus)
 * multiply by target's resistance
 * if physical damage, subtract the armor block (confirmed this is after res by testing on gazer spectres, and on spike traps)
 * roll for crit and fatal, if successful, multiply by the extra damage bonus including any crit damage perks (crit rounding is ceil)
 * multiply by target's mitigation
 * (calculate leech at this point)
 * multiply damage by attack prey and talisman
 */

export function computeResults(
  buildStats: BuildStats,
  weapon: WeaponBuild,
  activePerks: ActivePerk[],
  targets: Target[],
): SpellDamage[] {
  const perksWithDefs: ActivePerkWithDef[] = assignDefsToPerks(activePerks);
  const targetsWithCreatures: TargetWithCreature[] = assignCreaturesToTargets(targets);

  const weaponDef = weaponsById[weapon.id];
  const ammoDef = weapon.ammo ? ammoById[weapon.ammo] : null;

  const state = deriveState(buildStats, weaponDef, ammoDef);

  const spellResults = spells
    .filter((s) => s.vocations.includes(buildStats.vocation))
    .map((spell) => {
      const initial: SpellState = {
        ...state,
        basePower: spell.power,
        runicIncrease: 0,
        armorPenetration: 0,
        deathPierce: 0,
        earthPierce: 0,
        energyPierce: 0,
        firePierce: 0,
        holyPierce: 0,
        icePierce: 0,
        physicalPierce: 0,
        damageAmphibic: 0,
        damageAquatic: 0,
        damageBird: 0,
        damageConstruct: 0,
        damageDemon: 0,
        damageDragon: 0,
        damageElemental: 0,
        damageExtraDimensional: 0,
        damageFey: 0,
        damageGiant: 0,
        damageHuman: 0,
        damageHumanoid: 0,
        damageInkborn: 0,
        damageLycanthrope: 0,
        damageMagical: 0,
        damageMammal: 0,
        damagePlant: 0,
        damageReptile: 0,
        damageSlime: 0,
        damageUndead: 0,
        damageVermin: 0,
      };
      const final: SpellState = perksWithDefs.reduce(
        (acc, perk) => applyPerkToSpell(spell, perk, weaponDef.skill, buildStats.vocation, acc),
        initial,
      );
      return computeDamageRanges(spell, final, !!ammoDef?.aoe, buildStats, weaponDef, targetsWithCreatures);
    });
  return spellResults;
}

/** Damage per turn */
export function computeDpt(spellDamages: SpellDamage[], rotation: RotationSpell[]): number {
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
}

/** Damage per hit */
export function computeDph(spellDamages: SpellDamage[], rotation: RotationSpell[]): number {
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
}

function applyPerkToSpell(
  spell: Spell,
  perk: ActivePerkWithDef,
  skillType: SkillType,
  vocation: Vocation,
  state: SpellState,
): SpellState {
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
      case "armor-penetration":
        return { ...state, armorPenetration: perk.value / 100 };
      case "death-pierce":
        return { ...state, deathPierce: perk.value / 100 };
      case "earth-pierce":
        return { ...state, earthPierce: perk.value / 100 };
      case "energy-pierce":
        return { ...state, energyPierce: perk.value / 100 };
      case "fire-pierce":
        return { ...state, firePierce: perk.value / 100 };
      case "holy-pierce":
        return { ...state, holyPierce: perk.value / 100 };
      case "ice-pierce":
        return { ...state, icePierce: perk.value / 100 };
      case "physical-pierce":
        return { ...state, physicalPierce: perk.value / 100 };
      case "damage-amphibic":
        return { ...state, damageAmphibic: perk.value / 100 };
      case "damage-aquatic":
        return { ...state, damageAquatic: perk.value / 100 };
      case "damage-bird":
        return { ...state, damageBird: perk.value / 100 };
      case "damage-construct":
        return { ...state, damageConstruct: perk.value / 100 };
      case "damage-demon":
        return { ...state, damageDemon: perk.value / 100 };
      case "damage-dragon":
        return { ...state, damageDragon: perk.value / 100 };
      case "damage-elemental":
        return { ...state, damageElemental: perk.value / 100 };
      case "damage-extra-dimensional":
        return { ...state, damageExtraDimensional: perk.value / 100 };
      case "damage-fey":
        return { ...state, damageFey: perk.value / 100 };
      case "damage-giant":
        return { ...state, damageGiant: perk.value / 100 };
      case "damage-human":
        return { ...state, damageHuman: perk.value / 100 };
      case "damage-humanoid":
        return { ...state, damageHumanoid: perk.value / 100 };
      case "damage-inkborn":
        return { ...state, damageInkborn: perk.value / 100 };
      case "damage-lycanthrope":
        return { ...state, damageLycanthrope: perk.value / 100 };
      case "damage-magical":
        return { ...state, damageMagical: perk.value / 100 };
      case "damage-mammal":
        return { ...state, damageMammal: perk.value / 100 };
      case "damage-plant":
        return { ...state, damagePlant: perk.value / 100 };
      case "damage-reptile":
        return { ...state, damageReptile: perk.value / 100 };
      case "damage-slime":
        return { ...state, damageSlime: perk.value / 100 };
      case "damage-undead":
        return { ...state, damageUndead: perk.value / 100 };
      case "damage-vermin":
        return { ...state, damageVermin: perk.value / 100 };
    }
  }

  return state;
}

function assignDefsToPerks(activePerks: ActivePerk[]): ActivePerkWithDef[] {
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
}

function assignCreaturesToTargets(targets: Target[]): TargetWithCreature[] {
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
}

function deriveState(buildStats: BuildStats, weaponDef: Weapon, ammoDef: Ammo | null): CharacterState {
  const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;
  const L = n(buildStats.level);
  const B = n(buildStats.bonus);
  const skill = n(buildStats.skill);
  const magicLevel = n(buildStats.magicLevel);
  const critChance = n(buildStats.critChance) / 100;
  const critDamage = n(buildStats.critDamage) / 100;
  const fatalChance = n(buildStats.fatalChance) / 100;
  const transcendenceChance = n(buildStats.transcendenceChance) / 100;
  const baseMagicLevel = n(buildStats.baseMagicLevel);
  const axe = n(buildStats.axe);
  const club = n(buildStats.club);
  const sword = n(buildStats.sword);
  const fist = n(buildStats.fist);
  const distance = n(buildStats.distance);
  const shielding = n(buildStats.shielding);
  const fishing = n(buildStats.fishing);
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
}
