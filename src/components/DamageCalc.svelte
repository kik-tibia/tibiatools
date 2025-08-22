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

  let level: string | number | null = "";
  let bonus: string | number | null = "";
  let skill: string | number | null = "";
  let magicLevel: string | number | null = "";
  let weapon: string | number | null = "";

  const n = (v: unknown) => Number((v ?? "").toString().trim()) || 0;

  $: L = n(level);
  $: B = n(bonus);
  $: S = n(skill);
  $: ML = n(magicLevel);
  $: W = n(weapon);
  $: step = Math.floor((Math.sqrt(2 * L + 2025) + 5) / 10);
  $: F = step * 100 - 450 + Math.floor((L + 1000) / step - 50 * step) + B;

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

  $: results = spells.map((spell) => ({
    ...spell,
    avg: computeAvg(spell, F, ML, S, W),
    min: computeMinMax(spell, -1, F, ML, S, W),
    max: computeMinMax(spell, 1, F, ML, S, W),
  }));

  let mounted = false;

  function readFromUrl() {
    const p = new URLSearchParams(window.location.search);
    level = p.get("L") ?? "";
    bonus = p.get("B") ?? "";
    skill = p.get("S") ?? "";
    magicLevel = p.get("ML") ?? "";
    weapon = p.get("W") ?? "";
  }

  function writeToUrl() {
    const p = new URLSearchParams(window.location.search);
    const setOrDel = (k: string, v: unknown) => {
      const s = (v ?? "").toString().trim();
      if (s) p.set(k, s);
      else p.delete(k);
    };
    setOrDel("L", level);
    setOrDel("B", bonus);
    setOrDel("S", skill);
    setOrDel("ML", magicLevel);
    setOrDel("W", weapon);

    const qs = p.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

  let t: number | undefined;
  function scheduleWrite() {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(writeToUrl, 150);
  }

  onMount(() => {
    mounted = true;
    readFromUrl();
    const onPop = () => readFromUrl();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  // React to input changes after mount
  $: if (mounted) {
    level;
    bonus;
    skill;
    magicLevel;
    weapon;
    scheduleWrite();
  }

  // ui helpers
  const fmt = (x: number) => Math.round(x); // or use toFixed(2) if you prefer decimals

  let copied = false;
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => (copied = false), 1200);
  }
</script>

<section class="grid">
  <form class="stack" on:submit|preventDefault>
    <div class="row">
      <button type="button" on:click={copyLink}>{copied ? "Copied!" : "Share"}</button>
      <button
        type="button"
        on:click={() => {
          level = bonus = skill = magicLevel = weapon = "";
        }}>Reset</button
      >
    </div>
    <label>
      <span>Level</span>
      <input type="number" bind:value={level} inputmode="numeric" placeholder="e.g. 120" />
    </label>
    <label>
      <span>Bonus Damage</span>
      <input type="number" bind:value={bonus} inputmode="numeric" placeholder="e.g. 15" />
    </label>
    <label>
      <span>Skill</span>
      <input type="number" bind:value={skill} inputmode="numeric" placeholder="e.g. 100" />
    </label>
    <label>
      <span>Magic Level</span>
      <input type="number" bind:value={magicLevel} inputmode="numeric" placeholder="e.g. 100" />
    </label>
    <label>
      <span>Weapon Attack</span>
      <input type="number" bind:value={weapon} inputmode="numeric" placeholder="e.g. 50" />
    </label>
  </form>
</section>
<section class="results-wrap">
  <table class="results">
    <thead>
      <tr>
        <th class="spell">Spell</th>
        <th class="num">Min</th>
        <th class="num">Avg</th>
        <th class="num">Max</th>
      </tr>
    </thead>
    <tbody>
      {#each results as r}
        <tr>
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
</section>

<style>
  .grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 760px) {
    .grid {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }

  .stack {
    display: grid;
    gap: 0.75rem;
    max-width: 420px;
  }
  label {
    display: grid;
    gap: 0.25rem;
  }
  input {
    padding: 0.5rem;
    font: inherit;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #bbb;
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
  }

  .results h3 {
    margin: 0 0 0.5rem 0;
  }
  .results ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .results li {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
  }
  .spell {
    font-weight: 600;
  }
  .val {
    font-variant-numeric: tabular-nums;
  }
</style>
