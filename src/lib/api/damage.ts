import { spellOrdering } from "@data/spells";
import type { Build } from "@lib/build-state";
import { computeDamageFromCharms, computeDamagePerHit, computeDamagePerTurn, computeResults } from "@lib/damage-calc";
import {
  resolveCreatures,
  resolvePerks,
  resolveSpellDamages,
  resolveSpells,
  resolveStances,
  resolveWeapon,
} from "@lib/damage-calc/build-state-resolver";

export type SpellDamage = {
  id: number;
  name: string;
  raw: { min: number | null; avg: number; max: number | null };
  effective: { avg: number };
};

export type DamageResult = {
  summary: {
    effectiveDamagePerTurn: number;
    effectiveDamagePerHit: number;
    damageFromCharms: number;
  };
  spells: SpellDamage[];
};

const round = (n: number): number => (Number.isFinite(n) ? Math.round(n * 1e5) / 1e5 : 0);

export function computeDamage(build: Build): DamageResult {
  const stances = resolveStances(build.stats.stanceIds);
  const weaponChoice = resolveWeapon(build.weapon);
  const perkChoices = resolvePerks(build.perks);
  const spellChoices = resolveSpells(build.rotation);
  const creatureChoices = resolveCreatures(build.targets);

  const results = computeResults(build.stats, stances, weaponChoice, perkChoices, spellChoices, creatureChoices);
  const spellDamageChoices = resolveSpellDamages(build.rotation, results);

  const scopeOrder = spellOrdering.find((s) => s.vocation === build.stats.vocation)?.order ?? [];
  const ordered = results.toSorted((a, b) => {
    let ai = scopeOrder.indexOf(a.scope);
    let bi = scopeOrder.indexOf(b.scope);
    if (ai === -1) ai = scopeOrder.length;
    if (bi === -1) bi = scopeOrder.length;
    return ai - bi;
  });

  return {
    summary: {
      effectiveDamagePerTurn: round(computeDamagePerTurn(spellDamageChoices)),
      effectiveDamagePerHit: round(computeDamagePerHit(spellDamageChoices)),
      damageFromCharms: round(computeDamageFromCharms(spellDamageChoices)),
    },
    spells: ordered.map((r) => ({
      id: r.id,
      name: r.name,
      raw: {
        min: r.raw.min === undefined ? null : round(r.raw.min),
        avg: round(r.raw.avg),
        max: r.raw.max === undefined ? null : round(r.raw.max),
      },
      effective: {
        avg: round(r.effective.avg),
      },
    })),
  };
}
