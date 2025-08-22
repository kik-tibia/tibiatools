<script lang="ts">
  import spellsRaw from "src/data/spells.json";
  import { onMount } from "svelte";
  import BuildPanel from "./BuildPanel.svelte";

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

  let showSecondBuild = Boolean(initial?.L2 || initial?.B2 || initial?.S2 || initial?.ML2 || initial?.W2);

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

  const toMap = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  $: mapA = toMap(resultsA);
  $: mapB = toMap(resultsB);
  const isAHigher = (id: string) => (mapA.get(id)?.avg ?? -Infinity) >= (mapB.get(id)?.avg ?? -Infinity);
  const isBHigher = (id: string) => (mapB.get(id)?.avg ?? -Infinity) >= (mapA.get(id)?.avg ?? -Infinity);

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
    if (showSecondBuild) {
      setOrDel("L2", B.level);
      setOrDel("B2", B.bonus);
      setOrDel("S2", B.skill);
      setOrDel("ML2", B.magicLevel);
      setOrDel("W2", B.weapon);
    } else {
      ["L2", "B2", "S2", "ML2", "W2"].forEach((k) => p.delete(k));
    }
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
      showSecondBuild = Boolean(q.get("L2") || q.get("B2") || q.get("S2") || q.get("ML2") || q.get("W2"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  $: {
    A;
    B;
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
    }}>Reset</button
  >
  <button
    type="button"
    on:click={() => {
      showSecondBuild = !showSecondBuild;
      scheduleWrite();
    }}
  >
    {showSecondBuild ? "Hide second build" : "Compare a second build"}
  </button>
</section>

<section class="compare-grid">
  <BuildPanel
    title="Build A"
    bind:level={A.level}
    bind:bonus={A.bonus}
    bind:skill={A.skill}
    bind:magicLevel={A.magicLevel}
    bind:weapon={A.weapon}
    results={resultsA}
    isHigher={isAHigher}
  />

  {#if showSecondBuild}
    <BuildPanel
      title="Build B"
      bind:level={B.level}
      bind:bonus={B.bonus}
      bind:skill={B.skill}
      bind:magicLevel={B.magicLevel}
      bind:weapon={B.weapon}
      results={resultsB}
      isHigher={isBHigher}
    />
  {/if}
</section>
