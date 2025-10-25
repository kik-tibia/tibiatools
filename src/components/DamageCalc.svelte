<script lang="ts">
  import { onMount } from "svelte";

  import { computeResults } from "@lib/damage-calc";
  import { packState, unpackState } from "@lib/url-pack";
  import type { Build, CalculatorState } from "@lib/build-state";

  import BuildPanel from "./BuildPanel.svelte";
  import ResultsTable from "./ResultsTable.svelte";

  export let initial: CalculatorState;

  let A: Build = { stats: { ...initial.A.stats }, perks: initial.A.perks ?? [] };
  let B: Build = { stats: { ...initial.B.stats }, perks: initial.B.perks ?? [] };

  let showSecondBuild: boolean = !!initial.showSecondBuild;

  function currentState(): CalculatorState {
    console.log(A);
    return { showSecondBuild, A, B };
  }

  $: resultsA = computeResults(A.stats, A.perks);
  $: resultsB = computeResults(B.stats, B.perks);

  const toMap = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  $: mapA = toMap(resultsA);
  $: mapB = toMap(resultsB);
  const isAHigher = (id: string) => Number(mapA.get(id)?.effectiveAvg) >= Number(mapB.get(id)?.effectiveAvg);
  const isBHigher = (id: string) => Number(mapB.get(id)?.effectiveAvg) >= Number(mapA.get(id)?.effectiveAvg);

  function writePackedToUrl() {
    const q = new URLSearchParams(window.location.search);
    q.set("s", packState(currentState()));

    const qs = q.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

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
      A = { stats: { ...A.stats, ...st.A.stats }, perks: st.A.perks ?? [] };
      B = { stats: { ...B.stats, ...st.B.stats }, perks: st.B.perks ?? [] };
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  $: {
    A;
    B;
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
      A = {
        stats: {
          level: "",
          bonus: "",
          skill: "",
          magicLevel: "",
          weapon: "",
          shielding: "",
          fishing: "",
          critChance: "",
          critDamage: "",
        },
        perks: [],
      };
      B = {
        stats: {
          level: "",
          bonus: "",
          skill: "",
          magicLevel: "",
          weapon: "",
          shielding: "",
          fishing: "",
          critChance: "",
          critDamage: "",
        },
        perks: [],
      };
    }}>
    Reset
  </button>
  <button
    type="button"
    on:click={() => {
      showSecondBuild = !showSecondBuild;
      scheduleWrite();
    }}>
    {showSecondBuild ? "Hide second build" : "Compare a second build"}
  </button>
</section>

<section class="compare-grid">
  <div class="panel" style="padding-right: 1rem">
    <BuildPanel title="Build A" bind:build={A} />
    <ResultsTable results={resultsA} isHigher={isAHigher} />
  </div>

  {#if showSecondBuild}
    <div class="panel">
      <BuildPanel title="Build B" bind:build={B} />
      <ResultsTable results={resultsB} isHigher={isBHigher} />
    </div>
  {/if}
</section>

<style>
  .compare-grid {
    display: grid;
    gap: 1rem;

    grid-template-rows: auto 1fr;

    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
  }

  .toolbar button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #bbb;
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
  }
</style>
