<script lang="ts">
  import { onMount } from "svelte";

  import { computeDph, computeDpt, computeResults } from "@lib/damage-calc";
  import { packState, unpackState } from "@lib/url-pack";
  import {
    defaultBuild,
    defaultCollapsed,
    type Build,
    type CalculatorState,
    type CollapsedSections,
  } from "@lib/build-state";

  import BuildPanel from "@components/build-panel/BuildPanel.svelte";
  import BuildBadge from "@components/BuildBadge.svelte";
  import ResultsTable from "@components/ResultsTable.svelte";
  import type { SpellDamage } from "@data/spells";

  let { initial }: { initial: CalculatorState } = $props();

  let A: Build = $state(initial.A);
  let B: Build = $state(initial.B);
  let showSecondBuild: boolean = $state(!!initial.showSecondBuild);
  let collapsed: CollapsedSections = $state(initial.collapsed ?? defaultCollapsed());

  function currentState(): CalculatorState {
    return { A, B, showSecondBuild, collapsed };
  }

  let resultsA = $derived(computeResults(A.stats, A.weapon, A.perks));
  let resultsB = $derived(computeResults(B.stats, B.weapon, B.perks));
  let effectiveDptA = $derived(computeDpt(resultsA, A.rotation));
  let effectiveDptB = $derived(computeDpt(resultsB, B.rotation));
  let effectiveDphA = $derived(computeDph(resultsA, A.rotation));
  let effectiveDphB = $derived(computeDph(resultsB, B.rotation));

  const toMap = (arr: SpellDamage[]) => new Map(arr.map((x) => [x.id, x]));
  let mapA = $derived(toMap(resultsA));
  let mapB = $derived(toMap(resultsB));
  const isAHigher = (id: string) => Number(mapA.get(id)?.effectiveAvg ?? 0) >= Number(mapB.get(id)?.effectiveAvg ?? 0);
  const isBHigher = (id: string) => Number(mapB.get(id)?.effectiveAvg ?? 0) >= Number(mapA.get(id)?.effectiveAvg ?? 0);
  const epsilon = 1e-9;
  let isDptAHigher = $derived(effectiveDptA >= effectiveDptB - epsilon);
  let isDptBHigher = $derived(effectiveDptB >= effectiveDptA - epsilon);
  let isDphAHigher = $derived(effectiveDphA >= effectiveDphB - epsilon);
  let isDphBHigher = $derived(effectiveDphB >= effectiveDphA - epsilon);
  let pctIncreaseA = $derived((effectiveDptA / effectiveDptB - 1) * 100);
  let pctIncreaseB = $derived((effectiveDptB / effectiveDptA - 1) * 100);

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
      collapsed = st.collapsed ?? defaultCollapsed();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  $effect(() => {
    A;
    B;
    showSecondBuild;
    collapsed.basicStats;
    collapsed.advancedStats;
    collapsed.weapon;
    collapsed.perks;
    collapsed.rotation;
    scheduleWrite();
  });

  let copied = $state(false);
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => (copied = false), 1200);
  }
</script>

<section class="toolbar">
  <button type="button" onclick={copyLink}>{copied ? "Copied!" : "Share"}</button>
  <button
    type="button"
    onclick={() => {
      A = defaultBuild();
      B = defaultBuild();
    }}>
    Reset
  </button>
  <button
    type="button"
    class="compare-btn"
    class:active={showSecondBuild}
    onclick={() => {
      showSecondBuild = !showSecondBuild;
      scheduleWrite();
    }}>
    {showSecondBuild ? "Hide comparison" : "Compare builds"}
  </button>
</section>

<section class="main-grid" class:comparing={showSecondBuild}>
  <div class="panel build-panel">
    <BuildPanel bind:buildA={A} bind:buildB={B} {showSecondBuild} bind:collapsed />
  </div>

  <div class="panel results-panel-a">
    <h3 class="results-title">
      {#if showSecondBuild}
        <BuildBadge build="a">Build A</BuildBadge>
        <span class="pct-diff" class:positive={pctIncreaseA > 0} class:negative={pctIncreaseA < 0}>
          {pctIncreaseA > 0 ? "+" : ""}{pctIncreaseA.toFixed(2)}% per turn
        </span>
      {:else}
        Results
      {/if}
    </h3>
    <ResultsTable
      results={resultsA}
      vocation={A.stats.vocation}
      effectiveDpt={effectiveDptA}
      isDptHigher={isDptAHigher}
      effectiveDph={effectiveDphA}
      isDphHigher={isDphAHigher}
      isHigher={isAHigher} />
  </div>

  {#if showSecondBuild}
    <div class="panel results-panel-b">
      <h3 class="results-title">
        <BuildBadge build="b">Build B</BuildBadge>
        <span class="pct-diff" class:positive={pctIncreaseB > 0} class:negative={pctIncreaseB < 0}>
          {pctIncreaseB > 0 ? "+" : ""}{pctIncreaseB.toFixed(2)}% per turn
        </span>
      </h3>
      <ResultsTable
        results={resultsB}
        vocation={B.stats.vocation}
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
    border: 1px solid var(--input-border);
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
    color: inherit;
  }

  .toolbar button:hover {
    background: var(--btn-hover-bg);
  }

  .compare-btn.active {
    background: var(--btn-active-bg);
    border-color: var(--btn-active-border);
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

  .pct-diff {
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    background: var(--input-bg);
    border-radius: 0.25rem;
  }

  .pct-diff.positive {
    color: var(--positive-color);
  }

  .pct-diff.negative {
    color: var(--negative-color);
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
      border-top: 1px solid var(--border-color);
      padding-top: 1rem;
    }
  }
</style>
