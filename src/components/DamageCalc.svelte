<script lang="ts">
  import { onMount } from "svelte";

  import { computeDpt, computeResults, type RotationSpell } from "@lib/damage-calc";
  import { packState, unpackState } from "@lib/url-pack";
  import type { Build, CalculatorState } from "@lib/build-state";

  import BuildPanel from "./BuildPanel.svelte";
  import ResultsTable from "./ResultsTable.svelte";
  import RotationPanel from "./RotationPanel.svelte";

  export let initial: CalculatorState;

  let A: Build = { stats: { ...initial.A.stats }, perks: initial.A.perks ?? [] };
  let B: Build = { stats: { ...initial.B.stats }, perks: initial.B.perks ?? [] };

  let showSecondBuild: boolean = !!initial.showSecondBuild;

  let rotation: RotationSpell[] = initial.rotation;

  function currentState(): CalculatorState {
    console.log(A);
    return { A, B, showSecondBuild, rotation };
  }

  $: resultsA = computeResults(A.stats, A.perks);
  $: resultsB = computeResults(B.stats, B.perks);
  $: effectiveDptA = computeDpt(resultsA, rotation);
  $: effectiveDptB = computeDpt(resultsB, rotation);

  const toMap = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  $: mapA = toMap(resultsA);
  $: mapB = toMap(resultsB);
  const isAHigher = (id: string) => Number(mapA.get(id)?.effectiveAvg) >= Number(mapB.get(id)?.effectiveAvg);
  const isBHigher = (id: string) => Number(mapB.get(id)?.effectiveAvg) >= Number(mapA.get(id)?.effectiveAvg);
  $: isDptAHigher = effectiveDptA >= effectiveDptB;
  $: isDptBHigher = effectiveDptB >= effectiveDptA;
  $: pctIncreaseA = (effectiveDptA / effectiveDptB - 1) * 100;
  $: pctIncreaseB = (effectiveDptB / effectiveDptA - 1) * 100;

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
      A = { stats: { ...A.stats, ...st.A.stats }, perks: st.A.perks ?? [] };
      B = { stats: { ...B.stats, ...st.B.stats }, perks: st.B.perks ?? [] };
      showSecondBuild = !!st.showSecondBuild;
      rotation = st.rotation ?? [];
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  $: {
    A;
    B;
    showSecondBuild;
    rotation;
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
      rotation = [];
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
  <span>{pctIncreaseA.toFixed(2)}% / {pctIncreaseB.toFixed(2)}%</span>
</section>

<section class="main-grid" class:has-second-build={showSecondBuild}>
  <div class="panel rotation-panel">
    <RotationPanel bind:rotation />
  </div>

  <div class="panel build-panel-a">
    <BuildPanel title="Build A" bind:build={A} />
  </div>
  <div class="panel results-panel-a">
    <ResultsTable results={resultsA} effectiveDpt={effectiveDptA} isDptHigher={isDptAHigher} isHigher={isAHigher} />
  </div>

  {#if showSecondBuild}
    <div class="panel build-panel-b">
      <BuildPanel title="Build B" bind:build={B} />
    </div>
    <div class="panel results-panel-b">
      <ResultsTable results={resultsB} effectiveDpt={effectiveDptB} isDptHigher={isDptBHigher} isHigher={isBHigher} />
    </div>
  {/if}
</section>

<style>
  .panel {
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 0;
  }

  @media (min-width: 900px) {
    .main-grid {
      display: grid;
      gap: 1rem;

      /* Default: only one build */
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "rotation buildA"
        "rotation resultsA";
    }

    .main-grid.has-second-build {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-areas:
        "rotation buildA  buildB"
        "rotation resultsA resultsB";
    }

    .rotation-panel {
      grid-area: rotation;
    }
    .build-panel-a {
      grid-area: buildA;
    }
    .results-panel-a {
      grid-area: resultsA;
    }
    .build-panel-b {
      grid-area: buildB;
    }
    .results-panel-b {
      grid-area: resultsB;
    }
  }

  .toolbar button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #bbb;
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
  }
</style>
