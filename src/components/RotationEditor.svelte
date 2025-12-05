<script lang="ts">
  import type { Spell } from "@data/spells";
  import type { RotationSpell } from "@lib/damage-calc";

  export let registry: Map<string, Spell>;
  export let rotationA: RotationSpell[] = [];
  export let rotationB: RotationSpell[] = [];
  export let showSecondBuild: boolean = false;
  export let onChangeA: ((next: RotationSpell[]) => void) | undefined;
  export let onChangeB: ((next: RotationSpell[]) => void) | undefined;

  // Get union of all spell IDs in rotation
  $: allSpellIds = [...new Set([...rotationA.map((r) => r.id), ...rotationB.map((r) => r.id)])];

  function getRotationA(id: string): RotationSpell {
    return rotationA.find((r) => r.id === id) ?? { id, targets: 1, ratio: 1 };
  }

  function getRotationB(id: string): RotationSpell {
    return rotationB.find((r) => r.id === id) ?? { id, targets: 1, ratio: 1 };
  }

  function setValueA(id: string, field: "targets" | "ratio", v: number) {
    const exists = rotationA.some((r) => r.id === id);
    if (exists) {
      onChangeA?.(rotationA.map((r) => (r.id === id ? { ...r, [field]: v } : r)));
    } else {
      onChangeA?.([...rotationA, { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 }]);
    }
  }

  function setValueB(id: string, field: "targets" | "ratio", v: number) {
    const exists = rotationB.some((r) => r.id === id);
    if (exists) {
      onChangeB?.(rotationB.map((r) => (r.id === id ? { ...r, [field]: v } : r)));
    } else {
      onChangeB?.([...rotationB, { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 }]);
    }
  }

  function remove(id: string) {
    onChangeA?.(rotationA.filter((r) => r.id !== id));
    onChangeB?.(rotationB.filter((r) => r.id !== id));
  }

  function onInputA(id: string, field: "targets" | "ratio", e: Event) {
    const el = e.target as HTMLInputElement;
    setValueA(id, field, Number(el.value));
  }

  function onInputB(id: string, field: "targets" | "ratio", e: Event) {
    const el = e.target as HTMLInputElement;
    setValueB(id, field, Number(el.value));
  }
</script>

<div class="rotation-editor">
  {#if allSpellIds.length > 0}
    <form class="rotation-grid" class:two-builds={showSecondBuild}>
      <div class="header-cell">Spell</div>
      {#if showSecondBuild}
        <div class="header-cell header-group">
          <span class="sub-labels">
            <span>Targets</span>
            <span>Ratio</span>
          </span>
        </div>
        <div class="header-cell header-group">
          <span class="sub-labels">
            <span>Targets</span>
            <span>Ratio</span>
          </span>
        </div>
      {:else}
        <div class="header-cell">Targets</div>
        <div class="header-cell">Ratio</div>
      {/if}
      <div class="header-cell"></div>

      {#each allSpellIds as id (id)}
        {@const def = registry.get(id)}
        {@const rotA = getRotationA(id)}
        {@const rotB = getRotationB(id)}
        {#if def}
          <div class="spell-name">{def.name}</div>
          {#if showSecondBuild}
            <div class="input-group-pair">
              <input type="number" class="input-a" value={rotA.targets} on:input={(e) => onInputA(id, "targets", e)} />
              <input type="number" class="input-a" value={rotA.ratio} on:input={(e) => onInputA(id, "ratio", e)} />
            </div>
            <div class="input-group-pair">
              <input type="number" class="input-b" value={rotB.targets} on:input={(e) => onInputB(id, "targets", e)} />
              <input type="number" class="input-b" value={rotB.ratio} on:input={(e) => onInputB(id, "ratio", e)} />
            </div>
          {:else}
            <div class="input-single">
              <input type="number" class="input-a" value={rotA.targets} on:input={(e) => onInputA(id, "targets", e)} />
            </div>
            <div class="input-single">
              <input type="number" class="input-a" value={rotA.ratio} on:input={(e) => onInputA(id, "ratio", e)} />
            </div>
          {/if}
          <button type="button" class="remove-btn" aria-label="Remove" on:click={() => remove(id)}>×</button>
        {/if}
      {/each}
    </form>
  {/if}
</div>

<style>
  .rotation-grid {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    column-gap: 0.5rem;
    row-gap: 0.4rem;
    align-items: center;
    margin-top: 0.5rem;
  }

  .header-cell {
    font-weight: 600;
    font-size: 0.85rem;
    padding-bottom: 0.25rem;
  }

  .header-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .sub-labels {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: hsl(0 0% 60%);
  }

  .spell-name {
    min-width: 0;
    font-size: 0.9rem;
  }

  .input-group-pair {
    display: flex;
    gap: 0.25rem;
  }

  .input-single {
    width: 2.75rem;
  }

  .input-group-pair input,
  .input-single input {
    width: 2.5rem;
    padding: 0.2rem 0.3rem;
    font: inherit;
    font-size: 0.9rem;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    background: hsl(220 10% 15%);
    color: inherit;
    text-align: center;
  }

  .input-group-pair input.input-a,
  .input-single input.input-a {
    border-color: hsl(210, 50%, 40%);
  }

  .input-group-pair input.input-b {
    border-color: hsl(30, 50%, 40%);
  }

  .input-group-pair input:focus,
  .input-single input:focus {
    outline: none;
    box-shadow: 0 0 0 2px hsl(220 90% 65% / 0.3);
  }

  .remove-btn {
    padding: 0.1rem 0.4rem;
    font-size: 1rem;
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
