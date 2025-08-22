<script lang="ts">
  import spellsRaw from "src/data/spells.json";
  import { onMount } from "svelte";

  type Rounding = "floor" | "round" | "ceil";
  type ScalesWith = "magic" | "melee" | "distance" | "none";

  type Spell = {
    id: string;
    name: string;
    power: number;
    skillFactor: number;
    scalesWith: ScalesWith;
    buckets: number;
    vocations: string[];
    rounding: Rounding;
  };

  const spells = spellsRaw as unknown as Spell[];
  export let initial:
    | {
        // Build A (1)
        L1?: string;
        B1?: string;
        S1?: string;
        ML1?: string;
        W1?: string;
        // Build B (2)
        L2?: string;
        B2?: string;
        S2?: string;
        ML2?: string;
        W2?: string;
      }
    | undefined;
  type BuildInputs = {
    level: string | number | null;
    bonus: string | number | null;
    skill: string | number | null;
    magicLevel: string | number | null;
    weapon: string | number | null;
  };

  let A: BuildInputs = {
    level: initial?.L1 ?? "",
    bonus: initial?.B1 ?? "",
    skill: initial?.S1 ?? "",
    magicLevel: initial?.ML1 ?? "",
    weapon: initial?.W1 ?? "",
  };
  let B: BuildInputs = {
    level: initial?.L2 ?? "",
    bonus: initial?.B2 ?? "",
    skill: initial?.S2 ?? "",
    magicLevel: initial?.ML2 ?? "",
    weapon: initial?.W2 ?? "",
  };

  const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;

  const derive = (inp: BuildInputs) => {
    const L = n(inp.level);
    const B = n(inp.bonus);
    const S = n(inp.skill);
    const ML = n(inp.magicLevel);
    const W = n(inp.weapon);
    const step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
    const F = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;
    return { F, ML, S, W };
  };

  const computeAvg = (spell: Spell, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    return spell.scalesWith === "magic"
      ? F + round((spell.power / spell.skillFactor) * ML + spell.power / 4)
      : F + round((spell.power / spell.skillFactor) * S * W + spell.power / 4);
  };

  const computeMinMax = (spell: Spell, minMax: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    const variation = spell.buckets / spell.power / 2;
    return spell.scalesWith === "magic"
      ? F + round((1 + minMax * variation) * ((spell.power / spell.skillFactor) * ML + spell.power / 4))
      : F + round((1 + minMax * variation) * ((spell.power / spell.skillFactor) * S * W + spell.power / 4));
  };
  const computeResults = (inp: BuildInputs) => {
    const { F, ML, S, W } = derive(inp);
    return spells.map((spell) => ({
      ...spell,
      min: computeMinMax(spell, -1, F, ML, S, W),
      avg: computeAvg(spell, F, ML, S, W),
      max: computeMinMax(spell, 1, F, ML, S, W),
    }));
  };

  $: resultsA = computeResults(A);
  $: resultsB = computeResults(B);

  // For tie/highlight logic: map by spell.id to compare avgs
  const byId = (arr: any[]) => {
    const m = new Map<string, any>();
    for (const x of arr) m.set(x.id, x);
    return m;
  };
  $: mapA = byId(resultsA);
  $: mapB = byId(resultsB);
  const isAHigher = (id: string) => (mapA.get(id)?.avg ?? -Infinity) > (mapB.get(id)?.avg ?? -Infinity);
  const isBHigher = (id: string) => (mapB.get(id)?.avg ?? -Infinity) > (mapA.get(id)?.avg ?? -Infinity);
  // (ties: neither gets highlight)

  let didHydrate = false;
  function writeToUrl() {
    const p = new URLSearchParams(window.location.search);
    const setOrDel = (k: string, v: unknown) => {
      const s = (v ?? "").toString().trim();
      if (s) p.set(k, s);
      else p.delete(k);
    };
    setOrDel("L1", A.level);
    setOrDel("B1", A.bonus);
    setOrDel("S1", A.skill);
    setOrDel("ML1", A.magicLevel);
    setOrDel("W1", A.weapon);
    setOrDel("L2", B.level);
    setOrDel("B2", B.bonus);
    setOrDel("S2", B.skill);
    setOrDel("ML2", B.magicLevel);
    setOrDel("W2", B.weapon);
    const qs = p.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

  let t: number | undefined;
  function scheduleWrite() {
    if (!didHydrate) return;
    if (t) window.clearTimeout(t);
    t = window.setTimeout(writeToUrl, 150);
  }

  onMount(() => {
    didHydrate = true;
    const onPop = () => {
      const q = new URLSearchParams(window.location.search);
      A.level = q.get("L1") ?? "";
      A.bonus = q.get("B1") ?? "";
      A.skill = q.get("S1") ?? "";
      A.magicLevel = q.get("ML1") ?? "";
      A.weapon = q.get("W1") ?? "";
      B.level = q.get("L2") ?? "";
      B.bonus = q.get("B2") ?? "";
      B.skill = q.get("S2") ?? "";
      B.magicLevel = q.get("ML2") ?? "";
      B.weapon = q.get("W2") ?? "";
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  $: {
    A.level;
    A.bonus;
    A.skill;
    A.magicLevel;
    A.weapon;
    scheduleWrite();
  }
  $: {
    B.level;
    B.bonus;
    B.skill;
    B.magicLevel;
    B.weapon;
    scheduleWrite();
  }

  let copied = false;
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => (copied = false), 1200);
  }
</script>

<section class="toolbar">
  <button type="button" on:click={copyLink}>{copied ? "Copied!" : "Share"}</button>
  <button
    type="button"
    on:click={() => {
      A.level = A.bonus = A.skill = A.magicLevel = A.weapon = "";
      B.level = B.bonus = B.skill = B.magicLevel = B.weapon = "";
    }}>Reset both</button
  >
</section>

<section class="compare-grid">
  <!-- Build A -->
  <div class="panel">
    <h3>Build A</h3>
    <form class="stack" on:submit|preventDefault>
      <label><span>Level</span><input type="number" bind:value={A.level} inputmode="numeric" /></label>
      <label><span>Bonus Damage</span><input type="number" bind:value={A.bonus} inputmode="numeric" /></label>
      <label><span>Skill</span><input type="number" bind:value={A.skill} inputmode="numeric" /></label>
      <label><span>Magic Level</span><input type="number" bind:value={A.magicLevel} inputmode="numeric" /></label>
      <label><span>Weapon Attack</span><input type="number" bind:value={A.weapon} inputmode="numeric" /></label>
    </form>

    <table class="results">
      <thead>
        <tr><th class="spell">Spell</th><th class="num">Min</th><th class="num">Avg</th><th class="num">Max</th></tr>
      </thead>
      <tbody>
        {#each resultsA as r}
          <tr class:highlight={isAHigher(r.id)}>
            <td class="spell">
              <div class="spell-name">{r.name}</div>
              <div class="meta">
                <span class="badge">{r.scalesWith}</span>
              </div>
            </td>
            <td class="num range">{r.min}</td>
            <td class="num">{r.avg}</td>
            <td class="num range">{r.max}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Build B -->
  <div class="panel">
    <h3>Build B</h3>
    <form class="stack" on:submit|preventDefault>
      <label><span>Level</span><input type="number" bind:value={B.level} inputmode="numeric" /></label>
      <label><span>Bonus Damage</span><input type="number" bind:value={B.bonus} inputmode="numeric" /></label>
      <label><span>Skill</span><input type="number" bind:value={B.skill} inputmode="numeric" /></label>
      <label><span>Magic Level</span><input type="number" bind:value={B.magicLevel} inputmode="numeric" /></label>
      <label><span>Weapon Attack</span><input type="number" bind:value={B.weapon} inputmode="numeric" /></label>
    </form>

    <table class="results">
      <thead>
        <tr><th class="spell">Spell</th><th class="num">Min</th><th class="num">Avg</th><th class="num">Max</th></tr>
      </thead>
      <tbody>
        {#each resultsB as r}
          <tr class:highlight={isBHigher(r.id)}>
            <td class="spell">
              <div class="spell-name">{r.name}</div>
              <div class="meta">
                <span class="badge">{r.scalesWith}</span>
              </div>
            </td>
            <td class="num range">{r.min}</td>
            <td class="num">{r.avg}</td>
            <td class="num range">{r.max}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
