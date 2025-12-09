<script lang="ts">
  import { onMount } from "svelte";

  import { computeDph, computeDpt, computeResults } from "@lib/damage-calc";
  import { packState, unpackState } from "@lib/url-pack";
  import { defaultBuild, type Build, type CalculatorState } from "@lib/build-state";

  import BuildPanel from "./BuildPanel.svelte";
  import ResultsTable from "./ResultsTable.svelte";

  export let initial: CalculatorState;

  let A: Build = initial.A;
  let B: Build = initial.B;

  let showSecondBuild: boolean = !!initial.showSecondBuild;

  function currentState(): CalculatorState {
    console.log(A);
    return { A, B, showSecondBuild };
  }

  $: resultsA = computeResults(A.stats, A.perks);
  $: resultsB = computeResults(B.stats, B.perks);
  $: effectiveDptA = computeDpt(resultsA, A.rotation);
  $: effectiveDptB = computeDpt(resultsB, B.rotation);
  $: effectiveDphA = computeDph(resultsA, A.rotation);
  $: effectiveDphB = computeDph(resultsB, B.rotation);

  const toMap = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  $: mapA = toMap(resultsA);
  $: mapB = toMap(resultsB);
  const isAHigher = (id: string) => Number(mapA.get(id)?.effectiveAvg) >= Number(mapB.get(id)?.effectiveAvg);
  const isBHigher = (id: string) => Number(mapB.get(id)?.effectiveAvg) >= Number(mapA.get(id)?.effectiveAvg);
  const epsilon = 1e-9;
  $: isDptAHigher = effectiveDptA >= effectiveDptB - epsilon;
  $: isDptBHigher = effectiveDptB >= effectiveDptA - epsilon;
  $: isDphAHigher = effectiveDphA >= effectiveDphB - epsilon;
  $: isDphBHigher = effectiveDphB >= effectiveDphA - epsilon;
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
      A = st.A;
      B = st.B;
      showSecondBuild = !!st.showSecondBuild;
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
      A = defaultBuild();
      B = defaultBuild();
    }}>
    Reset
  </button>
  <button
    type="button"
    class="compare-btn"
    class:active={showSecondBuild}
    on:click={() => {
      showSecondBuild = !showSecondBuild;
      scheduleWrite();
    }}>
    {showSecondBuild ? "Hide comparison" : "Compare builds"}
  </button>
</section>

<section class="main-grid" class:comparing={showSecondBuild}>
  <div class="panel build-panel">
    <BuildPanel bind:buildA={A} bind:buildB={B} {showSecondBuild} />
  </div>

  <div class="panel results-panel-a">
    <h3 class="results-title">
      {#if showSecondBuild}
        <span class="build-indicator build-a">Build A</span>
        <span class="pct-diff" class:positive={pctIncreaseA > 0} class:negative={pctIncreaseA < 0}>
          {pctIncreaseA > 0 ? "+" : ""}{pctIncreaseA.toFixed(2)}%
        </span>
      {:else}
        Results
      {/if}
    </h3>
    <ResultsTable
      results={resultsA}
      effectiveDpt={effectiveDptA}
      isDptHigher={isDptAHigher}
      effectiveDph={effectiveDphA}
      isDphHigher={isDphAHigher}
      isHigher={isAHigher} />
  </div>

  {#if showSecondBuild}
    <div class="panel results-panel-b">
      <h3 class="results-title">
        <span class="build-indicator build-b">Build B</span>
        <span class="pct-diff" class:positive={pctIncreaseB > 0} class:negative={pctIncreaseB < 0}>
          {pctIncreaseB > 0 ? "+" : ""}{pctIncreaseB.toFixed(2)}%
        </span>
      </h3>
      <ResultsTable
        results={resultsB}
        effectiveDpt={effectiveDptB}
        isDptHigher={isDptBHigher}
        effectiveDph={effectiveDphB}
        isDphHigher={isDphBHigher}
        isHigher={isBHigher} />
    </div>
  {/if}
</section>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .toolbar button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #bbb;
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
    color: inherit;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .toolbar button:hover {
    background: hsl(220 10% 20%);
  }

  .compare-btn.active {
    background: hsl(220 50% 25%);
    border-color: hsl(220 50% 45%);
  }

  .panel {
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 0;
  }

  .results-title {
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .build-indicator {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.9rem;
  }

  .build-indicator.build-a {
    background: rgba(100, 180, 255, 0.2);
    color: hsl(210, 80%, 70%);
  }

  .build-indicator.build-b {
    background: rgba(255, 180, 100, 0.2);
    color: hsl(30, 80%, 70%);
  }

  .pct-diff {
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    background: hsl(220 10% 15%);
    border-radius: 0.25rem;
  }

  .pct-diff.positive {
    color: hsl(120, 60%, 60%);
  }

  .pct-diff.negative {
    color: hsl(0, 60%, 65%);
  }

  @media (min-width: 900px) {
    .main-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(320px, 1.5fr) minmax(280px, 1fr);
      grid-template-areas: "build resultsA";
    }

    .main-grid.comparing {
      grid-template-columns: 620px 420px 420px;
      grid-template-areas: "build resultsA resultsB";
    }

    .build-panel {
      grid-area: build;
    }
    .results-panel-a {
      grid-area: resultsA;
    }
    .results-panel-b {
      grid-area: resultsB;
    }
  }

  @media (max-width: 899px) {
    .main-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .main-grid.comparing .results-panel-a,
    .main-grid.comparing .results-panel-b {
      border-top: 1px solid hsl(0 0% 30%);
      padding-top: 1rem;
    }
  }
</style>
