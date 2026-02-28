<script lang="ts">
  import { spells } from "@data/spells";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import SectionCopyButtons from "./SectionCopyButtons.svelte";
  import type { Build } from "@lib/build-state";

  let {
    buildA = $bindable(),
    buildB = $bindable(),
    showSecondBuild,
    collapsed = $bindable(false),
    rotationOrder = $bindable(),
  }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
    rotationOrder: string[];
  } = $props();

  const spellRegistry = new Map(spells.map((s) => [s.id, s]));

  const isAutoAttack = (id: string) => id === "auto-attack";

  let spellsForAB = $derived(
    spells.filter((i) => i.vocations.includes(buildA.stats.vocation) || i.vocations.includes(buildB.stats.vocation)),
  );

  function addSpellToRotation(id: string) {
    buildA = { ...buildA, rotation: [...buildA.rotation, { id, targets: 1, ratio: 1 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, rotation: [...buildB.rotation, { id, targets: 1, ratio: 1 }] };
    }
    if (!rotationOrder.includes(id)) {
      if (isAutoAttack(id)) rotationOrder = [id, ...rotationOrder];
      else rotationOrder = [...rotationOrder, id];
    }
  }

  function setRotationValueA(id: string, field: "targets" | "ratio", v: number) {
    const exists = buildA.rotation.some((r) => r.id === id);
    if (exists) {
      buildA = { ...buildA, rotation: buildA.rotation.map((r) => (r.id === id ? { ...r, [field]: v } : r)) };
    } else {
      buildA = {
        ...buildA,
        rotation: [...buildA.rotation, { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 }],
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
        rotation: [...buildB.rotation, { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 }],
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
    if (!buildB.rotation.some((r) => r.id === id)) {
      rotationOrder = rotationOrder.filter((x) => x !== id);
    }
  }
  function removeRotationB(id: string) {
    buildB = { ...buildB, rotation: buildB.rotation.filter((a) => a.id !== id) };
    if (!buildA.rotation.some((r) => r.id === id)) {
      rotationOrder = rotationOrder.filter((x) => x !== id);
    }
  }

  function copyAtoB() {
    buildB = { ...buildB, rotation: buildA.rotation.map((r) => ({ ...r })) };
  }
  function copyBtoA() {
    buildA = { ...buildA, rotation: buildB.rotation.map((r) => ({ ...r })) };
  }
</script>

{#snippet rotationCell(
  build: Build,
  buildId: string,
  spellId: string,
  setRotationValue: (id: string, field: "targets" | "ratio", v: number) => void,
  addRotation: (id: string) => void,
  removeRotation: (id: string) => void,
)}
  {@const isAuto = isAutoAttack(spellId)}
  <td>
    {#if build.rotation.some((r) => r.id === spellId)}
      <div class="input-with-remove">
        <input
          type="number"
          step="any"
          class="input-{buildId} small"
          value={build.rotation.find((r) => r.id === spellId)?.targets ?? 1}
          oninput={(e) => setRotationValue(spellId, "targets", Number(e.currentTarget.value))} />
        {#if !isAuto}
          <input
            type="number"
            step="any"
            class="input-{buildId} small"
            value={build.rotation.find((r) => r.id === spellId)?.ratio ?? 1}
            oninput={(e) => setRotationValue(spellId, "ratio", Number(e.currentTarget.value))} />
        {/if}
        <RemoveButton pushRight={isAuto} onclick={() => removeRotation(spellId)} />
      </div>
    {:else}
      <div class="add-placeholder">
        <button type="button" class="add-btn input-{buildId}" onclick={() => addRotation(spellId)}>+</button>
      </div>
    {/if}
  </td>
{/snippet}

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Rotation
      </button>
    </h4>
  </td>
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} />
</tr>

{#if !collapsed}
  <tr class="data-row">
    <td>
      <FuzzySelect selectType="spells" all={spellsForAB} selectedIds={rotationOrder} onAdd={addSpellToRotation} />
    </td>
    <td class="sub-header rotation-label-cell">
      {#if rotationOrder.length > 0}
        <div class="rotation-labels">
          <span>Targets</span>
          <span>Ratio</span>
        </div>
      {/if}
    </td>
    {#if showSecondBuild}
      <td class="sub-header rotation-label-cell">
        {#if rotationOrder.length > 0}
          <div class="rotation-labels">
            <span>Targets</span>
            <span>Ratio</span>
          </div>
        {/if}
      </td>
    {/if}
  </tr>

  {#each rotationOrder as id (id)}
    {@const def = spellRegistry.get(id)}
    {#if def}
      <tr class="data-row">
        <td class="item-name">{def.name}</td>
        {@render rotationCell(buildA, "a", id, setRotationValueA, addRotationA, removeRotationA)}
        {#if showSecondBuild}
          {@render rotationCell(buildB, "b", id, setRotationValueB, addRotationB, removeRotationB)}
        {/if}
      </tr>
    {/if}
  {/each}
{/if}

<style>
  .sub-header {
    font-size: 0.75rem;
    color: var(--text-muted);
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
