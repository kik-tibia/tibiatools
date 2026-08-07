import { allBestiaryClasses, initBestiaryDamage, type BestiaryClass } from "@data/creatures";
import { allPerks, bestiaryDamageBonusType, type Perk, type PerkBonusType, type PierceKind } from "@data/perks.ts";
import {
  allElements,
  allSpells,
  type DamageEffective,
  type Element,
  type Spell,
  type SpellElement,
  type SpellRawBreakdown,
  type SpellRawEffective,
} from "@data/spells";
import type { Stance } from "@data/stances.ts";
import { type SkillType, type Weapon } from "@data/weapons";
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
import { calculateElementalCharmDmg, computeDamageBreakdown, computeRaw, initElements } from "./damage.ts";
import { hpBonusMultiplier, type DamageMixtureComponent, type HpBasedDmgBracket } from "./hp-bonus.ts";

const AUTO_ATTACK_ID = 1;

const spellScopeById = new Map(allSpells.map((s) => [s.id, s.scope]));

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
): SpellRawEffective[] {
  const effectivePerks = [...perkChoices, ...stancePerks(stances, perkChoices)].sort(
    (a, b) => a.perk.priority - b.perk.priority,
  );
  const characterPerks = effectivePerks.filter((p) => p.perk.scope == "character");
  const spellPerks = effectivePerks.filter((p) => p.perk.scope != "character");

  const characterState = deriveCharacterState(buildStats, weaponChoice, characterPerks);

  const spellStates = allSpells
    .filter((s) => s.vocations.includes(buildStats.vocation))
    .map((spell) => {
      const initial: SpellState = initialSpellState(characterState, spell);
      let spellState: SpellState = spellPerks.reduce(
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

  let results: SpellRawEffective[] = [];

  // Brackets for alpha/omega strike
  const hpBasedDmgBrackets = buildHpBasedDmgBrackets(characterPerks, weaponChoice.weapon);

  if (ratioAdjustedHp > 0) {
    let masteryElement: SpellElement | undefined;
    if (stances.some((s) => s.effect == "master-of-flames")) {
      masteryElement = "fire";
    } else if (stances.some((s) => s.effect == "master-of-thunder")) {
      masteryElement = "energy";
    } else if (stances.some((s) => s.effect == "master-of-decay")) {
      masteryElement = "death";
    }
    // for each creature, weight its spell damages by that creature's share of total HP and accumulate
    results = creatureChoices.reduce((acc: SpellRawEffective[], creatureChoice) => {
      const multiplier = (creatureChoice.ratio * creatureChoice.creature.hitpoints) / ratioAdjustedHp;

      // calculate all of the spell damages to this creature
      let spellDamages: SpellRawBreakdown[] = spellStates.map((spellState) => {
        const breakdown = computeDamageBreakdown(
          spellState,
          buildStats,
          weaponChoice,
          spellChoices,
          creatureChoice,
          masteryElement,
        );
        const raw = computeRaw(spellState, buildStats);
        return { ...spellState.spell, raw, breakdown };
      });

      // Apply alpha/omega strike
      spellDamages = applyHpBasedDmgBonuses(
        spellDamages,
        spellChoices,
        buildStats,
        characterState,
        hpBasedDmgBrackets,
        creatureChoice,
      );

      // The first creature contributes raw and its weighted effective
      if (acc.length == 0) {
        return spellDamages.map(({ breakdown, ...rest }) => ({
          ...rest,
          effective: weighEffective(breakdown.effective, multiplier),
        }));
      }
      // every later creature only adds its weighted effective on top
      return acc.map((accSd, i) => ({
        ...accSd,
        effective: addEffective(accSd.effective, weighEffective(spellDamages[i].breakdown.effective, multiplier)),
      }));
    }, []);
  } else {
    results = spellStates.map((spellState) => {
      const breakdown = computeDamageBreakdown(spellState, buildStats, weaponChoice, spellChoices);
      const raw = computeRaw(spellState, buildStats);
      return { ...spellState.spell, raw, effective: breakdown.effective };
    });
    results = applyHpBasedDmgBonusesBasic(results, hpBasedDmgBrackets);
  }

  if (!weaponChoice.shield) {
    results = results.map((r) =>
      r.scalesWith === "shielding"
        ? { ...r, raw: { min: 0, avg: 0, max: 0 }, effective: { avg: 0, elementalCharmDmg: 0, critCharmDmg: 0 } }
        : r,
    );
  }
  return results;
}

function stancePerks(stances: Stance[], currentPerks: PerkChoice[]): PerkChoice[] {
  const extraPerks: PerkChoice[] = [];

  function pushPerk(value: number, predicate: (p: Perk) => boolean) {
    const perk = allPerks.find(predicate);
    if (perk) {
      extraPerks.push({ id: perk.id, value, perk });
    }
  }

  if (stances.some((s) => s.effect == "expose-weakness")) {
    allElements.forEach((element) => pushPerk(8, (p) => p.bonusType == `${element}-pierce-regular`));
  }

  const lodPerkStage = currentPerks.find((p) => p.perk.bonusType == "lord-of-destruction")?.value ?? 0;
  if (stances.some((s) => s.effect == "master-of-flames")) {
    const lodBonuses = [0, 2, 3, 4];
    const value = 4 + (lodBonuses[lodPerkStage] ?? 0);
    pushPerk(value, (p) => p.scope == "fire" && p.bonusType == "base-damage");
  }
  if (stances.some((s) => s.effect == "master-of-thunder")) {
    const lodBonuses = [0, 2, 3, 4];
    const value = 4 + (lodBonuses[lodPerkStage] ?? 0);
    pushPerk(value, (p) => p.scope == "energy" && p.bonusType == "crit-chance");
  }
  if (stances.some((s) => s.effect == "master-of-decay")) {
    const lodBonuses = [0, 15, 22.5, 30];
    const value = 30 + (lodBonuses[lodPerkStage] ?? 0);
    pushPerk(value, (p) => p.scope == "death" && p.bonusType == "crit-damage");
  }

  return extraPerks;
}

function initialSpellState(characterState: CharacterState, spell: Spell): SpellState {
  // Shallow copy: every spell state shares the same pierceRegular/pierceWeapon/bestiaryDamage records,
  // so a per-spell change must replace the record ({ ...state.pierceRegular }), never mutate it
  return {
    ...characterState,
    spell,
    basePower: spell.power,
    runicIncrease: 0,
    focusMasteryIncrease: 0,
  };
}

function buildHpBasedDmgBrackets(perkChoices: PerkChoice[], weapon: Weapon): HpBasedDmgBracket[] {
  const brackets: HpBasedDmgBracket[] = [];

  const alpha = perkChoices.find((p) => p.perk.bonusType === "alpha-strike");
  if (alpha && alpha.value > 0) brackets.push({ from: 0, to: 0.05, bonus: alpha.value / 100 });

  const omega = perkChoices.find((p) => p.perk.bonusType === "omega-strike");
  if (omega && omega.value > 0) brackets.push({ from: 0.7, to: 1, bonus: omega.value / 100 });

  const combatMastery = perkChoices.find((p) => p.perk.bonusType === "combat-mastery");
  if (combatMastery && combatMastery.value > 0) {
    const cmBonus = weapon.hands == "two" ? 2 : 1;
    const missingHpPerStep = combatMastery.value === 1 ? 0.14 : combatMastery.value === 2 ? 0.12 : 0.1;
    for (let step = 1; step * missingHpPerStep < 1; step++) {
      brackets.push({
        from: step * missingHpPerStep,
        to: Math.min(1, (step + 1) * missingHpPerStep),
        bonus: (step * cmBonus) / 100,
      });
    }
  }

  return brackets;
}

// Scale every spell's effective damage by the multiplier for all HP-based damage perks against this creature
function applyHpBasedDmgBonuses(
  spellDamages: SpellRawBreakdown[],
  spellChoices: SpellChoice[],
  buildStats: BuildStats,
  characterState: CharacterState,
  brackets: HpBasedDmgBracket[],
  creatureChoice?: CreatureChoice,
): SpellRawBreakdown[] {
  if (brackets.length === 0) return spellDamages;

  const spellDamageById = new Map(spellDamages.map((sd) => [sd.id, sd]));
  let mixture: DamageMixtureComponent[] = [];
  if (creatureChoice) {
    mixture = buildDamageMixture(spellChoices, creatureChoice, buildStats, characterState, spellDamageById);
  }
  const creatureHp = creatureChoice?.creature.hitpoints ?? 0;
  const multiplier = hpBonusMultiplier(mixture, creatureHp, brackets);

  // Apply multiplier to every spell
  return spellDamages.map((sd) => ({
    ...sd,
    breakdown: {
      ...sd.breakdown,
      effective: {
        elementalCharmDmg: sd.breakdown.effective.elementalCharmDmg * multiplier.charm,
        avg: sd.breakdown.effective.avg * multiplier.spell,
        critCharmDmg: sd.breakdown.effective.critCharmDmg * multiplier.spell,
      },
    },
  }));
}

// Basic version of above where we don't use rotation/targets
function applyHpBasedDmgBonusesBasic(
  spellDamages: SpellRawEffective[],
  brackets: HpBasedDmgBracket[],
): SpellRawEffective[] {
  if (brackets.length === 0) return spellDamages;

  const multiplier = hpBonusMultiplier([], 0, brackets);

  // Apply multiplier to every spell
  return spellDamages.map((sd) => ({
    ...sd,
    effective: {
      elementalCharmDmg: sd.effective.elementalCharmDmg * multiplier.charm,
      avg: sd.effective.avg * multiplier.spell,
      critCharmDmg: sd.effective.critCharmDmg * multiplier.spell,
    },
  }));
}
function buildDamageMixture(
  spellChoices: SpellChoice[],
  creatureChoice: CreatureChoice,
  buildStats: BuildStats,
  characterState: CharacterState,
  spellDamageById: Map<number, SpellRawBreakdown>,
): DamageMixtureComponent[] {
  const spellRotation = spellChoices.filter((s) => s.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);
  const fullRotation = spellChoices.map((s) => (s.id === AUTO_ATTACK_ID ? { ...s, ratio: ratioSum || 1 } : s));
  const ratioTargetSum = fullRotation.reduce((sum, s) => sum + s.targets * s.ratio, 0);

  const mixture: DamageMixtureComponent[] = [];

  // TODO: charm charm-upgrade
  const charmDamage = calculateElementalCharmDmg(creatureChoice, buildStats, characterState);
  if (creatureChoice.charm && creatureChoice.charmTier && charmDamage > 0) {
    let charmChance = characterState.charmUpgrade;
    switch (creatureChoice.charmTier) {
      case 1:
        charmChance += 0.05;
        break;
      case 2:
        charmChance += 0.1;
        break;
      case 3:
        charmChance += 0.11;
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
  const ratioSum = spellRotation
    .filter((s) => !s.extraSpell)
    .reduce((sum, r) => sum + r.ratio * r.spellDamage.turnCooldown, 0);
  const aaRatioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);

  const autoAttack = spellDamageChoices.find((s) => s.id === AUTO_ATTACK_ID);
  const aaRatio = ratioSum > 0 ? aaRatioSum / ratioSum : 1;
  const autoAttackDamage = autoAttack
    ? aaRatio *
      (autoAttack.spellDamage.effective.avg + autoAttack.spellDamage.effective.elementalCharmDmg) *
      autoAttack.targets
    : 0;

  return (
    autoAttackDamage +
    spellRotation.reduce((damage, s) => {
      const weightedDamage =
        ratioSum > 0
          ? ((s.spellDamage.effective.avg + s.spellDamage.effective.elementalCharmDmg) * s.targets * s.ratio) / ratioSum
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
      const weightedDamage = s.spellDamage.effective.avg * s.targets * s.ratio;
      return damage + weightedDamage;
    }, 0) / ratioTargetSum
  );
}

export function computeDamageFromCharms(spellDamageChoices: SpellDamageChoice[]): number {
  const spellRotation = spellDamageChoices.filter((s) => s.id !== AUTO_ATTACK_ID);
  const ratioSum = spellRotation.filter((s) => !s.extraSpell).reduce((sum, r) => sum + r.ratio, 0);

  const autoAttack = spellDamageChoices.find((s) => s.id === AUTO_ATTACK_ID);
  const autoAttackDamage = autoAttack
    ? (autoAttack.spellDamage.effective.critCharmDmg + autoAttack.spellDamage.effective.elementalCharmDmg) *
      autoAttack.targets
    : 0;

  return (
    autoAttackDamage +
    spellRotation.reduce((damage, s) => {
      const weightedDamage =
        ratioSum > 0
          ? ((s.spellDamage.effective.critCharmDmg + s.spellDamage.effective.elementalCharmDmg) * s.targets * s.ratio) /
            ratioSum
          : 0;
      return damage + weightedDamage;
    }, 0)
  );
}

function weighEffective(e: DamageEffective, multiplier: number): DamageEffective {
  return {
    avg: e.avg * multiplier,
    critCharmDmg: e.critCharmDmg * multiplier,
    elementalCharmDmg: e.elementalCharmDmg * multiplier,
  };
}

function addEffective(a: DamageEffective, b: DamageEffective): DamageEffective {
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
    perkChoice.perk.scope === spell.scope ||
    perkChoice.perk.scope === spell.spellType ||
    perkChoice.perk.scope === spell.element ||
    perkChoice.perk.scope === spell.scalesWith
  ) {
    const homingElement = homingMissileElements.get(perkChoice.perk.bonusType);
    if (homingElement) {
      const existing = state.homingMissiles.find((m) => m.element === homingElement);
      const homingMissiles = existing
        ? state.homingMissiles.map((m) =>
            m.element === homingElement ? { ...m, levelDamage: m.levelDamage + perkChoice.value / 100 } : m,
          )
        : [...state.homingMissiles, { element: homingElement, chance: 0.01, levelDamage: perkChoice.value / 100 }];
      return { ...state, homingMissiles };
    }
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
      case "focus-mastery": {
        const focusScope = spellScopeById.get(perkChoice.value);
        const focusMasteryIncrease = focusScope && state.spell.scope == focusScope ? 0.35 : 0;
        return {
          ...state,
          focusMasteryIncrease,
          spell: { ...state.spell, turnCooldown: 1 },
        };
      }
      case "hit-chance":
        return { ...state, extraHitChance: state.extraHitChance + perkChoice.value / 100 };
    }
  }

  return state;
}

type NumericCharacterField = {
  [K in keyof CharacterState]: CharacterState[K] extends number ? K : never;
}[keyof CharacterState];

// Character perks that add value to a flat CharacterState field
const characterBonuses: Partial<Record<PerkBonusType, NumericCharacterField>> = {
  "axe-fighting": "axe",
  "club-fighting": "club",
  "sword-fighting": "sword",
  "fist-fighting": "fist",
  "distance-fighting": "distance",
  "magic-level": "magicLevel",
};
// Character perks that add value/100 to a flat CharacterState field
const characterPercentBonuses: Partial<Record<PerkBonusType, NumericCharacterField>> = {
  "crit-damage": "critDamage",
  "crit-chance": "critChance",
  "armor-penetration": "armorPenetration",
  "charm-upgrade": "charmUpgrade",
};

const pierceBonuses = new Map<PerkBonusType, { kind: PierceKind; element: Element }>();
for (const element of allElements) {
  pierceBonuses.set(`${element}-pierce-regular`, { kind: "pierceRegular", element });
  pierceBonuses.set(`${element}-pierce-weapon`, { kind: "pierceWeapon", element });
}

const homingMissileElements = new Map<PerkBonusType, Element>();
for (const element of allElements) {
  homingMissileElements.set(`homing-missile-${element}`, element);
}

const bestiaryDamageBonuses = new Map<PerkBonusType, BestiaryClass>();
for (const bestiaryClass of allBestiaryClasses) {
  bestiaryDamageBonuses.set(bestiaryDamageBonusType(bestiaryClass), bestiaryClass);
}

function deriveCharacterState(
  buildStats: BuildStats,
  weaponChoice: WeaponChoice,
  characterPerks: PerkChoice[],
): CharacterState {
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
  const shieldDef = weaponChoice.shield?.defense ?? 0;
  const characterState: CharacterState = {
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
    shieldDef,
    baseHarmonyBonus: 0,
    armorPenetration: 0,
    pierceRegular: initElements(),
    pierceWeapon: initElements(),
    bestiaryDamage: initBestiaryDamage(),
    charmUpgrade: 0,
    homingMissiles: [],
    extraHitChance: 0,
  };

  const skillType = weaponChoice.weapon.skill;

  characterPerks.forEach((p) => {
    if (p.perk.bonusType == "base-harmony-bonus") {
      characterState.baseHarmonyBonus += p.value;
      return;
    }
    const pierce = pierceBonuses.get(p.perk.bonusType);
    if (pierce) {
      characterState[pierce.kind][pierce.element] += p.value / 100;
      return;
    }
    const bestiaryClass = bestiaryDamageBonuses.get(p.perk.bonusType);
    if (bestiaryClass) {
      characterState.bestiaryDamage[bestiaryClass] += p.value / 100;
      return;
    }
    const percentBonusField = characterPercentBonuses[p.perk.bonusType];
    if (percentBonusField) {
      characterState[percentBonusField] += p.value / 100;
      return;
    }
    if (p.perk.bonusType == "axe-fighting") {
      if (skillType == "axe") characterState.skill += p.value;
      else characterState.axe += p.value;
      return;
    }
    if (p.perk.bonusType == "club-fighting") {
      if (skillType == "club") characterState.skill += p.value;
      else characterState.club += p.value;
      return;
    }
    if (p.perk.bonusType == "sword-fighting") {
      if (skillType == "sword") characterState.skill += p.value;
      else characterState.sword += p.value;
      return;
    }
    if (p.perk.bonusType == "distance-fighting") {
      if (skillType == "distance") characterState.skill += p.value;
      else characterState.distance += p.value;
      return;
    }
    if (p.perk.bonusType == "fist-fighting") {
      if (skillType == "fist") characterState.skill += p.value;
      else characterState.fist += p.value;
      return;
    }
    if (p.perk.bonusType == "magic-level") {
      characterState.magicLevel += p.value;
      return;
    }
    const bonusField = characterBonuses[p.perk.bonusType];
    if (bonusField) characterState[bonusField] += p.value;
  });
  return characterState;
}
