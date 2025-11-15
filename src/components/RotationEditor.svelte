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
  function setValue(id: string, v: number) {
    active = active.map((a) => (a.id === id ? { ...a, ratio: v } : a));
  }
  function remove(id: string) {
    active = active.filter((a) => a.id !== id);
  }
  function onInput(id: string, e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    setValue(id, Number(el.value));
  }
</script>

<div class="spell-editor">
  <form class="stack">
    {#each active as a (a.id)}
      {@const def = registry.get(a.id)}
      {#if def}
        <div class="spell-chip">
          <label>
            <span>{def.name}</span>
            <div>
              <button type="button" aria-label="Remove" on:click={() => remove(a.id)}>×</button>
              <input type="number" value={a.ratio} on:input={(e) => onInput(a.id, e)} />
            </div>
          </label>
        </div>
      {/if}
    {/each}
  </form>
</div>

<style>
  input {
    width: 6rem;
    padding: 0.1rem;
    font: inherit;
  }
</style>
