// There will be one of these for every spell and crit state
export type DamageMixtureComponent = { weight: number; lo: number; hi: number };

// From and to range from 0 (full hp) to 1 (dead).
// E.g. for alpha strike it would be { from: 0, to: 0.05, bonus: 0.1 }
export type HpBasedDmgBracket = {
  from: number;
  to: number;
  bonus: number;
};

// Optimisation for high HP targets: we cap how many buckets the sweep arrays below use
const maxBuckets = 4096;

// Average damage multiplier for HP based damage perks against a single target
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

  const bonusMultiplierAt = (lostHp: number): number => {
    const frac = lostHp / nBuckets;
    let boost = 1;
    for (const { from, to, bonus } of brackets) {
      // TODO: Once the combat mastery perk is updated, we need to check if this is additive or multiplicative.
      if (frac >= from && frac < to) boost *= 1 + bonus;
    }
    return boost;
  };

  // Probability of ever being on this HP (range [0..1], hpProbability[0] = full HP = 1)
  const hpProbability = new Float64Array(nBuckets);
  // `pendingArrivals` is a difference array we fill as we go: each hit posts the probability it lands on
  // the buckets ahead of it, and `arrivals` reads that back as a running sum. The posting uses a cool
  // add-then-subtract trick (explained at the posting site below where we do `+= / -= density`)
  // so each hit costs O(1) no matter how wide its damage range is.
  const pendingArrivals = new Float64Array(nBuckets);
  let arrivals = 0;
  let expectedHitsToKill = 0; // running sum of hpProbability over every bucket

  for (let lostHp = 0; lostHp < nBuckets; lostHp++) {
    arrivals += pendingArrivals[lostHp];
    // The fight always starts at full HP (bucket 0), so that bucket gets one guaranteed hit. Every other
    // bucket's probability is just whatever earlier hits landed on it (the `arrivals` running sum).
    const reachProbability = (lostHp === 0 ? 1 : 0) + arrivals;
    hpProbability[lostHp] = reachProbability;
    expectedHitsToKill += reachProbability;

    const boost = bonusMultiplierAt(lostHp);
    for (const { weight, lo, hi } of normalisedMixture) {
      const loScaled = Math.max(1, Math.round(lo * boost)); // keep at least 1 so a hit always advances
      const hiScaled = Math.max(loScaled, Math.round(hi * boost));
      const landFrom = lostHp + loScaled;
      if (landFrom >= nBuckets) continue; // this hit (and any higher roll) overkills, so it doesn't seed any arrival bucket
      const damageRangeWidth = hiScaled - loScaled + 1;
      // This hit lands the target uniformly somewhere in [landFrom, landTo] (every roll equally likely),
      // so each of those buckets should gain an equal share of this bucket's probability: `density`.
      const density = (reachProbability * weight) / damageRangeWidth;
      // Rather than add `density` to every bucket in that run, we mark only its two edges and let the
      // left-to-right sweep do the filling. `arrivals` is the running total of every mark we've passed.
      // The +density at landFrom switches on this hit's contribution, and the matching -density one step
      // past landTo switches it back off. So every bucket inside the run picks up `density` and every
      // bucket outside it nets to zero.
      pendingArrivals[landFrom] += density;
      const landToExclusive = lostHp + hiScaled + 1;
      if (landToExclusive < nBuckets) pendingArrivals[landToExclusive] -= density;
    }
  }

  if (expectedHitsToKill <= 0) return 1;

  // The multiplier is the average factor each hit is scaled by over the whole kill. A hit from bucket
  // `lostHp` is scaled by bonusMultiplierAt(lostHp)
  let bonusWeightedHits = 0;
  for (let lostHp = 0; lostHp < nBuckets; lostHp++) {
    bonusWeightedHits += hpProbability[lostHp] * (bonusMultiplierAt(lostHp) - 1);
  }

  return 1 + bonusWeightedHits / expectedHitsToKill;
}
