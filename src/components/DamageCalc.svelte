<script lang="ts">
  import spellsRaw from "src/data/spells.json";
  import { onMount } from "svelte";
  import BuildPanel from "./BuildPanel.svelte";
  import type { ActivePerk } from "src/lib/perk-types";
  import { packState, unpackState } from "src/lib/url-pack";
  import type { CalculatorState } from "src/lib/build-state";

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
  export let initial: CalculatorState;

  type BuildInputs = {
    level: string | number | null;
    bonus: string | number | null;
    skill: string | number | null;
    magicLevel: string | number | null;
    weapon: string | number | null;
  };

  let A: BuildInputs = { ...initial.A.inputs };
  let B: BuildInputs = { ...initial.B.inputs };
  let activePerksA: ActivePerk[] = initial.A.perks ?? [];
  let activePerksB: ActivePerk[] = initial.B.perks ?? [];
  let showSecondBuild: boolean = !!initial.showSecondBuild;

  function currentState(): CalculatorState {
    return {
      v: 1,
      showSecondBuild,
      A: { inputs: A, perks: activePerksA },
      B: { inputs: B, perks: activePerksB },
    };
  }

  function writePackedToUrl() {
    const q = new URLSearchParams(window.location.search);
    q.set("s", packState(currentState()));

    const qs = q.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

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

  const computeResults = (inp: BuildInputs, activePerks: ActivePerk[]) => {
    const { F, ML, S, W } = derive(inp);
    return spells.map((spell) => {
      return {
        ...spell,
        min: computeMinMax(spell, -1, F, ML, S, W),
        avg: computeAvg(spell, F, ML, S, W),
        max: computeMinMax(spell, 1, F, ML, S, W),
      };
    });
  };

  $: resultsA = computeResults(A, activePerksA);
  $: resultsB = computeResults(B, activePerksB);

  const toMap = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  $: mapA = toMap(resultsA);
  $: mapB = toMap(resultsB);
  const isAHigher = (id: string) => (mapA.get(id)?.avg ?? -Infinity) >= (mapB.get(id)?.avg ?? -Infinity);
  const isBHigher = (id: string) => (mapB.get(id)?.avg ?? -Infinity) >= (mapA.get(id)?.avg ?? -Infinity);

  let didHydrate = false;

  let t: number | undefined;
  function scheduleWrite() {
    if (!didHydrate) return;
    if (t) window.clearTimeout(t);
    t = window.setTimeout(writePackedToUrl, 150);
  }

  onMount(() => {
    didHydrate = true;
    const onPop = () => {
      const s = new URLSearchParams(window.location.search).get("s");
      const st = unpackState(s);
      if (!st) return;
      showSecondBuild = !!st.showSecondBuild;
      A = { ...A, ...st.A.inputs };
      B = { ...B, ...st.B.inputs };
      activePerksA = st.A.perks ?? [];
      activePerksB = st.B.perks ?? [];
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  $: {
    A;
    B;
    activePerksA;
    activePerksB;
    showSecondBuild;
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
    bind:activePerks={activePerksA}
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
      bind:activePerks={activePerksB}
      results={resultsB}
      isHigher={isBHigher}
    />
  {/if}
</section>
