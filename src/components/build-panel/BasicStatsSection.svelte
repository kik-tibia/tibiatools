<script lang="ts">
  import type { Build, BuildStats, Vocation } from "@lib/build-state";

  let { buildA = $bindable(), buildB = $bindable(), showSecondBuild }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
  } = $props();

  const vocations: Vocation[] = ["knight", "paladin", "sorcerer", "druid", "monk"];

  function setStatA<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildA = { ...buildA, stats: { ...buildA.stats, [key]: value } };
  }
  function setStatB<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildB = { ...buildB, stats: { ...buildB.stats, [key]: value } };
  }

  let showAdvanced = $state(false);

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
    { key: "fatalChance", label: "Fatal Chance %", advanced: true },
    { key: "baseMagicLevel", label: "Base Magic Level", advanced: true, tooltip: "Required for Runic Mastery" },
    {
      key: "axe",
      label: "Axe Fighting",
      advanced: true,
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "club",
      label: "Club Fighting",
      advanced: true,
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "sword",
      label: "Sword Fighting",
      advanced: true,
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "fist",
      label: "Fist Fighting",
      advanced: true,
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    {
      key: "distance",
      label: "Distance Fighting",
      advanced: true,
      tooltip:
        "Overrides <b>Skill</b> if set. Only needed when using a weapon with a secondary skill proficiency perk.",
    },
    { key: "shielding", label: "Shielding", advanced: true },
    { key: "fishing", label: "Fishing", advanced: true },
  ];

  const basicFields = statFields.filter((f) => !f.advanced);
  let visibleFields = $derived(showAdvanced ? statFields : basicFields);

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
</script>

<tr class="section-header">
  <td><h4>Basic Stats</h4></td>
  <td></td>
  {#if showSecondBuild}<td></td>{/if}
</tr>

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

{#each visibleFields as field}
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
        oninput={(e) =>
          setStatA(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
    </td>
    {#if showSecondBuild}
      <td>
        <input
          type="number"
          step="any"
          inputmode="numeric"
          class="input-b"
          value={buildB.stats[field.key]}
          oninput={(e) =>
            setStatB(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
      </td>
    {/if}
  </tr>
{/each}

<tr class="data-row">
  <td>
    <button type="button" class="toggle-advanced" onclick={() => (showAdvanced = !showAdvanced)}>
      {showAdvanced ? "▼ Less stats" : "▶ More stats"}
    </button>
  </td>
  <td></td>
  {#if showSecondBuild}<td></td>{/if}
</tr>

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

  .toggle-advanced {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 0;
    text-align: left;
  }

  .toggle-advanced:hover {
    color: hsl(220 90% 70%);
  }
</style>
