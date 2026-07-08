import { describe, expect, it } from "vitest";
import type { SpellRawEffective } from "@data/spells.ts";
import { defaultBuild, type BuildStats } from "@lib/build-state";
import {
  resolveCreatures,
  resolvePerks,
  resolveSpellDamages,
  resolveSpells,
  resolveStances,
  resolveWeapon,
} from "./build-state-resolver.ts";
import { computeDamageFromCharms, computeDph, computeDpt, computeResults } from "./calc.ts";

// `toBeCloseTo` numDigits
const d = 1;
const base = defaultBuild();

type ExpectedResult = { name: string; effective: number; min?: number; avg: number; max?: number };

function expectResultValues(results: SpellRawEffective[], { name, effective, min, avg, max }: ExpectedResult) {
  const result = results.find((r) => r.name === name);
  expect(result, `no spell named ${name}`).toBeDefined();
  expect(result!.effective.avg).toBeCloseTo(effective, d);
  if (min === undefined) expect(result!.raw!.min).toBeUndefined();
  else expect(result!.raw!.min).toBeCloseTo(min, d);
  expect(result!.raw!.avg).toBeCloseTo(avg, d);
  if (max === undefined) expect(result!.raw!.max).toBeUndefined();
  else expect(result!.raw!.max).toBeCloseTo(max, d);
}

describe("default build", () => {
  const stances = resolveStances(base.stats.stanceIds);
  const weapon = resolveWeapon(base.weapon);
  const perks = resolvePerks(base.perks);
  const rotation = resolveSpells(base.rotation);
  const targets = resolveCreatures(base.targets);
  const results = computeResults(base.stats, stances, weapon, perks, rotation, targets);
  const spellDamageChoices = resolveSpellDamages(base.rotation, results);
  const dpt = computeDpt(spellDamageChoices);
  const dph = computeDph(spellDamageChoices);

  describe("computeResults", () => {
    it.each([
      { name: "Auto-attack", effective: 5.7, min: 3, avg: 5, max: 9 },
      { name: "Fierce Berserk", effective: 31.5, min: 22, avg: 30, max: 38 },
      { name: "Berserk", effective: 15.75, min: 11, avg: 15, max: 19 },
      { name: "Executioner's Throw (No Bonus)", effective: 21, min: 19, avg: 20, max: 22 },
      { name: "Executioner's Throw (Stage 3)", effective: 52.5, min: 48, avg: 50, max: 55 },
      { name: "Avalanche Rune", effective: 13.7, min: 8, avg: 13, max: 18 },
      { name: "Fireball Rune", effective: 16.8, min: 12, avg: 16, max: 19 },
    ])("returns expected values for $name", (expected) => expectResultValues(results, expected));
  });
  describe("computeDpt", () => {
    it("returns correct result", () => {
      expect(dpt).equals(0);
    });
  });
  describe("computeDph", () => {
    it("returns correct result", () => {
      expect(dph).equals(0);
    });
  });
});

