<script lang="ts">
  import { untrack } from "svelte";
  import { perks } from "@data/perks";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import type { Build } from "@lib/build-state";

  let { buildA = $bindable(), buildB = $bindable(), showSecondBuild, collapsed = $bindable(false) }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
  } = $props();

  const perkRegistry = new Map(perks.map((p) => [p.id, p]));

  let allSelectedPerkIds = $state<string[]>([]);

  $effect(() => {
    const currentIds = new Set([...buildA.perks.map((p) => p.id), ...buildB.perks.map((p) => p.id)]);
    const prev = untrack(() => allSelectedPerkIds);
    let filtered = prev.filter((id) => currentIds.has(id));
    for (const id of currentIds) {
      if (!filtered.includes(id)) {
        filtered.push(id);
      }
    }
    allSelectedPerkIds = filtered;
  });

  function addPerk(id: string) {
    buildA = { ...buildA, perks: [...buildA.perks, { id, value: 0 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: 0 }] };
    }
  }

  function setPerkValueA(id: string, v: number) {
    const exists = buildA.perks.some((p) => p.id === id);
    if (exists) {
      buildA = { ...buildA, perks: buildA.perks.map((a) => (a.id === id ? { ...a, value: v } : a)) };
    } else {
      buildA = { ...buildA, perks: [...buildA.perks, { id, value: v }] };
    }
  }
  function setPerkValueB(id: string, v: number) {
    const exists = buildB.perks.some((p) => p.id === id);
    if (exists) {
      buildB = { ...buildB, perks: buildB.perks.map((a) => (a.id === id ? { ...a, value: v } : a)) };
    } else {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: v }] };
    }
  }
  function removePerkA(id: string) {
    buildA = { ...buildA, perks: buildA.perks.filter((a) => a.id !== id) };
  }
  function removePerkB(id: string) {
    buildB = { ...buildB, perks: buildB.perks.filter((a) => a.id !== id) };
  }
</script>

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Perks
      </button>
    </h4>
  </td>
  <td></td>
  {#if showSecondBuild}<td></td>{/if}
</tr>

{#if !collapsed}
<tr class="data-row">
  <td>
    <FuzzySelect selectType="perks" all={perks} selectedIds={allSelectedPerkIds} onAdd={addPerk} />
  </td>
  <td></td>
  {#if showSecondBuild}<td></td>{/if}
</tr>

{#each allSelectedPerkIds as id (id)}
  {@const def = perkRegistry.get(id)}
  {#if def}
    <tr class="data-row">
      <td class="item-name">{def.name}</td>
      <td>
        {#if buildA.perks.some((p) => p.id === id)}
          <div class="input-with-remove">
            <input
              type="number"
              step="any"
              class="input-a"
              value={buildA.perks.find((p) => p.id === id)?.value ?? 0}
              oninput={(e) => setPerkValueA(id, Number(e.currentTarget.value))} />
            <RemoveButton onclick={() => removePerkA(id)} />
          </div>
        {:else}
          <div class="add-placeholder">
            <button
              type="button"
              class="add-btn input-a"
              aria-label="Add to Build A"
              onclick={() => setPerkValueA(id, 0)}>
              +
            </button>
          </div>
        {/if}
      </td>
      {#if showSecondBuild}
        <td>
          {#if buildB.perks.some((p) => p.id === id)}
            <div class="input-with-remove">
              <input
                type="number"
                step="any"
                class="input-b"
                value={buildB.perks.find((p) => p.id === id)?.value ?? 0}
                oninput={(e) => setPerkValueB(id, Number(e.currentTarget.value))} />
              <RemoveButton onclick={() => removePerkB(id)} />
            </div>
          {:else}
            <div class="add-placeholder">
              <button
                type="button"
                class="add-btn input-b"
                aria-label="Add to Build B"
                onclick={() => setPerkValueB(id, 0)}>
                +
              </button>
            </div>
          {/if}
        </td>
      {/if}
    </tr>
  {/if}
{/each}
{/if}
