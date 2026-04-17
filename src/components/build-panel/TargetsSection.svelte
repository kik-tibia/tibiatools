<script lang="ts">
  import ClipboardPasteRow from "@components/build-panel/ClipboardPasteRow.svelte";
  import SectionCopyButtons from "@components/build-panel/SectionCopyButtons.svelte";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import { creatures } from "@data/creatures";
  import type { Build } from "@lib/build-state";
  import { packSection, SECTION_TAG } from "@lib/section-clipboard";
  import { compactTargets, expandTargets } from "@lib/url-pack";

  let {
    buildA = $bindable(),
    buildB = $bindable(),
    showSecondBuild,
    collapsed = $bindable(false),
    targetOrder = $bindable(),
  }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
    targetOrder: number[];
  } = $props();

  const creatureRegistry = new Map(creatures.map((c) => [c.id, c]));

  function addTarget(id: number) {
    buildA = { ...buildA, targets: [...buildA.targets, { id, ratio: 1 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, targets: [...buildB.targets, { id, ratio: 1 }] };
    }
    if (!targetOrder.includes(id)) {
      targetOrder = [...targetOrder, id];
    }
  }

  function setTargetRatioA(id: number, ratio: number) {
    const exists = buildA.targets.some((t) => t.id === id);
    if (exists) {
      buildA = { ...buildA, targets: buildA.targets.map((t) => (t.id === id ? { ...t, ratio } : t)) };
    } else {
      buildA = { ...buildA, targets: [...buildA.targets, { id, ratio }] };
    }
  }
  function setTargetRatioB(id: number, ratio: number) {
    const exists = buildB.targets.some((t) => t.id === id);
    if (exists) {
      buildB = { ...buildB, targets: buildB.targets.map((t) => (t.id === id ? { ...t, ratio } : t)) };
    } else {
      buildB = { ...buildB, targets: [...buildB.targets, { id, ratio }] };
    }
  }

  function removeTargetA(id: number) {
    buildA = { ...buildA, targets: buildA.targets.filter((t) => t.id !== id) };
    if (!buildB.targets.some((t) => t.id === id)) {
      targetOrder = targetOrder.filter((x) => x !== id);
    }
  }
  function removeTargetB(id: number) {
    buildB = { ...buildB, targets: buildB.targets.filter((t) => t.id !== id) };
    if (!buildA.targets.some((t) => t.id === id)) {
      targetOrder = targetOrder.filter((x) => x !== id);
    }
  }

  function syncOrder() {
    const allIds = new Set([...buildA.targets.map((t) => t.id), ...buildB.targets.map((t) => t.id)]);
    const kept = targetOrder.filter((id) => allIds.has(id));
    const added = [...allIds].filter((id) => !kept.includes(id));
    targetOrder = [...kept, ...added];
  }
  function copyAtoB() {
    buildB = { ...buildB, targets: buildA.targets.map((t) => ({ ...t })) };
    syncOrder();
  }
  function copyBtoA() {
    buildA = { ...buildA, targets: buildB.targets.map((t) => ({ ...t })) };
    syncOrder();
  }

  let pasteTarget: "a" | "b" | null = $state(null);

  function orderedTargets(build: Build) {
    return targetOrder.flatMap((id) => build.targets.filter((t) => t.id === id));
  }
  function onCopyA(): string {
    return packSection(SECTION_TAG.targets, compactTargets(orderedTargets(buildA)));
  }
  function onCopyB(): string {
    return packSection(SECTION_TAG.targets, compactTargets(orderedTargets(buildB)));
  }
  function handlePaste(data: unknown) {
    const pasted = expandTargets(data as any);
    if (pasteTarget === "a") {
      buildA = { ...buildA, targets: pasted };
    } else {
      buildB = { ...buildB, targets: pasted };
    }
    syncOrder();
    pasteTarget = null;
  }
</script>

{#snippet targetCell(
  build: Build,
  buildId: string,
  targetId: number,
  setRatio: (id: number, ratio: number) => void,
  removeTarget: (id: number) => void,
)}
  <td>
    {#if build.targets.some((t) => t.id === targetId)}
      <div class="input-with-remove">
        <input
          type="number"
          step="any"
          class="input-{buildId}"
          value={build.targets.find((t) => t.id === targetId)?.ratio ?? 1}
          oninput={(e) => setRatio(targetId, Number(e.currentTarget.value))} />
        <RemoveButton onclick={() => removeTarget(targetId)} />
      </div>
    {:else}
      <div class="add-placeholder">
        <button type="button" class="add-btn input-{buildId}" onclick={() => setRatio(targetId, 1)}>+</button>
      </div>
    {/if}
  </td>
{/snippet}

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Targets
      </button>
    </h4>
  </td>
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} {onCopyA} {onCopyB} bind:pasteTarget />
</tr>
{#if pasteTarget && !collapsed}
  <ClipboardPasteRow sectionTag={SECTION_TAG.targets} {pasteTarget} {showSecondBuild} onPaste={handlePaste} />
{/if}

{#if !collapsed}
  <tr class="data-row">
    <td>
      <FuzzySelect selectType="targets" all={creatures} selectedIds={targetOrder} onAdd={addTarget} />
    </td>

    <td class="sub-header">
      {#if targetOrder.length > 0}
        <div class="ratio-label">
          <span>Ratio</span>
        </div>
      {/if}
    </td>
    {#if showSecondBuild}
      <td class="sub-header">
        {#if targetOrder.length > 0}
          <div class="ratio-label">
            <span>Ratio</span>
          </div>
        {/if}
      </td>
    {/if}
  </tr>

  {#each targetOrder as id (id)}
    {@const def = creatureRegistry.get(id)}
    {#if def}
      <tr class="data-row">
        <td class="item-name">{def.name}</td>
        {@render targetCell(buildA, "a", id, setTargetRatioA, removeTargetA)}
        {#if showSecondBuild}
          {@render targetCell(buildB, "b", id, setTargetRatioB, removeTargetB)}
        {/if}
      </tr>
    {/if}
  {/each}
{/if}

<style>
  .sub-header {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding-bottom: 0;
    vertical-align: bottom;
  }

  .ratio-label {
    display: flex;
    gap: 0.25rem;
    padding-right: 1.65rem; /* account for remove button width */
  }

  .ratio-label span {
    flex: 1;
    text-align: center;
  }
</style>