describe("Knight build with everything", () => {
  // http://localhost:4321/tools/calculator?s=NoJgNMwIwg7GAGMUGrCJGlQMzPLCALpgBsArABwTAAs5yUAdOSXaWJW%2BVPi27mQIibaMnHCI4UizA4kk4Hg4hqi2mHggOi6njVsds6lBE0UDDFwikoJ2DkPkAnENIjRMeNlSY-2PBhNYjIqGnpGfghaDmtgHj5WCEEUM0heDMQ2aVl5LIhldANozXQdNj1OfOAjBhM06ARLBDjbe0cbFzcPaIYYsATcAXQ5MA1qd2SmsjtQ5xJMIiA
  const stats: BuildStats = {
    ...base.stats,
    vocation: "knight",
    level: 1000,
    bonus: 20,
    skill: 200,
    magicLevel: 13,
    critChance: 12,
    critDamage: 72,
  };
  const stances = resolveStances(stats.stanceIds);
  const weapon = resolveWeapon({ id: 658 });
  const perks = resolvePerks([
    { id: 45, value: 11.5 },
    { id: 46, value: 8 },
    { id: 51, value: 12.5 },
    { id: 13, value: 10 },
  ]);
  const rotation = resolveSpells([
    { id: 1, targets: 1, ratio: 1, extraSpell: false },
    { id: 2, targets: 6.5, ratio: 30, extraSpell: false },
    { id: 3, targets: 6, ratio: 28, extraSpell: false },
    { id: 4, targets: 7, ratio: 26, extraSpell: false },
    { id: 8, targets: 3, ratio: 8, extraSpell: false },
    { id: 6, targets: 0.5, ratio: 8, extraSpell: true },
  ]);
  const targets = resolveCreatures([
    { id: 105, ratio: 208, charmId: 5, charmTier: 2 },
    { id: 618, ratio: 173 },
    { id: 659, ratio: 106 },
  ]);
  const results = computeResults(stats, stances, weapon, perks, rotation, targets);
  const spellDamageChoices = resolveSpellDamages(rotation, results);
  const dpt = computeDpt(spellDamageChoices);
  const dph = computeDph(spellDamageChoices);
  const dmgFromCharms = computeDamageFromCharms(spellDamageChoices);

  describe("computeResults", () => {
    it.each([
      { name: "Auto-attack", effective: 733.6, min: 454, avg: 705, max: 1208 },
      { name: "Fierce Berserk", effective: 1417.0, min: 1142, avg: 1439, max: 1735 },
      { name: "Berserk", effective: 700.4, min: 602, avg: 744, max: 887 },
      { name: "Executioner's Throw (No Bonus)", effective: 892.9, min: 875, avg: 934, max: 993 },
      { name: "Executioner's Throw (Stage 3)", effective: 2312.8, min: 2188, avg: 2335, max: 2483 },
      { name: "Avalanche Rune", effective: 221.1, min: 226, avg: 241, max: 256 },
      { name: "Fireball Rune", effective: 52.4, min: 237, avg: 249, max: 260 },
    ])("returns expected values for $name", (expected) => expectResultValues(results, expected));
  });
  describe("computeDpt", () => {
    it("returns correct result", () => {
      expect(dpt).toBeCloseTo(6834.4, d);
    });
  });
  describe("computeDph", () => {
    it("returns correct result", () => {
      expect(dph).toBeCloseTo(939.9, d);
    });
  });
  describe("computeDamageFromCharms", () => {
    it("returns correct result", () => {
      expect(dmgFromCharms).toBeCloseTo(40.9, d);
    });
  });

  describe("AOE auto-attack", () => {
    const aoeRotation = resolveSpells([
      { id: 1, targets: 4, ratio: 1, extraSpell: false },
      { id: 2, targets: 6.5, ratio: 30, extraSpell: false },
      { id: 3, targets: 6, ratio: 28, extraSpell: false },
      { id: 4, targets: 7, ratio: 26, extraSpell: false },
      { id: 8, targets: 3, ratio: 8, extraSpell: false },
      { id: 6, targets: 0.5, ratio: 8, extraSpell: true },
    ]);
    const aoeResults = computeResults(stats, stances, weapon, perks, aoeRotation, targets);
    const aoeSpellDamageChoices = resolveSpellDamages(aoeRotation, aoeResults);

    it("only triggers charms on the main target", () => {
      expect(computeDamageFromCharms(aoeSpellDamageChoices)).toBeCloseTo(dmgFromCharms, d);
      const autoAttackAvg = aoeSpellDamageChoices.find((s) => s.id === 1)!.spellDamage.effective.avg;
      expect(computeDpt(aoeSpellDamageChoices)).toBeCloseTo(dpt + 3 * autoAttackAvg, d);
    });

    it("applies low blow to all targets", () => {
      const lowBlowTargets = resolveCreatures([
        { id: 105, ratio: 208, charmId: 1, charmTier: 2 },
        { id: 618, ratio: 173 },
        { id: 659, ratio: 106 },
      ]);
      const baseChoices = resolveSpellDamages(
        rotation,
        computeResults(stats, stances, weapon, perks, rotation, lowBlowTargets),
      );
      const aoeChoices = resolveSpellDamages(
        aoeRotation,
        computeResults(stats, stances, weapon, perks, aoeRotation, lowBlowTargets),
      );

      const effective = aoeChoices.find((s) => s.id === 1)!.spellDamage.effective;
      expect(computeDamageFromCharms(aoeChoices)).toBeCloseTo(
        computeDamageFromCharms(baseChoices) + 3 * effective.critCharmDmg,
        d,
      );
      const baseEffective = baseChoices.find((s) => s.id === 1)!.spellDamage.effective;
      expect(effective.critCharmDmg).toBeGreaterThan(0);
      expect(effective.critCharmDmg).toBeCloseTo(baseEffective.critCharmDmg, d);
      expect(effective.avg).toBeCloseTo(baseEffective.avg, d);
      expect(computeDpt(aoeChoices)).toBeCloseTo(computeDpt(baseChoices) + 3 * effective.avg, d);
    });
  });
});

