<script lang="ts">
  import type { PerkDef } from "src/data/perks";
  import type { ActivePerk } from "src/lib/perk-types";

  export let registry: Map<string, PerkDef>;
  export let active: ActivePerk[]; // parent binds this

  function setValue(ap: ActivePerk, v: number) {
    ap.value = v;
    // nudge reactivity
    active = active.slice();
  }

  function onNumInput(ap: ActivePerk, e: Event) {
    const target = e.target as HTMLInputElement;
    setValue(ap, Number(target.value));
  }

  function onEnumChange(ap: ActivePerk, e: Event) {
    const target = e.target as HTMLSelectElement;
    setValue(ap, Number(target.value));
  }

  function remove(id: string) {
    active = active.filter((a) => a.id !== id);
  }
</script>

<div class="perk-editor">
  <form class="stack">
    {#each active as ap (ap.id)}
      {@const def = registry.get(ap.id)}
      {#if def}
        <div class="perk-chip">
          <label>
            <span>{def.name}</span>
            <div>
              <button type="button" aria-label="Remove" on:click={() => remove(ap.id)}>×</button>
              <input type="number" value={String(ap.value)} on:input={(e) => onNumInput(ap, e)} inputmode="numeric" />
            </div>
          </label>
        </div>
      {/if}
    {/each}
  </form>
</div>
