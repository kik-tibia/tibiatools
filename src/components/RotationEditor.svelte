<script lang="ts">
  import type { Spell } from "@data/spells";
  import type { RotationSpell } from "@lib/damage-calc";

  export let registry: Map<string, Spell>;
  export let active: RotationSpell[] = [];
  export let onActiveChange: ((next: RotationSpell[]) => void) | undefined;

  let lastSent = active;
  $: if (active !== lastSent) {
    onActiveChange?.(active);
    lastSent = active;
  }
  function setRatio(id: string, v: number) {
    active = active.map((a) => (a.id === id ? { ...a, ratio: v } : a));
  }
  function setTargets(id: string, v: number) {
    active = active.map((a) => (a.id === id ? { ...a, targets: v } : a));
  }
  function remove(id: string) {
    active = active.filter((a) => a.id !== id);
  }
  function onRatioInput(id: string, e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    setRatio(id, Number(el.value));
  }
  function onTargetsInput(id: string, e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    setTargets(id, Number(el.value));
  }
</script>

<div class="spell-editor">
  <form class="spell-grid">
    {#if active.length}
      <div class="header-cell">Name</div>
      <div class="header-cell">Targets</div>
      <div class="header-cell">Ratio</div>
      <div class="header-cell"></div>
    {/if}

    {#each active as a (a.id)}
      {@const def = registry.get(a.id)}
      {#if def}
        <div>{def.name}</div>
        <input type="number" value={a.targets} on:input={(e) => onTargetsInput(a.id, e)} />
        <input type="number" value={a.ratio} on:input={(e) => onRatioInput(a.id, e)} />
        <button type="button" aria-label="Remove" on:click={() => remove(a.id)}>×</button>
      {/if}
    {/each}
  </form>
</div>

<style>
  .spell-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 6rem 6rem auto;
    column-gap: 1rem;
    row-gap: 0.25rem;
    align-items: center;
  }

  .header-cell {
    font-weight: 600;
    padding-bottom: 0.25rem;
  }

  .spell-grid input {
    width: 6rem;
    padding: 0.1rem;
    font: inherit;
  }

  .spell-grid button {
    justify-self: end;
  }
</style>
