<script lang="ts">
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
    advanced?: boolean;
    tooltip?: string;
  };

  const statFields: StatField[] = [
    { key: "fatalChance", label: "Fatal Chance %" },
    { key: "baseMagicLevel", label: "Base Magic Level", advanced: true, tooltip: "Required for Runic Mastery" },
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
</script>

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Advanced Stats
      </button>
    </h4>
  </td>
  <td></td>
  {#if showSecondBuild}<td></td>{/if}
</tr>

{#if !collapsed}
  {#each statFields as field}
    <tr class="data-row">
      {#if field.tooltip}
        <td>
          <span class="field-tip">
            <button type="button" class="tip-trigger" aria-describedby="tip-effective">{field.label}</button>
            <span id="tip-effective" role="tooltip" class="tip-content">{@html field.tooltip}</span>
          </span>
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
</style>
