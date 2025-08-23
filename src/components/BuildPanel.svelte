<script lang="ts">
  import { perks } from "src/data/perks";
  import PerkPicker from "./PerkPicker.svelte";
  import PerkEditor from "./PerkEditor.svelte";
  import type { ActivePerk } from "src/lib/perk-types";

  export let activePerks: ActivePerk[] = []; // bind from parent
  const registry = new Map(perks.map((p) => [p.id, p]));

  function addPerk(id: string) {
    const def = registry.get(id)!;
    const values: Record<string, number | string> = {};
    for (const prm of def.params) values[prm.key] = prm.default;
    activePerks = [...activePerks, { id, values }];
  }
  function removePerk(id: string) {
    activePerks = activePerks.filter((p) => p.id !== id);
  }
  export let title = "Build";
  // two-way bound fields
  export let level: string | number | null = "";
  export let bonus: string | number | null = "";
  export let skill: string | number | null = "";
  export let magicLevel: string | number | null = "";
  export let weapon: string | number | null = "";

  // computed results for this build (array of { id, name, min, avg, max, scalesWith, rounding, ... })
  export let results: any[] = [];

  // function to decide if a row should be highlighted
  export let isHigher: (id: string) => boolean = () => false;
</script>

<div>
  <h3>{title}</h3>
  <PerkPicker all={perks} selectedIds={activePerks.map((p) => p.id)} onAdd={addPerk} onRemove={removePerk} />
  <PerkEditor bind:active={activePerks} {registry} />
  <div class="panel">
    <form class="stack" on:submit|preventDefault>
      <label><span>Level</span><input type="number" bind:value={level} inputmode="numeric" /></label>
      <label><span>Bonus Damage</span><input type="number" bind:value={bonus} inputmode="numeric" /></label>
      <label><span>Skill</span><input type="number" bind:value={skill} inputmode="numeric" /></label>
      <label><span>Magic Level</span><input type="number" bind:value={magicLevel} inputmode="numeric" /></label>
      <label><span>Weapon Attack</span><input type="number" bind:value={weapon} inputmode="numeric" /></label>
    </form>

    <table class="results">
      <thead>
        <tr><th class="spell">Spell</th><th class="num">Min</th><th class="num">Avg</th><th class="num">Max</th></tr>
      </thead>
      <tbody>
        {#each results as r}
          <tr class:highlight={isHigher(r.id)}>
            <td class="spell">
              <div class="spell-name">{r.name}</div>
              <div class="meta"><span class="badge">{r.scalesWith}</span></div>
            </td>
            <td class="num range" data-label="Min">{r.min}</td>
            <td class="num" data-label="Avg">{r.avg}</td>
            <td class="num range" data-label="Max">{r.max}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
