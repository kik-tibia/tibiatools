<script lang="ts">
  import spellsRaw from "src/data/spells.json";
  import { onMount } from "svelte";
  import BuildPanel from "./BuildPanel.svelte";
  import ResultsTable from "./ResultsTable.svelte";
  import type { ActivePerk } from "src/lib/perk-types";
  import type { PerkDef } from "src/data/perks";
  import { perks } from "src/data/perks";
  import { packState, unpackState } from "src/lib/url-pack";
  import type { Build, BuildStats, CalculatorState } from "src/lib/build-state";

  type SpellType = "spell" | "healing" | "rune";
  type ScalesWith = "magic" | "melee" | "distance" | "none";
  type Element = "ice" | "weapon";
  type Rounding = "floor" | "round" | "ceil";

  type Spell = {
    id: string;
    name: string;
    spellType: SpellType;
    scalesWith: ScalesWith;
    element: Element;
    power: number;
    skillFactor: number;
    buckets: number;
    vocations: string[];
    rounding: Rounding;
  };

  type ActivePerkWithDef = ActivePerk & { def: PerkDef };

  type SpellState = { P: number; F: number; ML: number; S: number; W: number };

  const spells = spellsRaw as unknown as Spell[];
  export let initial: CalculatorState;

  let A: Build = { stats: { ...initial.A.stats }, perks: initial.A.perks ?? [] };
  let B: Build = { stats: { ...initial.B.stats }, perks: initial.B.perks ?? [] };

  let showSecondBuild: boolean = !!initial.showSecondBuild;

  function currentState(): CalculatorState {
    console.log(A);
    return { showSecondBuild, A, B };
  }

  const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;

  const derive = (inp: BuildStats) => {
    const L = n(inp.level);
    const B = n(inp.bonus);
    const S = n(inp.skill);
    const ML = n(inp.magicLevel);
    const W = n(inp.weapon);
    const step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
    const F = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;
    return { F, ML, S, W };
  };

  const computeAvg = (spell: Spell, P: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    return spell.scalesWith === "magic"
      ? F + round((P / spell.skillFactor) * ML + P / 4)
      : F + round((P / spell.skillFactor) * S * W + P / 4);
  };

  const computeMinMax = (spell: Spell, minMax: number, P: number, F: number, ML: number, S: number, W: number) => {
    const round = spell.rounding === "floor" ? Math.floor : spell.rounding === "ceil" ? Math.ceil : Math.round;
    const variation = spell.buckets / P / 2;
    return spell.scalesWith === "magic"
      ? F + round((1 + minMax * variation) * ((P / spell.skillFactor) * ML + P / 4))
      : F + round((1 + minMax * variation) * ((P / spell.skillFactor) * S * W + P / 4));
  };

  const perkDefsById: Record<string, PerkDef> = Object.fromEntries(perks.map((p) => [p.id, p]));

  const applyPerkToSpell = (spell: Spell, perk: ActivePerkWithDef, state: SpellState): SpellState => {
    const { P, F, ML, S, W } = state;

    if (
      perk.def.scope === "all" ||
      perk.def.scope === spell.id ||
      perk.def.scope === spell.spellType ||
      perk.def.scope === spell.element
    ) {
      switch (perk.def.bonusType) {
        case "base-damage":
          return { ...state, P: P * (1 + perk.value / 100) };
        case "crit-chance":
          return state;
        case "magic-level":
          return { ...state, ML: ML + perk.value };
        case "axe-percent-extra":
          return { ...state, F: F + Math.floor((S * perk.value) / 100) };
        case "fishing-percent-extra":
          return { ...state, F: F + Math.floor((S * perk.value) / 100) };
      }
    }

    return state;
  };

  const computeResults = (inp: BuildStats, activePerks: ActivePerk[]) => {
    const withDefs: ActivePerkWithDef[] = activePerks
      .map((ap) => {
        const def = perkDefsById[ap.id];
        if (!def) {
          console.warn(`Unknown perk id: ${ap.id}`);
          return null;
        }
        return { ...ap, def };
      })
      .filter((x): x is ActivePerkWithDef => x !== null);
    const { F, ML, S, W } = derive(inp);
    return spells.map((spell) => {
      console.log("------- computing " + spell.name);
      const initial: SpellState = { P: spell.power, F, ML, S, W };
      const final: SpellState = withDefs.reduce((acc, perk) => applyPerkToSpell(spell, perk, acc), initial);
      console.log(initial);
      console.log(final);
      return {
        ...spell,
        min: computeMinMax(spell, -1, final.P, final.F, final.ML, final.S, final.W),
        avg: computeAvg(spell, final.P, final.F, final.ML, final.S, final.W),
        max: computeMinMax(spell, 1, final.P, final.F, final.ML, final.S, final.W),
      };
    });
  };

  $: resultsA = computeResults(A.stats, A.perks);
  $: resultsB = computeResults(B.stats, B.perks);

  const toMap = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  $: mapA = toMap(resultsA);
  $: mapB = toMap(resultsB);
  const isAHigher = (id: string) => (mapA.get(id)?.avg ?? -Infinity) >= (mapB.get(id)?.avg ?? -Infinity);
  const isBHigher = (id: string) => (mapB.get(id)?.avg ?? -Infinity) >= (mapA.get(id)?.avg ?? -Infinity);

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
      A = { stats: { level: "", bonus: "", skill: "", magicLevel: "", weapon: "" }, perks: [] };
      B = { stats: { level: "", bonus: "", skill: "", magicLevel: "", weapon: "" }, perks: [] };
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
  <div class="panel">
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
