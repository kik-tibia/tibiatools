<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { PerkDef } from "src/data/perks";
  import type { ActivePerk } from "src/lib/perk-types";

  const dispatch = createEventDispatcher<{ activeChange: ActivePerk[] }>();

  export let registry: Map<string, PerkDef>;
  export let active: ActivePerk[] = []; // parent passes/updates this

  // Single source of truth for updates (dispatches exactly once)
  function setActive(next: ActivePerk[]) {
    active = next;
    dispatch("activeChange", active);
  }

  // Prefer immutable update over in-place mutation
  function setValue(id: string, v: number) {
    const next = active.map((a) => (a.id === id ? { ...a, value: v } : a));
    setActive(next);
  }

  // One handler that works for both <input> and <select>
  function onInput(id: string, e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    setValue(id, Number(el.value));
  }

  function remove(id: string) {
    setActive(active.filter((a) => a.id !== id));
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
