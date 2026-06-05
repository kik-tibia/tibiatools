// There will be one of these for every spell and crit state
export type DamageMixtureComponent = { weight: number; lo: number; hi: number };

// From and to range from 0 (full hp) to 1 (dead).
// E.g. for alpha strike it would be { from: 0, to: 0.05, bonus: 0.1 }
export type HpBasedDmgBracket = {
  from: number;
  to: number;
  bonus: number;
};

// Optimisation for high HP targets: we limit the number of buckets in U (which is defined further down)
const maxBuckets = 4096;

//Average damage multiplier for HP based damage perks against a single target
export function hpBonusMultiplier(
  mixture: DamageMixtureComponent[],
  hp: number,
  brackets: HpBasedDmgBracket[],
): number {
  if (hp <= 0 || mixture.length == 0 || brackets.every((b) => b.bonus == 0)) return 1;

  let totalWeight = 0;
  for (const m of mixture) totalWeight += m.weight;
  if (totalWeight <= 0) return 1;

  const bucketSize = Math.ceil(hp / maxBuckets);
  const nBuckets = Math.round(hp / bucketSize);
  const normalisedMixture: DamageMixtureComponent[] = mixture
    .filter((m) => m.weight > 0)
    .map((m) => {
      const lo = Math.max(1, Math.round(m.lo / bucketSize)); // Always do at least 1 dmg to not break the recurrence
      const hi = Math.max(lo, Math.round(m.hi / bucketSize));
      return { weight: m.weight / totalWeight, lo, hi };
    });
  if (normalisedMixture.length == 0) return 1;

  // U[T] is the expected number of hits needed to push the cumulative damage strictly above T.
  // So for example, U[100] = expected number of hits to deal more than 100 cumulative damage, including the hit that breaks through.
  // P is just a computational helper. P[t] = U[0] + U[1] + ... + U[t−1]. It makes things a lot faster to compute when dealing with a damage range.
  const U = new Float64Array(nBuckets);
  const P = new Float64Array(nBuckets + 1);
  for (let T = 0; T < nBuckets; T++) {
    let expectedHits = 1; // Populates U[T]. Initialised to 1, because we need to include the hit that breks through.
    for (const { weight, lo, hi } of normalisedMixture) {
      // windowTop and windowBottom tell us the prior cumulative damage levels this hit could have come from to reach T
      const windowTop = T - lo; // Minimum damage roll index
      const windowBottom = T - hi; // Maximum damage roll index
      // As P holds prefix sums of U, these two lookups give the window sum in O(1), rather than summing U[windowBottom..windowTop] one by one.
      const pTop = windowTop < 0 ? 0 : P[windowTop + 1];
      const pBottom = windowBottom <= 0 ? 0 : P[windowBottom];
      const windowSum = pTop - pBottom;
      const damageRangeWidth = hi - lo + 1;
      // We need to divide by the damage width to turn it back into an average, because we summed over the same range in P
      // windowSum is a sum of damageRangeWidth entries of U.
      // So we need to divide by damageRangeWidth to average them, since the hit is equally likely to roll any value in [lo, hi].
      expectedHits += (weight / damageRangeWidth) * windowSum;
    }
    U[T] = expectedHits;
    P[T + 1] = P[T] + expectedHits;
  }

  const expectedHitsToKill = U[nBuckets - 1];
  if (expectedHitsToKill <= 0) return 1;

  // E.g. hitsBelow(0.05) = how many hits landed while the target is still above 95%.
  const hitsBelow = (frac: number): number => {
    if (frac <= 0) return 0;
    if (frac >= 1) return expectedHitsToKill;
    const thresholdIndex = Math.min(Math.ceil(frac * nBuckets) - 1, nBuckets - 1);
    if (thresholdIndex < 0) return 0;
    return U[thresholdIndex];
  };

  let bonusWeightedHits = 0;
  for (const { from: fromFrac, to: toFrac, bonus } of brackets) {
    if (bonus == 0) continue;
    bonusWeightedHits += bonus * (hitsBelow(toFrac) - hitsBelow(fromFrac));
  }

  return 1 + bonusWeightedHits / expectedHitsToKill;
}
