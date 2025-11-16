<script lang="ts">
  import type { PerkDef } from "@data/perks";
  import type { ActivePerk } from "@lib/damage-calc";

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
  <form class="perk-grid">
    {#each active as a (a.id)}
      {@const def = registry.get(a.id)}
      {#if def}
        <div>{def.name}</div>
        <input type="number" value={a.value} on:input={(e) => onInput(a.id, e)} />
        <button type="button" aria-label="Remove" on:click={() => remove(a.id)}>×</button>
      {/if}
    {/each}
  </form>
</div>

<style>
  .perk-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 6rem auto;
    column-gap: 1rem;
    row-gap: 0.25rem;
    align-items: center;
  }

  .perk-grid input {
    width: 6rem;
    padding: 0.1rem;
    font: inherit;
  }

  .perk-grid button {
    justify-self: end;
  }
</style>
