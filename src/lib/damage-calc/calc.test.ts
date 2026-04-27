import { describe, expect, it } from "vitest";
import { defaultBuild } from "@lib/build-state";
import { resolveCreatures, resolvePerks, resolveWeapon } from "./build-state-resolver.ts";
import { computeResults } from "./calc.ts";

describe("computeResults", () => {
  const base = defaultBuild();
  const weapon = resolveWeapon(base.weapon);
  const perks = resolvePerks(base.perks);
  const targets = resolveCreatures(base.targets);

  it("returns a spell list for a default knight build", () => {
    const results = computeResults(base.stats, weapon, perks, targets);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].avg).toBeGreaterThan(0);
  });

  it("produces higher average damage when skill is raised", () => {
    const lowSkill = computeResults(base.stats, weapon, perks, targets);
    const highSkill = computeResults({ ...base.stats, skill: 100 }, weapon, perks, targets);

    expect(highSkill[0].avg).toBeGreaterThan(lowSkill[0].avg);
  });
});
