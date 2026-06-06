import { allSpells, type Spell, type SpellDamage, type SpellDamageEffective } from "@data/spells";
import type { Stance } from "@data/stances.ts";
import { type SkillType } from "@data/weapons";
import type { BuildStats, Vocation } from "@lib/build-state";
import type {
  CharacterState,
  CreatureChoice,
  PerkChoice,
  SpellChoice,
  SpellDamageChoice,
  SpellState,
  WeaponChoice,
} from "@lib/damage-calc";
import { calculateElementalCharmDmg, computeDamageBreakdown, computeRaw } from "./damage.ts";
import { hpBonusMultiplier, type DamageMixtureComponent, type HpBasedDmgBracket } from "./hp-bonus.ts";

const AUTO_ATTACK_ID = 1;

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
  stances: Stance[],
  weaponChoice: WeaponChoice,
  perkChoices: PerkChoice[],
  spellChoices: SpellChoice[],
  creatureChoices: CreatureChoice[],
): SpellDamage[] {
  const characterState = deriveCharacterState(buildStats, weaponChoice);

  const spellStates = allSpells
    .filter((s) => s.vocations.includes(buildStats.vocation))
    .map((spell) => {
      const initial: SpellState = {
        ...characterState,
        spell,
        basePower: spell.power,
        runicIncrease: 0,
        baseHarmonyBonus: 0,
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
      let spellState: SpellState = perkChoices.reduce(
        (acc, perkChoice) => applyPerkToSpell(spell, perkChoice, weaponChoice.weapon.skill, buildStats.vocation, acc),
        initial,
      );

      if (spell.isSpender) {
        const harmonyBase =
          spellState.baseHarmonyBonus + (stances.some((s) => s.effect == "virtue-of-harmony") ? 13 : 7);
        const spenderHarmonyBonus = (16 * harmonyBase + 100) / 100;
        spellState = { ...spellState, basePower: spellState.basePower * spenderHarmonyBonus };
      }
      return spellState;
    });

  const ratioAdjustedHp = creatureChoices.reduce(
    (total, creatureChoice) => total + creatureChoice.ratio * creatureChoice.creature.hitpoints,
    0,
  );

  // TODO: might be worth creating and using a different type here
  // SpellDamage includes the atoms used per creature, but we don't need them when it's all combined
  // E.g. it's probably not worth it to try to combine a spell's "crit min" across multiple creatures with different resistances
  // Right now, just the first creature that populates the final result sets the atoms, and then they are ignored everywhere else
  let results: SpellDamage[] = [];

  // Brackets for alpha/omega strike
  const hpBasedDmgBrackets = buildHpBasedDmgBrackets(perkChoices);

  if (ratioAdjustedHp > 0) {
    // for each creature, weight its spell damages by that creature's share of total HP and accumulate
    results = creatureChoices.reduce((acc: SpellDamage[], creatureChoice) => {
      const multiplier = (creatureChoice.ratio * creatureChoice.creature.hitpoints) / ratioAdjustedHp;

      // calculate all of the spell damages to this creature
      let spellDamages: SpellDamage[] = spellStates.map((spellState) => {
        const breakdown = computeDamageBreakdown(spellState, buildStats, weaponChoice, spellChoices, creatureChoice);
        const raw = computeRaw(spellState, buildStats);
        return { ...spellState.spell, raw, breakdown };
      });

      // Apply alpha/omega strike
      spellDamages = applyHpBasedDmgBonuses(spellDamages, spellChoices, creatureChoice, buildStats, hpBasedDmgBrackets);

      // The first creature contributes raw and its weighted effective
      if (acc.length == 0) {
        return spellDamages.map((sd) => ({
          ...sd,
          breakdown: { ...sd.breakdown, effective: weighEffective(sd.breakdown.effective, multiplier) },
        }));
      }
      // every later creature only adds its weighted effective on top
      return acc.map((accSd, i) => ({
        ...accSd,
        breakdown: {
          ...accSd.breakdown,
          effective: addEffective(
            accSd.breakdown.effective,
            weighEffective(spellDamages[i].breakdown.effective, multiplier),
          ),
        },
      }));
    }, []);
  } else {
    results = spellStates.map((spellState) => {
      const breakdown = computeDamageBreakdown(spellState, buildStats, weaponChoice, spellChoices);
      const raw = computeRaw(spellState, buildStats);
      return { ...spellState.spell, raw, breakdown };
    });
  }

  return results;
}

function buildHpBasedDmgBrackets(perkChoices: PerkChoice[]): HpBasedDmgBracket[] {
  const brackets: HpBasedDmgBracket[] = [];
  const alpha = perkChoices.find((p) => p.perk.bonusType === "alpha-strike");
  if (alpha && alpha.value > 0) brackets.push({ from: 0, to: 0.05, bonus: alpha.value / 100 });
  const omega = perkChoices.find((p) => p.perk.bonusType === "omega-strike");
  if (omega && omega.value > 0) brackets.push({ from: 0.7, to: 1, bonus: omega.value / 100 });
  return brackets;
}

// Scale every spell's effective damage by the multiplier for all HP-based damage perks against this creature
function applyHpBasedDmgBonuses(
  spellDamages: SpellDamage[],
  spellChoices: SpellChoice[],
  creatureChoice: CreatureChoice,
  buildStats: BuildStats,
  brackets: HpBasedDmgBracket[],
): SpellDamage[] {
  if (brackets.length === 0) return spellDamages;

  const spellDamageById = new Map(spellDamages.map((sd) => [sd.id, sd]));
  const mixture = buildDamageMixture(spellChoices, creatureChoice, buildStats, spellDamageById);
  const multiplier = hpBonusMultiplier(mixture, creatureChoice.creature.hitpoints, brackets);

  // Apply multiplier to every spell in the rotation
  const rotationIds = new Set(spellChoices.map((s) => s.id));
  return spellDamages.map((sd) =>
    rotationIds.has(sd.id)
      ? {
          ...sd,
          breakdown: {
            ...sd.breakdown,
            effective: {
              elementalCharmDmg: sd.breakdown.effective.elementalCharmDmg * multiplier.charm,
              avg: sd.breakdown.effective.avg * multiplier.spell,
              critCharmDmg: sd.breakdown.effective.critCharmDmg * multiplier.spell,
            },
          },
        }
      : sd,
  );
}

function buildDamageMixture(
  spellChoices: SpellChoice[],
  creatureChoice: CreatureChoice,
  buildStats: BuildStats,
  spellDamageById: Map<number, SpellDamage>,
): DamageMixtureComponent[] {
  const spellRotation = spellChoices.filter((s) => s.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);
  const fullRotation = spellChoices.map((s) => (s.id === AUTO_ATTACK_ID ? { ...s, ratio: ratioSum || 1 } : s));
  const ratioTargetSum = fullRotation.reduce((sum, s) => sum + s.targets * s.ratio, 0);

  const mixture: DamageMixtureComponent[] = [];

  const charmDamage = calculateElementalCharmDmg(creatureChoice, buildStats);
  if (creatureChoice.charm && creatureChoice.charmTier && charmDamage > 0) {
    let charmChance = 0;
    switch (creatureChoice.charmTier) {
      case 1:
        charmChance = 0.05;
        break;
      case 2:
        charmChance = 0.1;
        break;
      case 3:
        charmChance = 0.11;
        break;
    }
    mixture.push({ weight: charmChance, lo: charmDamage, hi: charmDamage, isCharm: true });
  }

  for (const spellChoice of fullRotation) {
    const spellDamage = spellDamageById.get(spellChoice.id);
    if (!spellDamage) continue;

    const weight: number = ratioTargetSum > 0 ? (spellChoice.ratio / ratioTargetSum) * spellChoice.targets : 0;
    if (weight <= 0) continue;

    const { noBonus, crit, fatal, critFatal } = spellDamage.breakdown;
    for (const atom of [noBonus, crit, fatal, critFatal]) {
      if (atom.probability <= 0) continue;
      mixture.push({ weight: weight * atom.probability, lo: atom.min, hi: atom.max, isCharm: false });
    }
  }
  return mixture;
}

/** Damage per turn */
export function computeDpt(spellDamageChoices: SpellDamageChoice[]): number {
  const spellRotation = spellDamageChoices.filter((s) => s.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);

  const autoAttack = spellDamageChoices.find((s) => s.id === AUTO_ATTACK_ID);
  const autoAttackDamage = autoAttack
    ? (autoAttack.spellDamage.breakdown.effective.avg + autoAttack.spellDamage.breakdown.effective.elementalCharmDmg) *
      autoAttack.targets
    : 0;

  return (
    autoAttackDamage +
    spellRotation.reduce((damage, s) => {
      const weightedDamage =
        ratioSum > 0
          ? ((s.spellDamage.breakdown.effective.avg + s.spellDamage.breakdown.effective.elementalCharmDmg) *
              s.targets *
              s.ratio) /
            ratioSum
          : 0;
      return damage + weightedDamage;
    }, 0)
  );
}

/** Damage per hit */
export function computeDph(spellDamageChoices: SpellDamageChoice[]): number {
  const spellRotation = spellDamageChoices.filter((s) => s.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);
  const fullRotation = spellDamageChoices.map((s) => (s.id === AUTO_ATTACK_ID ? { ...s, ratio: ratioSum || 1 } : s));
  const ratioTargetSum = fullRotation.reduce((sum, s) => sum + s.targets * s.ratio, 0);

  if (ratioTargetSum === 0) return 0;

  return (
    fullRotation.reduce((damage, s) => {
      const weightedDamage = s.spellDamage.breakdown.effective.avg * s.targets * s.ratio;
      return damage + weightedDamage;
    }, 0) / ratioTargetSum
  );
}

export function computeDamageFromCharms(spellDamageChoices: SpellDamageChoice[]): number {
  const spellRotation = spellDamageChoices.filter((s) => s.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);

  const autoAttack = spellDamageChoices.find((s) => s.id === AUTO_ATTACK_ID);
  const autoAttackDamage = autoAttack
    ? (autoAttack.spellDamage.breakdown.effective.critCharmDmg +
        autoAttack.spellDamage.breakdown.effective.elementalCharmDmg) *
      autoAttack.targets
    : 0;

  return (
    autoAttackDamage +
    spellRotation.reduce((damage, s) => {
      const weightedDamage =
        ratioSum > 0
          ? ((s.spellDamage.breakdown.effective.critCharmDmg + s.spellDamage.breakdown.effective.elementalCharmDmg) *
              s.targets *
              s.ratio) /
            ratioSum
          : 0;
      return damage + weightedDamage;
    }, 0)
  );
}

function weighEffective(e: SpellDamageEffective, multiplier: number): SpellDamageEffective {
  return {
    avg: e.avg * multiplier,
    critCharmDmg: e.critCharmDmg * multiplier,
    elementalCharmDmg: e.elementalCharmDmg * multiplier,
  };
}

function addEffective(a: SpellDamageEffective, b: SpellDamageEffective): SpellDamageEffective {
  return {
    avg: a.avg + b.avg,
    critCharmDmg: a.critCharmDmg + b.critCharmDmg,
    elementalCharmDmg: a.elementalCharmDmg + b.elementalCharmDmg,
  };
}

function applyPerkToSpell(
  spell: Spell,
  perkChoice: PerkChoice,
  skillType: SkillType,
  vocation: Vocation,
  state: SpellState,
): SpellState {
  const { basePower: P, flat: F, magicLevel: ML, weaponAttack: W } = state;

  if (
    perkChoice.perk.scope === "all" ||
    perkChoice.perk.scope === spell.scope ||
    perkChoice.perk.scope === spell.spellType ||
    perkChoice.perk.scope === spell.element ||
    perkChoice.perk.scope === spell.scalesWith
  ) {
    switch (perkChoice.perk.bonusType) {
      case "base-damage":
        return { ...state, basePower: P * (1 + perkChoice.value / 100) };
      case "crit-damage":
        return { ...state, critDamage: state.critDamage + perkChoice.value / 100 };
      case "crit-chance":
        return { ...state, critChance: state.critChance + perkChoice.value / 100 };
      case "attack":
        return { ...state, weaponAttack: W + perkChoice.value };
      case "axe-percent-extra": {
        const S = skillType === "axe" ? state.skill : state.axe;
        return { ...state, flat: F + Math.round((S * perkChoice.value) / 100) };
      }
      case "club-percent-extra": {
        const S = skillType === "club" ? state.skill : state.club;
        return { ...state, flat: F + Math.round((S * perkChoice.value) / 100) };
      }
      case "sword-percent-extra": {
        const S = skillType === "sword" ? state.skill : state.sword;
        return { ...state, flat: F + Math.round((S * perkChoice.value) / 100) };
      }
      case "distance-percent-extra": {
        const S = skillType === "distance" ? state.skill : state.distance;
        return { ...state, flat: F + Math.round((S * perkChoice.value) / 100) };
      }
      case "fist-percent-extra": {
        const S = skillType === "fist" ? state.skill : state.fist;
        return { ...state, flat: F + Math.round((S * perkChoice.value) / 100) };
      }
      case "shield-percent-extra":
        return { ...state, flat: F + Math.round((state.shielding * perkChoice.value) / 100) };
      case "fishing-percent-extra":
        return { ...state, flat: F + Math.round((state.fishing * perkChoice.value) / 100) };
      case "magic-level-percent-extra":
        return { ...state, flat: F + Math.round((ML * perkChoice.value) / 100) };
      case "runic-mastery":
        if (spell.spellType === "rune") {
          const increaseAmount = spell.runic.includes(vocation) ? 0.2 : 0.1;
          const runicIncrease = Math.round(state.baseMagicLevel * increaseAmount);
          return { ...state, runicIncrease };
        } else return state;
      case "axe-fighting":
        if (skillType === "axe") return { ...state, skill: state.skill + perkChoice.value };
        else return { ...state, axe: state.axe + perkChoice.value };
      case "club-fighting":
        if (skillType === "club") return { ...state, skill: state.skill + perkChoice.value };
        else return { ...state, club: state.club + perkChoice.value };
      case "sword-fighting":
        if (skillType === "sword") return { ...state, skill: state.skill + perkChoice.value };
        else return { ...state, sword: state.sword + perkChoice.value };
      case "fist-fighting":
        if (skillType === "fist") return { ...state, skill: state.skill + perkChoice.value };
        else return { ...state, fist: state.fist + perkChoice.value };
      case "distance-fighting":
        if (skillType === "distance") return { ...state, skill: state.skill + perkChoice.value };
        else return { ...state, distance: state.distance + perkChoice.value };
      case "magic-level":
        return { ...state, magicLevel: ML + perkChoice.value };
      case "base-harmony-bonus":
        return { ...state, baseHarmonyBonus: perkChoice.value };
      case "armor-penetration":
        return { ...state, armorPenetration: perkChoice.value / 100 };
      case "death-pierce":
        return { ...state, deathPierce: perkChoice.value / 100 };
      case "earth-pierce":
        return { ...state, earthPierce: perkChoice.value / 100 };
      case "energy-pierce":
        return { ...state, energyPierce: perkChoice.value / 100 };
      case "fire-pierce":
        return { ...state, firePierce: perkChoice.value / 100 };
      case "holy-pierce":
        return { ...state, holyPierce: perkChoice.value / 100 };
      case "ice-pierce":
        return { ...state, icePierce: perkChoice.value / 100 };
      case "physical-pierce":
        return { ...state, physicalPierce: perkChoice.value / 100 };
      case "damage-amphibic":
        return { ...state, damageAmphibic: perkChoice.value / 100 };
      case "damage-aquatic":
        return { ...state, damageAquatic: perkChoice.value / 100 };
      case "damage-bird":
        return { ...state, damageBird: perkChoice.value / 100 };
      case "damage-construct":
        return { ...state, damageConstruct: perkChoice.value / 100 };
      case "damage-demon":
        return { ...state, damageDemon: perkChoice.value / 100 };
      case "damage-dragon":
        return { ...state, damageDragon: perkChoice.value / 100 };
      case "damage-elemental":
        return { ...state, damageElemental: perkChoice.value / 100 };
      case "damage-extra-dimensional":
        return { ...state, damageExtraDimensional: perkChoice.value / 100 };
      case "damage-fey":
        return { ...state, damageFey: perkChoice.value / 100 };
      case "damage-giant":
        return { ...state, damageGiant: perkChoice.value / 100 };
      case "damage-human":
        return { ...state, damageHuman: perkChoice.value / 100 };
      case "damage-humanoid":
        return { ...state, damageHumanoid: perkChoice.value / 100 };
      case "damage-inkborn":
        return { ...state, damageInkborn: perkChoice.value / 100 };
      case "damage-lycanthrope":
        return { ...state, damageLycanthrope: perkChoice.value / 100 };
      case "damage-magical":
        return { ...state, damageMagical: perkChoice.value / 100 };
      case "damage-mammal":
        return { ...state, damageMammal: perkChoice.value / 100 };
      case "damage-plant":
        return { ...state, damagePlant: perkChoice.value / 100 };
      case "damage-reptile":
        return { ...state, damageReptile: perkChoice.value / 100 };
      case "damage-slime":
        return { ...state, damageSlime: perkChoice.value / 100 };
      case "damage-undead":
        return { ...state, damageUndead: perkChoice.value / 100 };
      case "damage-vermin":
        return { ...state, damageVermin: perkChoice.value / 100 };
    }
  }

  return state;
}

function deriveCharacterState(buildStats: BuildStats, weaponChoice: WeaponChoice): CharacterState {
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
  const weaponAttack = (weaponChoice.weapon.attack ?? 0) + (weaponChoice.ammo?.attack ?? 0);
  const weaponDamage = weaponChoice.weapon.damage ?? 0;
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
