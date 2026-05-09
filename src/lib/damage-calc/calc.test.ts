import { describe, expect, it } from "vitest";
import { defaultBuild, type BuildStats } from "@lib/build-state";
import {
  resolveCreatures,
  resolvePerks,
  resolveSpellDamages,
  resolveSpells,
  resolveWeapon,
} from "./build-state-resolver.ts";
import { computeDph, computeDpt, computeResults } from "./calc.ts";

// `toBeCloseTo` numDigits
const d = 1;

describe("default build", () => {
  const base = defaultBuild();
  const weapon = resolveWeapon(base.weapon);
  const perks = resolvePerks(base.perks);
  const rotation = resolveSpells(base.rotation);
  const targets = resolveCreatures(base.targets);
  const results = computeResults(base.stats, weapon, perks, rotation, targets);
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
      { name: "Fireball Rune", effective: 16.8, min: undefined, avg: 16, max: undefined },
    ])("returns expected values for $name", ({ name, effective, min, avg, max }) => {
      const result = results.find((r) => r.name === name);
      expect(result, `no spell named ${name}`).toBeDefined();
      expect(result!.effectiveAvg).toBeCloseTo(effective, d);
      if (min === undefined) expect(result!.min).toBeUndefined();
      else expect(result!.min).toBeCloseTo(min, d);
      expect(result!.avg).toBeCloseTo(avg, d);
      if (max === undefined) expect(result!.max).toBeUndefined();
      else expect(result!.max).toBeCloseTo(max, d);
    });
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
    ...defaultBuild().stats,
    vocation: "knight",
    level: 1000,
    bonus: 20,
    skill: 200,
    magicLevel: 13,
    critChance: 12,
    critDamage: 72,
  };
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
    { id: 105, ratio: 208 },
    { id: 618, ratio: 173 },
    { id: 659, ratio: 106 },
  ]);
  const results = computeResults(stats, weapon, perks, rotation, targets);
  const spellDamageChoices = resolveSpellDamages(rotation, results);
  const dpt = computeDpt(spellDamageChoices);
  const dph = computeDph(spellDamageChoices);

  describe("computeResults", () => {
    it.each([
      { name: "Auto-attack", effective: 742.4, min: 454, avg: 705, max: 1208 },
      { name: "Fierce Berserk", effective: 1434.4, min: 1142, avg: 1439, max: 1735 },
      { name: "Berserk", effective: 709, min: 602, avg: 744, max: 887 },
      { name: "Executioner's Throw (No Bonus)", effective: 903.9, min: 875, avg: 934, max: 993 },
      { name: "Executioner's Throw (Stage 3)", effective: 2341.2, min: 2188, avg: 2335, max: 2483 },
      { name: "Avalanche Rune", effective: 223.8, min: 226, avg: 241, max: 256 },
      { name: "Fireball Rune", effective: 53, min: undefined, avg: 249, max: undefined },
    ])("returns expected values for $name", ({ name, effective, min, avg, max }) => {
      const result = results.find((r) => r.name === name);
      expect(result, `no spell named ${name}`).toBeDefined();
      expect(result!.effectiveAvg).toBeCloseTo(effective, d);
      if (min === undefined) expect(result!.min).toBeUndefined();
      else expect(result!.min).toBeCloseTo(min, d);
      expect(result!.avg).toBeCloseTo(avg, d);
      if (max === undefined) expect(result!.max).toBeUndefined();
      else expect(result!.max).toBeCloseTo(max, d);
    });
  });
  describe("computeDpt", () => {
    it("returns correct result", () => {
      expect(dpt).toBeCloseTo(6876.8, d);
    });
  });
  describe("computeDph", () => {
    it("returns correct result", () => {
      expect(dph).toBeCloseTo(951.4, d);
    });
  });
});
