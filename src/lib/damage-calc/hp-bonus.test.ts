import { describe, expect, it } from "vitest";
import { hpBonusMultiplier, type DamageMixtureComponent, type HpBasedDmgBracket } from "./hp-bonus.ts";

describe("hpBonusMultiplier", () => {
  // 50% omega strike
  // 100 HP, one flat 10-damage hit. Hits land at 0,10,...,60 (base), then 70 -> +50% -> 85 -> dead.
  // So 9 hits total, only the hits from levels 70 and 85 are inside the bottom-30% window.
  it("works for omega strike", () => {
    const flat: DamageMixtureComponent[] = [{ weight: 1, lo: 10, hi: 10 }];
    const mult = hpBonusMultiplier(flat, 100, [{ from: 0.7, to: 1, bonus: 0.5 }]);
    expect(mult).toBeCloseTo(1 + (0.5 * 2) / 9, 6);
  });

  // 50% alpha strike
  // 100 HP, flat 10 damage. Only the very first hit is in the alpha window, and it is
  // always exactly one hit, so the alpha count is 1 regardless of the boost.
  it("works for alpha strike", () => {
    const flat: DamageMixtureComponent[] = [{ weight: 1, lo: 10, hi: 10 }];
    const mult = hpBonusMultiplier(flat, 100, [{ from: 0, to: 0.05, bonus: 0.5 }]);
    expect(mult).toBeCloseTo(1 + (0.5 * 1) / 10, 6);
  });

  it("variable damage works correctly", () => {
    const ranges: DamageMixtureComponent[] = [
      { weight: 0.5, lo: 3, hi: 5 },
      { weight: 0.5, lo: 7, hi: 9 },
    ];
    const brackets: HpBasedDmgBracket[] = [
      { from: 0, to: 0.05, bonus: 0.3 },
      { from: 0.7, to: 1, bonus: 1 },
    ];
    const mult = hpBonusMultiplier(ranges, 20, brackets);
    expect(mult).toBeCloseTo(1.338160299, 9);
  });

  it("overlapping brackets compound multiplicatively, not additively", () => {
    const ranges: DamageMixtureComponent[] = [{ weight: 1, lo: 3, hi: 5 }];
    // On [0.6, 1) both brackets are active, so a hit there is scaled by 1.2 * 1.5, not 1 + 0.2 + 0.5.
    const brackets: HpBasedDmgBracket[] = [
      { from: 0.3, to: 1, bonus: 0.2 },
      { from: 0.6, to: 1, bonus: 0.5 },
    ];
    const mult = hpBonusMultiplier(ranges, 60, brackets);
    expect(mult).toBeCloseTo(1.29559356909868, 9);
  });

  it("returns 1 when no bonus / no outcomes / zero hp", () => {
    const mixture: DamageMixtureComponent[] = [
      { weight: 0.5, lo: 4, hi: 4 },
      { weight: 0.5, lo: 8, hi: 8 },
    ];
    expect(hpBonusMultiplier(mixture, 20, [{ from: 0, to: 0.05, bonus: 0 }])).toBe(1);
    expect(hpBonusMultiplier([], 20, [{ from: 0, to: 0.05, bonus: 0.1 }])).toBe(1);
    expect(hpBonusMultiplier(mixture, 0, [{ from: 0, to: 0.05, bonus: 0.1 }])).toBe(1);
  });
});
