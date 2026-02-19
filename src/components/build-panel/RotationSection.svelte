<script lang="ts">
  import { untrack } from "svelte";
  import { spells } from "@data/spells";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import type { Build } from "@lib/build-state";

  let { buildA = $bindable(), buildB = $bindable(), showSecondBuild }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
  } = $props();

  const spellRegistry = new Map(spells.map((s) => [s.id, s]));

  let spellsForAB = $derived(
    spells.filter((i) => i.vocations.includes(buildA.stats.vocation) || i.vocations.includes(buildB.stats.vocation)),
  );

  // TODO it's still not ideal - on page refresh, the order can get changed
  // Rotation helpers - maintain stable order, with auto-attack always first
  let allSelectedRotationIds = $state<string[]>([]);

  $effect(() => {
    const currentIds = new Set([...buildA.rotation.map((r) => r.id), ...buildB.rotation.map((r) => r.id)]);
    const prev = untrack(() => allSelectedRotationIds);
    let filtered = prev.filter((id) => currentIds.has(id));
    for (const id of currentIds) {
      if (!filtered.includes(id)) {
        filtered.push(id);
      }
    }
    allSelectedRotationIds = filtered.toSorted((a, b) => {
      if (a === "auto-attack") return -1;
      if (b === "auto-attack") return 1;
      return 0;
    });
  });

  // TODO defense against adding same spell twice
  function addSpellToRotation(id: string) {
    buildA = { ...buildA, rotation: [...buildA.rotation, { id, targets: 1, ratio: 1 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, rotation: [...buildB.rotation, { id, targets: 1, ratio: 1 }] };
    }
  }

  function setRotationValueA(id: string, field: "targets" | "ratio", v: number) {
    const exists = buildA.rotation.some((r) => r.id === id);
    if (exists) {
      buildA = { ...buildA, rotation: buildA.rotation.map((r) => (r.id === id ? { ...r, [field]: v } : r)) };
    } else {
      buildA = {
        ...buildA,
        rotation: [
          ...buildA.rotation,
          { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 },
        ],
      };
    }
  }
  function setRotationValueB(id: string, field: "targets" | "ratio", v: number) {
    const exists = buildB.rotation.some((r) => r.id === id);
    if (exists) {
      buildB = { ...buildB, rotation: buildB.rotation.map((r) => (r.id === id ? { ...r, [field]: v } : r)) };
    } else {
      buildB = {
        ...buildB,
        rotation: [
          ...buildB.rotation,
          { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 },
        ],
      };
    }
  }

  function addRotationA(id: string) {
    buildA = { ...buildA, rotation: [...buildA.rotation, { id, targets: 1, ratio: 1 }] };
  }
  function addRotationB(id: string) {
    buildB = { ...buildB, rotation: [...buildB.rotation, { id, targets: 1, ratio: 1 }] };
  }
  function removeRotationA(id: string) {
    buildA = { ...buildA, rotation: buildA.rotation.filter((a) => a.id !== id) };
  }
  function removeRotationB(id: string) {
    buildB = { ...buildB, rotation: buildB.rotation.filter((a) => a.id !== id) };
  }

  const isAutoAttack = (id: string) => id === "auto-attack";
</script>

<tr class="section-header">
  <td><h4>Rotation</h4></td>
  <td></td>
  {#if showSecondBuild}<td></td>{/if}
</tr>

<tr class="data-row">
  <td>
    <FuzzySelect
      selectType="spells"
      all={spellsForAB}
      selectedIds={allSelectedRotationIds}
      onAdd={addSpellToRotation} />
  </td>
  <td class="sub-header rotation-label-cell">
    {#if allSelectedRotationIds.length > 0}
      <div class="rotation-labels">
        <span>Targets</span>
        <span>Ratio</span>
      </div>
    {/if}
  </td>
  {#if showSecondBuild}
    <td class="sub-header rotation-label-cell">
      {#if allSelectedRotationIds.length > 0}
        <div class="rotation-labels">
          <span>Targets</span>
          <span>Ratio</span>
        </div>
      {/if}
    </td>
  {/if}
</tr>

{#each allSelectedRotationIds as id (id)}
  {@const def = spellRegistry.get(id)}
  {@const isAuto = isAutoAttack(id)}
  {#if def}
    <tr class="data-row">
      <td class="item-name">{def.name}</td>
      <td>
        {#if buildA.rotation.some((r) => r.id === id)}
          <div class="input-with-remove">
            <input
              type="number"
              step="any"
              class="input-a small"
              value={buildA.rotation.find((r) => r.id === id)?.targets ?? 1}
              oninput={(e) => setRotationValueA(id, "targets", Number(e.currentTarget.value))} />
            {#if !isAuto}
              <input
                type="number"
                step="any"
                class="input-a small"
                value={buildA.rotation.find((r) => r.id === id)?.ratio ?? 1}
                oninput={(e) => setRotationValueA(id, "ratio", Number(e.currentTarget.value))} />
            {/if}
            <RemoveButton pushRight={isAuto} onclick={() => removeRotationA(id)} />
          </div>
        {:else}
          <div class="add-placeholder">
            <button
              type="button"
              class="add-btn input-a"
              aria-label="Add to Build A"
              onclick={() => addRotationA(id)}>
              +
            </button>
          </div>
        {/if}
      </td>
      {#if showSecondBuild}
        <td>
          {#if buildB.rotation.some((r) => r.id === id)}
            <div class="input-with-remove">
              <input
                type="number"
                step="any"
                class="input-b small"
                value={buildB.rotation.find((r) => r.id === id)?.targets ?? 1}
                oninput={(e) => setRotationValueB(id, "targets", Number(e.currentTarget.value))} />
              {#if !isAuto}
                <input
                  type="number"
                  step="any"
                  class="input-b small"
                  value={buildB.rotation.find((r) => r.id === id)?.ratio ?? 1}
                  oninput={(e) => setRotationValueB(id, "ratio", Number(e.currentTarget.value))} />
              {/if}
              <RemoveButton pushRight={isAuto} onclick={() => removeRotationB(id)} />
            </div>
          {:else}
            <div class="add-placeholder">
              <button
                type="button"
                class="add-btn input-b"
                aria-label="Add to Build B"
                onclick={() => addRotationB(id)}>
                +
              </button>
            </div>
          {/if}
        </td>
      {/if}
    </tr>
  {/if}
{/each}

<style>
  .sub-header {
    font-size: 0.75rem;
    color: hsl(0 0% 60%);
  }

  .rotation-label-cell {
    padding-bottom: 0;
    vertical-align: bottom;
  }

  .rotation-labels {
    display: flex;
    gap: 0.25rem;
    padding-right: 1.65rem; /* account for remove button width */
  }

  .rotation-labels span {
    flex: 1;
    text-align: center;
  }
</style>
