<script lang="ts">
  import { perks } from "src/data/perks";
  import PerkPicker from "./PerkPicker.svelte";
  import PerkEditor from "./PerkEditor.svelte";
  import type { Build, BuildStats } from "src/lib/build-state";

  const registry = new Map(perks.map((p) => [p.id, p]));

  export let title = "Build";

  export let build: Build;

  function setStat<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    build = { ...build, stats: { ...build.stats, [key]: value } };
  }
  function addPerk(id: string) {
    build = { ...build, perks: [...build.perks, { id, value: 0 }] };
  }

  export let results: any[] = [];

  export let isHigher: (id: string) => boolean = () => false;
</script>

<div>
  <h3>{title}</h3>

  <PerkPicker all={perks} selectedIds={build.perks.map((p) => p.id)} onAdd={addPerk} />
  <PerkEditor active={build.perks} onActiveChange={(next) => (build = { ...build, perks: next })} {registry} />

  <div class="panel">
    <form class="stack" on:submit|preventDefault>
      <label
        ><span>Level</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.level}
          on:input={(e) => setStat("level", e.currentTarget.value)}
        />
      </label>
      <label
        ><span>Bonus Damage</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.bonus}
          on:input={(e) => setStat("bonus", e.currentTarget.value)}
        />
      </label>
      <label
        ><span>Skill</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.skill}
          on:input={(e) => setStat("skill", e.currentTarget.value)}
        />
      </label>
      <label
        ><span>Magic Level</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.magicLevel}
          on:input={(e) => setStat("magicLevel", e.currentTarget.value)}
        />
      </label>
      <label
        ><span>Weapon Attack</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.weapon}
          on:input={(e) => setStat("weapon", e.currentTarget.value)}
        />
      </label>
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
