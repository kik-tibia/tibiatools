<script lang="ts">
  import { perks } from "@data/perks";
  import FuzzySelect from "./FuzzySelect.svelte";
  import PerkEditor from "./PerkEditor.svelte";
  import type { Build, BuildStats } from "@lib/build-state";

  const registry = new Map(perks.map((p) => [p.id, p]));

  export let buildA: Build;
  export let buildB: Build;
  export let showSecondBuild: boolean = false;

  function setStatA<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildA = { ...buildA, stats: { ...buildA.stats, [key]: value } };
  }
  function setStatB<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildB = { ...buildB, stats: { ...buildB.stats, [key]: value } };
  }

  function addPerk(id: string) {
    buildA = { ...buildA, perks: [...buildA.perks, { id, value: 0 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: 0 }] };
    }
  }

  // Get union of perk IDs from both builds
  $: allPerkIds = [...new Set([...buildA.perks.map((p) => p.id), ...buildB.perks.map((p) => p.id)])];

  let showAdvanced =
    Boolean(buildA?.stats?.shielding ?? 0) ||
    Boolean(buildA?.stats?.fishing ?? 0) ||
    Boolean(buildB?.stats?.shielding ?? 0) ||
    Boolean(buildB?.stats?.fishing ?? 0);

  type StatField = {
    key: keyof BuildStats;
    label: string;
    advanced?: boolean;
  };

  const statFields: StatField[] = [
    { key: "level", label: "Level" },
    { key: "bonus", label: "Bonus Damage" },
    { key: "magicLevel", label: "Magic Level" },
    { key: "skill", label: "Skill" },
    { key: "weapon", label: "Weapon Attack" },
    { key: "critChance", label: "Crit Chance %" },
    { key: "critDamage", label: "Crit Damage %" },
    { key: "fatalChance", label: "Fatal Chance %", advanced: true },
    { key: "shielding", label: "Shielding", advanced: true },
    { key: "fishing", label: "Fishing", advanced: true },
  ];

  $: basicFields = statFields.filter((f) => !f.advanced);
  $: advancedFields = statFields.filter((f) => f.advanced);
</script>

<div class="merged-build-panel">
  <div class="panel-header">
    <h3>Build Stats</h3>
    {#if showSecondBuild}
      <div class="build-labels">
        <span class="build-label build-a">A</span>
        <span class="build-label build-b">B</span>
      </div>
    {/if}
  </div>

  <form class="stats-form" on:submit|preventDefault>
    {#each basicFields as field}
      <div class="stat-row">
        <span class="stat-label">{field.label}</span>
        <div class="stat-inputs" class:single={!showSecondBuild}>
          <input
            type="number"
            inputmode="numeric"
            class="input-a"
            value={buildA.stats[field.key]}
            on:input={(e) =>
              setStatA(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
          {#if showSecondBuild}
            <input
              type="number"
              inputmode="numeric"
              class="input-b"
              value={buildB.stats[field.key]}
              on:input={(e) =>
                setStatB(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
          {/if}
        </div>
      </div>
    {/each}

    <details class="advanced" bind:open={showAdvanced}>
      <summary>More stats</summary>
      {#each advancedFields as field}
        <div class="stat-row">
          <span class="stat-label">{field.label}</span>
          <div class="stat-inputs" class:single={!showSecondBuild}>
            <input
              type="number"
              inputmode="numeric"
              class="input-a"
              value={buildA.stats[field.key] ?? 0}
              on:input={(e) =>
                setStatA(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
            {#if showSecondBuild}
              <input
                type="number"
                inputmode="numeric"
                class="input-b"
                value={buildB.stats[field.key] ?? 0}
                on:input={(e) =>
                  setStatB(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
            {/if}
          </div>
        </div>
      {/each}
    </details>
  </form>

  <div class="perks-section">
    <h4>Perks</h4>
    <FuzzySelect selectType="perks" all={perks} selectedIds={allPerkIds} onAdd={addPerk} />
    <PerkEditor
      perkIdsA={buildA.perks}
      perkIdsB={buildB.perks}
      {showSecondBuild}
      onChangeA={(next) => (buildA = { ...buildA, perks: next })}
      onChangeB={(next) => (buildB = { ...buildB, perks: next })}
      {registry} />
  </div>
</div>

<style>
  .merged-build-panel {
    padding: 0 1rem 1rem 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .panel-header h3 {
    margin: 0;
  }

  .build-labels {
    display: flex;
    gap: 0.5rem;
    padding-right: 0.25rem;
  }

  .build-label {
    width: 5.5rem;
    text-align: center;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.25rem 0;
    border-radius: 0.25rem;
  }

  .build-label.build-a {
    background: rgba(100, 180, 255, 0.2);
    color: hsl(210, 80%, 70%);
  }

  .build-label.build-b {
    background: rgba(255, 180, 100, 0.2);
    color: hsl(30, 80%, 70%);
  }

  .stats-form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .stat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .stat-label {
    flex: 1;
    min-width: 0;
  }

  .stat-inputs {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .stat-inputs.single {
    width: 5.5rem;
  }

  .stat-inputs input {
    width: 5.5rem;
    padding: 0.25rem 0.4rem;
    font: inherit;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    background: hsl(220 10% 15%);
    color: inherit;
  }

  .stat-inputs input.input-a {
    border-color: hsl(210, 50%, 40%);
  }

  .stat-inputs input.input-b {
    border-color: hsl(30, 50%, 40%);
  }

  .stat-inputs input:focus {
    outline: none;
    box-shadow: 0 0 0 2px hsl(220 90% 65% / 0.3);
  }

  details.advanced > summary {
    cursor: pointer;
    user-select: none;
    margin-top: 0.5rem;
    padding: 0.25rem 0;
    font-weight: 600;
  }

  details.advanced[open] > summary {
    margin-bottom: 0.5rem;
  }

  details.advanced > .stat-row {
    margin-top: 0.4rem;
  }

  .perks-section {
    margin-top: 1rem;
  }

  .perks-section h4 {
    margin: 0 0 0.5rem 0;
  }
</style>
