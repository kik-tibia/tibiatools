import { describe, expect, it } from "vitest";
import { hpBonusMultiplier, type DamageMixtureComponent } from "./hp-bonus.ts";

describe("hpBonusMultiplier", () => {
  const mixture: DamageMixtureComponent[] = [
    { weight: 0.5, lo: 4, hi: 4 },
    { weight: 0.5, lo: 8, hi: 8 },
  ];

  it("alpha only: E[K_A]=1, E[N]=3.5625 -> 1 + 0.1*1/3.5625", () => {
    const mult = hpBonusMultiplier(mixture, 20, [{ from: 0, to: 0.05, bonus: 0.1 }]);
    expect(mult).toBeCloseTo(1 + (0.1 * 1) / 3.5625, 6);
  });

  it("omega only: E[K_O]=0.6875, E[N]=3.5625", () => {
    const mult = hpBonusMultiplier(mixture, 20, [{ from: 0.7, to: 1, bonus: 0.025 }]);
    expect(mult).toBeCloseTo(1 + (0.025 * 0.6875) / 3.5625, 6);
  });

  it("range example 3-5 / 7-9: E[N]=U[19]=3.80944", () => {
    const ranges: DamageMixtureComponent[] = [
      { weight: 0.5, lo: 3, hi: 5 },
      { weight: 0.5, lo: 7, hi: 9 },
    ];
    // E[K_O] = U[19] - U[13] = 3.80944 - 2.81867 = 0.99077 (note: U[19], not U[20])
    const mult = hpBonusMultiplier(ranges, 20, [{ from: 0.7, to: 1, bonus: 1 }]);
    expect(mult).toBeCloseTo(1 + (3.80944 - 2.81867) / 3.80944, 4);
  });

  it("returns 1 when no bonus / no outcomes / zero hp", () => {
    expect(hpBonusMultiplier(mixture, 20, [{ from: 0, to: 0.05, bonus: 0 }])).toBe(1);
    expect(hpBonusMultiplier([], 20, [{ from: 0, to: 0.05, bonus: 0.1 }])).toBe(1);
    expect(hpBonusMultiplier(mixture, 0, [{ from: 0, to: 0.05, bonus: 0.1 }])).toBe(1);
  });
});
