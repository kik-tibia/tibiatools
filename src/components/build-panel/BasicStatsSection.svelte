<script lang="ts">
  import ClipboardPasteRow from "@components/build-panel/ClipboardPasteRow.svelte";
  import SectionCopyButtons from "@components/build-panel/SectionCopyButtons.svelte";
  import Tooltip from "@components/Tooltip.svelte";
  import type { Build, BuildStats, Vocation } from "@lib/build-state";
  import { packSection, SECTION_TAG } from "@lib/section-clipboard";
  import { compactStats, expandStats } from "@lib/url-pack";

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
    { key: "bonus", label: "Wheel Damage", tooltip: "Bonus damage from Wheel of Destiny" },
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

  let pasteTarget: "a" | "b" | null = $state(null);

  function onCopyA(): string {
    return packSection(SECTION_TAG.basicStats, compactStats(buildA.stats));
  }
  function onCopyB(): string {
    return packSection(SECTION_TAG.basicStats, compactStats(buildB.stats));
  }
  function handlePaste(data: unknown) {
    const full = expandStats(data as any);
    const patch: Partial<BuildStats> = {};
    for (const k of statKeys) (patch as any)[k] = full[k];
    if (pasteTarget === "a") {
      buildA = { ...buildA, stats: { ...buildA.stats, ...patch } };
    } else {
      buildB = { ...buildB, stats: { ...buildB.stats, ...patch } };
    }
    pasteTarget = null;
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
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} {onCopyA} {onCopyB} bind:pasteTarget />
</tr>
{#if pasteTarget && !collapsed}
  <ClipboardPasteRow sectionTag={SECTION_TAG.basicStats} {pasteTarget} {showSecondBuild} onPaste={handlePaste} />
{/if}

{#snippet vocCell(
  build: Build,
  buildId: string,
  setStat: (key: keyof BuildStats, value: BuildStats[keyof BuildStats]) => void,
)}
  <td>
    <select
      class="vocation-select input-{buildId}"
      value={build.stats.vocation}
      onchange={(e) => setStat("vocation", e.currentTarget.value as Vocation)}>
      {#each vocations as voc}
        <option value={voc}>{capitalize(voc)}</option>
      {/each}
    </select>
  </td>
{/snippet}

{#snippet inputCell(
  key: keyof BuildStats,
  build: Build,
  buildId: string,
  setStat: (key: keyof BuildStats, value: BuildStats[keyof BuildStats]) => void,
)}
  <td>
    <input
      type="number"
      step="any"
      inputmode="numeric"
      class="input-{buildId}"
      value={build.stats[key]}
      oninput={(e) => setStat(key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
  </td>
{/snippet}

{#if !collapsed}
  <tr class="data-row">
    <td>Vocation</td>
    {@render vocCell(buildA, "a", setStatA)}
    {#if showSecondBuild}
      {@render vocCell(buildB, "b", setStatB)}
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
      {@render inputCell(field.key, buildA, "a", setStatA)}
      {#if showSecondBuild}
        {@render inputCell(field.key, buildB, "b", setStatB)}
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