describe("UE spells", () => {
  const stats: BuildStats = {
    ...base.stats,
    vocation: "sorcerer",
    level: 1000,
    bonus: 20,
    skill: 10,
    magicLevel: 150,
    critChance: 0,
    critDamage: 0,
  };
  const stances = resolveStances(stats.stanceIds);
  const weapon = resolveWeapon({ id: 801 });
  const perks = resolvePerks([]);

  describe("UE only", () => {
    const rotation = resolveSpells([{ id: 23, targets: 1, ratio: 1, extraSpell: false }]);
    const targets = resolveCreatures([{ id: 813, ratio: 1 }]);
    const results = computeResults(stats, stances, weapon, perks, rotation, targets);
    const spellDamageChoices = resolveSpellDamages(rotation, results);
    const dpt = computeDpt(spellDamageChoices);
    const dph = computeDph(spellDamageChoices);
    const dmgFromCharms = computeDamageFromCharms(spellDamageChoices);
    describe("computeResults", () => {
      it.each([{ name: "Hell's Core", effective: 1731.5, min: 1453, avg: 1765, max: 2078 }])(
        "returns expected values for $name",
        (expected) => expectResultValues(results, expected),
      );
    });
    describe("computeDpt", () => {
      it("returns correct result", () => {
        expect(dpt).toBeCloseTo(865.7, d);
      });
    });
    describe("computeDph", () => {
      it("returns correct result", () => {
        expect(dph).toBeCloseTo(1731.5, d);
      });
    });
    describe("computeDamageFromCharms", () => {
      it("returns correct result", () => {
        expect(dmgFromCharms).toBeCloseTo(0, d);
      });
    });
  });
  describe("UE, AA, spell", () => {
    const rotation = resolveSpells([
      { id: 1, targets: 1, ratio: 1, extraSpell: false },
      { id: 21, targets: 2, ratio: 1, extraSpell: false },
      { id: 23, targets: 2, ratio: 1, extraSpell: false },
    ]);
    const targets = resolveCreatures([{ id: 813, ratio: 1 }]);
    const results = computeResults(stats, stances, weapon, perks, rotation, targets);
    const spellDamageChoices = resolveSpellDamages(rotation, results);
    const dpt = computeDpt(spellDamageChoices);
    const dph = computeDph(spellDamageChoices);
    describe("computeDpt", () => {
      it("returns correct result", () => {
        expect(dpt).toBeCloseTo(1971.8, d);
      });
    });
    describe("computeDph", () => {
      it("returns correct result", () => {
        expect(dph).toBeCloseTo(985.9, d);
      });
    });
  });
});
