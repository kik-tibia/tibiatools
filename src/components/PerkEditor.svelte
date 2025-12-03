<script lang="ts">
  import type { PerkDef } from "@data/perks";
  import type { ActivePerk } from "@lib/damage-calc";

  export let registry: Map<string, PerkDef>;
  export let perkIdsA: ActivePerk[] = [];
  export let perkIdsB: ActivePerk[] = [];
  export let showSecondBuild: boolean = false;
  export let onChangeA: ((next: ActivePerk[]) => void) | undefined;
  export let onChangeB: ((next: ActivePerk[]) => void) | undefined;

  // Get union of all perk IDs
  $: allPerkIds = [...new Set([...perkIdsA.map((p) => p.id), ...perkIdsB.map((p) => p.id)])];

  function getValueA(id: string): number {
    return perkIdsA.find((p) => p.id === id)?.value ?? 0;
  }

  function getValueB(id: string): number {
    return perkIdsB.find((p) => p.id === id)?.value ?? 0;
  }

  function setValueA(id: string, v: number) {
    const exists = perkIdsA.some((p) => p.id === id);
    if (exists) {
      onChangeA?.(perkIdsA.map((a) => (a.id === id ? { ...a, value: v } : a)));
    } else {
      onChangeA?.([...perkIdsA, { id, value: v }]);
    }
  }

  function setValueB(id: string, v: number) {
    const exists = perkIdsB.some((p) => p.id === id);
    if (exists) {
      onChangeB?.(perkIdsB.map((a) => (a.id === id ? { ...a, value: v } : a)));
    } else {
      onChangeB?.([...perkIdsB, { id, value: v }]);
    }
  }

  function remove(id: string) {
    onChangeA?.(perkIdsA.filter((a) => a.id !== id));
    onChangeB?.(perkIdsB.filter((a) => a.id !== id));
  }

  function onInputA(id: string, e: Event) {
    const el = e.target as HTMLInputElement;
    setValueA(id, Number(el.value));
  }

  function onInputB(id: string, e: Event) {
    const el = e.target as HTMLInputElement;
    setValueB(id, Number(el.value));
  }
</script>

<div class="perk-editor">
  {#if allPerkIds.length > 0}
    <form class="perk-grid" class:two-builds={showSecondBuild}>
      {#each allPerkIds as id (id)}
        {@const def = registry.get(id)}
        {#if def}
          <div class="perk-name">{def.name}</div>
          <div class="perk-inputs" class:single={!showSecondBuild}>
            <input type="number" class="input-a" value={getValueA(id)} on:input={(e) => onInputA(id, e)} />
            {#if showSecondBuild}
              <input type="number" class="input-b" value={getValueB(id)} on:input={(e) => onInputB(id, e)} />
            {/if}
          </div>
          <button type="button" class="remove-btn" aria-label="Remove" on:click={() => remove(id)}>×</button>
        {/if}
      {/each}
    </form>
  {/if}
</div>

<style>
  .perk-grid {
    display: grid;
    grid-template-columns: 1fr auto auto;
    column-gap: 0.75rem;
    row-gap: 0.4rem;
    align-items: center;
    margin-top: 0.5rem;
  }

  .perk-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .perk-inputs {
    display: flex;
    gap: 0.5rem;
  }

  .perk-inputs.single {
    width: 5.5rem;
  }

  .perk-inputs input {
    width: 5.5rem;
    padding: 0.25rem 0.4rem;
    font: inherit;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    background: hsl(220 10% 15%);
    color: inherit;
  }

  .perk-inputs input.input-a {
    border-color: hsl(210, 50%, 40%);
  }

  .perk-inputs input.input-b {
    border-color: hsl(30, 50%, 40%);
  }

  .perk-inputs input:focus {
    outline: none;
    box-shadow: 0 0 0 2px hsl(220 90% 65% / 0.3);
  }

  .remove-btn {
    padding: 0.1rem 0.5rem;
    font-size: 1.1rem;
    line-height: 1;
    background: transparent;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
  }

  .remove-btn:hover {
    background: hsl(0, 50%, 30%);
    border-color: hsl(0, 50%, 40%);
  }
</style>
