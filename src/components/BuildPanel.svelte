<script lang="ts">
  import { perks } from "@data/perks";
  import FuzzySelect from "./FuzzySelect.svelte";
  import PerkEditor from "./PerkEditor.svelte";
  import type { Build, BuildStats } from "@lib/build-state";

  const registry = new Map(perks.map((p) => [p.id, p]));

  export let title = "Build";
  export let build: Build;

  function setStat<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    build = { ...build, stats: { ...build.stats, [key]: value } };
  }
  function addPerk(id: string) {
    build = { ...build, perks: [...build.perks, { id, value: 0 }] };
  }

  let showAdvanced = Boolean(build?.stats?.shielding ?? 0) || Boolean(build?.stats?.fishing ?? 0);
</script>

<div style="padding-right: 1rem">
  <h3>{title}</h3>

  <div class="panel">
    <form class="stack" on:submit|preventDefault>
      <label>
        <span>Level</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.level}
          on:input={(e) => setStat("level", e.currentTarget.value)} />
      </label>
      <label>
        <span>Bonus Damage</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.bonus}
          on:input={(e) => setStat("bonus", e.currentTarget.value)} />
      </label>
      <label>
        <span>Magic Level</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.magicLevel}
          on:input={(e) => setStat("magicLevel", e.currentTarget.value)} />
      </label>
      <label>
        <span>Skill</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.skill}
          on:input={(e) => setStat("skill", e.currentTarget.value)} />
      </label>
      <label>
        <span>Weapon Attack</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.weapon}
          on:input={(e) => setStat("weapon", e.currentTarget.value)} />
      </label>
      <label>
        <span>Crit Chance %</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.critChance}
          on:input={(e) => setStat("critChance", e.currentTarget.value)} />
      </label>
      <label>
        <span>Crit Damage %</span>
        <input
          type="number"
          inputmode="numeric"
          value={build.stats.critDamage}
          on:input={(e) => setStat("critDamage", e.currentTarget.value)} />
      </label>

      <details class="advanced" bind:open={showAdvanced}>
        <summary>More stats</summary>
        <div class="stack">
          <label>
            <span>Shielding</span>
            <input
              type="number"
              inputmode="numeric"
              value={build.stats.shielding ?? 0}
              on:input={(e) => setStat("shielding", e.currentTarget.value)} />
          </label>
          <label>
            <span>Fishing</span>
            <input
              type="number"
              inputmode="numeric"
              value={build.stats.fishing ?? 0}
              on:input={(e) => setStat("fishing", e.currentTarget.value)} />
          </label>
        </div>
      </details>
    </form>
  </div>

  <div style="margin-top: 0.5rem">
    <FuzzySelect all={perks} selectedIds={build.perks.map((p) => p.id)} onAdd={addPerk} />
    <PerkEditor active={build.perks} onActiveChange={(next) => (build = { ...build, perks: next })} {registry} />
  </div>
</div>

<style>
  details.advanced > summary {
    cursor: pointer;
    user-select: none;
    margin-top: 0.25rem;
    padding: 0.25rem 0;
    font-weight: 600;
  }
  details.advanced[open] > summary {
    margin-bottom: 0.25rem;
  }

  input {
    width: 6rem;
    padding: 0.1rem;
    font: inherit;
  }
</style>
