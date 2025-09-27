<script lang="ts">
  import type { PerkDef } from "@data/perks";
  import type { ActivePerk } from "@lib/perk-types";

  export let registry: Map<string, PerkDef>;
  export let active: ActivePerk[] = [];
  export let onActiveChange: ((next: ActivePerk[]) => void) | undefined;

  let lastSent = active;
  $: if (active !== lastSent) {
    onActiveChange?.(active);
    lastSent = active;
  }
  function setValue(id: string, v: number) {
    active = active.map((a) => (a.id === id ? { ...a, value: v } : a));
  }
  function remove(id: string) {
    active = active.filter((a) => a.id !== id);
  }
  function onInput(id: string, e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    setValue(id, Number(el.value));
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
              <input type="number" value={ap.value} on:input={(e) => onInput(ap.id, e)} />
            </div>
          </label>
        </div>
      {/if}
    {/each}
  </form>
</div>
