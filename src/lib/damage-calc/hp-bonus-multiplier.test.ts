import { describe, expect, it } from "vitest";
import { hpBonusMultiplier, type DamageMixtureComponent, type HpBasedDmgBracket } from "./hp-bonus-multiplier.ts";

describe("hpBonusMultiplier", () => {
  // 50% omega strike
  // 100 HP, one flat 10-damage hit. Hits land at 0,10,...,60 (base), then 70 -> +50% -> 85 -> dead.
  // So 9 hits total, only the hits from levels 70 and 85 are inside the bottom-30% window.
  it("works for omega strike", () => {
    const flat: DamageMixtureComponent[] = [{ weight: 1, lo: 10, hi: 10, isCharm: false }];
    const mult = hpBonusMultiplier(flat, 100, [{ from: 0.7, to: 1, bonus: 0.5 }]);
    expect(mult.spell).toBeCloseTo(1 + (0.5 * 2) / 9, 6);
  });

  // 50% alpha strike
  // 100 HP, flat 10 damage. Only the very first hit is in the alpha window, and it is
  // always exactly one hit, so the alpha count is 1 regardless of the boost.
  it("works for alpha strike", () => {
    const flat: DamageMixtureComponent[] = [{ weight: 1, lo: 10, hi: 10, isCharm: false }];
    const mult = hpBonusMultiplier(flat, 100, [{ from: 0, to: 0.05, bonus: 0.5 }]);
    expect(mult.spell).toBeCloseTo(1 + (0.5 * 1) / 10, 6);
  });

  it("variable damage works correctly", () => {
    const ranges: DamageMixtureComponent[] = [
      { weight: 0.5, lo: 3, hi: 5, isCharm: false },
      { weight: 0.5, lo: 7, hi: 9, isCharm: false },
    ];
    const brackets: HpBasedDmgBracket[] = [
      { from: 0, to: 0.05, bonus: 0.3 },
      { from: 0.7, to: 1, bonus: 1 },
    ];
    const mult = hpBonusMultiplier(ranges, 20, brackets);
    expect(mult.spell).toBeCloseTo(1.338160299, 9);
  });

  it("overlapping brackets compound multiplicatively, not additively", () => {
    const ranges: DamageMixtureComponent[] = [{ weight: 1, lo: 3, hi: 5, isCharm: false }];
    // On [0.6, 1) both brackets are active, so a hit there is scaled by 1.2 * 1.5, not 1 + 0.2 + 0.5.
    const brackets: HpBasedDmgBracket[] = [
      { from: 0.3, to: 1, bonus: 0.2 },
      { from: 0.6, to: 1, bonus: 0.5 },
    ];
    const mult = hpBonusMultiplier(ranges, 60, brackets);
    expect(mult.spell).toBeCloseTo(1.29559356909868, 9);
  });

  it("a charm never gets the opening alpha hit, but a spell does", () => {
    // 100 HP, spell and charm both flat 10 damage at 50/50. The opening hit (bucket 0) is forced to be
    // the spell, and it is the only hit inside the alpha window, so the alpha bonus lands entirely on
    // spells. Hits fall at 0,10,..,90 (10 total); spells take 1 + 9*0.5 = 5.5 of them.
    const mixture: DamageMixtureComponent[] = [
      { weight: 0.5, lo: 10, hi: 10, isCharm: false },
      { weight: 0.5, lo: 10, hi: 10, isCharm: true },
    ];
    const mult = hpBonusMultiplier(mixture, 100, [{ from: 0, to: 0.05, bonus: 0.5 }]);
    expect(mult.spell).toBeCloseTo(1 + 0.5 / 5.5, 9);
    expect(mult.charm).toBe(1); // charm never leads, so it never reaches the alpha window
  });

  it("returns 1 when no bonus / no outcomes / zero hp", () => {
    const mixture: DamageMixtureComponent[] = [
      { weight: 0.5, lo: 4, hi: 4, isCharm: false },
      { weight: 0.5, lo: 8, hi: 8, isCharm: false },
    ];
    expect(hpBonusMultiplier(mixture, 20, [{ from: 0, to: 0.05, bonus: 0 }])).toEqual({ spell: 1, charm: 1 });
    expect(hpBonusMultiplier([], 20, [{ from: 0, to: 0.05, bonus: 0 }])).toEqual({ spell: 1, charm: 1 });
    expect(hpBonusMultiplier(mixture, 0, [{ from: 0, to: 0.05, bonus: 0.1 }])).toEqual({ spell: 1, charm: 1 });
  });

  it("with no rotation, falls back to the average bonus over a uniformly random HP", () => {
    const brackets: HpBasedDmgBracket[] = [
      { from: 0, to: 0.05, bonus: 0.1 },
      { from: 0.7, to: 1, bonus: 0.025 },
    ];
    // 0.65 of the HP range gets no bonus, 0.05 gets +10%, 0.3 gets +2.5%.
    const expected = 0.65 + 0.05 * 1.1 + 0.3 * 1.025;
    const mult = hpBonusMultiplier([], 100, brackets);
    expect(mult.spell).toBeCloseTo(expected, 9);
    expect(mult.charm).toBeCloseTo(expected, 9);
  });

  it("overlapping brackets compound multiplicatively in the no-rotation fallback too", () => {
    // On [0.6, 1) both brackets are active, so that slice is scaled by 1.2 * 1.5.
    const brackets: HpBasedDmgBracket[] = [
      { from: 0.3, to: 1, bonus: 0.2 },
      { from: 0.6, to: 1, bonus: 0.5 },
    ];
    // [0,0.3): 1, [0.3,0.6): 1.2, [0.6,1): 1.2*1.5=1.8
    const expected = 0.3 * 1 + 0.3 * 1.2 + 0.4 * 1.8;
    const mult = hpBonusMultiplier([], 60, brackets);
    expect(mult.spell).toBeCloseTo(expected, 9);
  });
});
