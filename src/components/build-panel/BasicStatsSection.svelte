<script lang="ts">
  import Tooltip from "@components/Tooltip.svelte";
  import SectionCopyButtons from "./SectionCopyButtons.svelte";
  import type { Build, BuildStats, Vocation } from "@lib/build-state";

  let {
    buildA = $bindable(),
    buildB = $bindable(),
    showSecondBuild,
    collapsed = $bindable(false),
  }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
  } = $props();

  const vocations: Vocation[] = ["knight", "paladin", "sorcerer", "druid", "monk"];

  function setStatA<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildA = { ...buildA, stats: { ...buildA.stats, [key]: value } };
  }
  function setStatB<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildB = { ...buildB, stats: { ...buildB.stats, [key]: value } };
  }

  type StatField = {
    key: keyof BuildStats;
    label: string;
    advanced?: boolean;
    tooltip?: string;
  };

  const statFields: StatField[] = [
    { key: "level", label: "Level" },
    { key: "bonus", label: "Bonus Damage" },
    { key: "magicLevel", label: "Magic Level" },
    { key: "skill", label: "Skill" },
    { key: "critChance", label: "Crit Chance %" },
    { key: "critDamage", label: "Crit Damage %" },
  ];

  const statKeys = ["vocation", "level", "bonus", "magicLevel", "skill", "critChance", "critDamage"] as const;

  function copyAtoB() {
    const patch: Partial<BuildStats> = {};
    for (const k of statKeys) patch[k] = buildA.stats[k] as any;
    buildB = { ...buildB, stats: { ...buildB.stats, ...patch } };
  }
  function copyBtoA() {
    const patch: Partial<BuildStats> = {};
    for (const k of statKeys) patch[k] = buildB.stats[k] as any;
    buildA = { ...buildA, stats: { ...buildA.stats, ...patch } };
  }

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
</script>

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Basic Stats
      </button>
    </h4>
  </td>
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} />
</tr>

{#if !collapsed}
  <tr class="data-row">
    <td>Vocation</td>
    <td>
      <select
        class="vocation-select input-a"
        value={buildA.stats.vocation}
        onchange={(e) => setStatA("vocation", e.currentTarget.value as Vocation)}>
        {#each vocations as voc}
          <option value={voc}>{capitalize(voc)}</option>
        {/each}
      </select>
    </td>
    {#if showSecondBuild}
      <td>
        <select
          class="vocation-select input-b"
          value={buildB.stats.vocation}
          onchange={(e) => setStatB("vocation", e.currentTarget.value as Vocation)}>
          {#each vocations as voc}
            <option value={voc}>{capitalize(voc)}</option>
          {/each}
        </select>
      </td>
    {/if}
  </tr>

  {#each statFields as field}
    <tr class="data-row">
      {#if field.tooltip}
        <td>
          <Tooltip label={field.label} tip={field.tooltip} />
        </td>
      {:else}
        <td>{field.label}</td>
      {/if}
      <td>
        <input
          type="number"
          step="any"
          inputmode="numeric"
          class="input-a"
          value={buildA.stats[field.key]}
          oninput={(e) => setStatA(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
      </td>
      {#if showSecondBuild}
        <td>
          <input
            type="number"
            step="any"
            inputmode="numeric"
            class="input-b"
            value={buildB.stats[field.key]}
            oninput={(e) => setStatB(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
        </td>
      {/if}
    </tr>
  {/each}
{/if}

<style>
  .vocation-select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.25rem 0.4rem;
    font: inherit;
    border: 1px solid var(--input-border);
    border-radius: 0.25rem;
    background: var(--input-bg);
    color: inherit;
    cursor: pointer;
  }

  .vocation-select.input-a {
    border-color: var(--build-a-border);
  }

  .vocation-select.input-b {
    border-color: var(--build-b-border);
  }

  .vocation-select:focus {
    outline: none;
    box-shadow: var(--focus-ring);
  }
</style>
