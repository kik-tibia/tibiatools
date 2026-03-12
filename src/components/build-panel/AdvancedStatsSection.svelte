<script lang="ts">
  import Tooltip from "@components/Tooltip.svelte";
  import SectionCopyButtons from "./SectionCopyButtons.svelte";
  import type { Build, BuildStats } from "@lib/build-state";

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

  function setStatA<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildA = { ...buildA, stats: { ...buildA.stats, [key]: value } };
  }
  function setStatB<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildB = { ...buildB, stats: { ...buildB.stats, [key]: value } };
  }

  type StatField = {
    key: keyof BuildStats;
    label: string;
    tooltip?: string;
  };

  const statFields: StatField[] = [
    { key: "fatalChance", label: "Fatal Chance %" },
    {
      key: "transcendenceChance",
      label: "Transcendence Chance %",
      tooltip: "Assumes a 200ms delay between<br/>your auto-attack and spell",
    },
    {
      key: "baseMagicLevel",
      label: "Base Magic Level",
      tooltip: "Required for Runic Mastery<br/>(not yet implemented)",
    },
    {
      key: "axe",
      label: "Axe Fighting",
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "club",
      label: "Club Fighting",
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "sword",
      label: "Sword Fighting",
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "fist",
      label: "Fist Fighting",
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "distance",
      label: "Distance Fighting",
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    { key: "shielding", label: "Shielding" },
    { key: "fishing", label: "Fishing" },
  ];

  const statKeys = [
    "fatalChance",
    "transcendenceChance",
    "baseMagicLevel",
    "axe",
    "club",
    "sword",
    "fist",
    "distance",
    "shielding",
    "fishing",
  ] as const;

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
</script>

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

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Advanced Stats
      </button>
    </h4>
  </td>
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} />
</tr>

{#if !collapsed}
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
</style>
