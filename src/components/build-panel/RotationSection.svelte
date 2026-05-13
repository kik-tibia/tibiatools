<script lang="ts">
  import ClipboardPasteRow from "@components/build-panel/ClipboardPasteRow.svelte";
  import SectionCopyButtons from "@components/build-panel/SectionCopyButtons.svelte";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import { allSpells, type Spell } from "@data/spells";
  import type { Build } from "@lib/build-state";
  import { packSection, SECTION_TAG } from "@lib/section-clipboard";
  import { compactRotation, expandRotation } from "@lib/url-pack";

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
    rotationOrder: number[];
  } = $props();

  const spellRegistry = new Map(allSpells.map((s) => [s.id, s]));

  const isAutoAttack = (id: number) => id === 1;

  let selectableSpells = $derived(
    allSpells.filter(
      (s) =>
        s.isSelectable &&
        (s.vocations.includes(buildA.stats.vocation) ||
          (showSecondBuild && s.vocations.includes(buildB.stats.vocation))),
    ),
  );

  function addSpellToRotation(id: number) {
    const spellsToAdd = (spellRegistry.get(id)?.spells ?? []).flatMap((s) => spellRegistry.get(s) ?? []);
    const spellsToAddA = spellsToAdd
      .filter((s) => s.vocations.includes(buildA.stats.vocation))
      .map((spell, i) => ({ id: spell.id, targets: 1, ratio: 1, extraSpell: i > 0 }));
    const spellsToAddB = spellsToAdd
      .filter((s) => s.vocations.includes(buildB.stats.vocation))
      .map((spell, i) => ({ id: spell.id, targets: 1, ratio: 1, extraSpell: i > 0 }));

    buildA = { ...buildA, rotation: [...buildA.rotation, ...spellsToAddA] };
    if (showSecondBuild) {
      buildB = { ...buildB, rotation: [...buildB.rotation, ...spellsToAddB] };
    }
    if (!rotationOrder.includes(id)) {
      if (isAutoAttack(id)) rotationOrder = [id, ...rotationOrder];
      else
        rotationOrder = [
          ...new Set([...rotationOrder, ...spellsToAddA.map((s) => s.id), ...spellsToAddB.map((s) => s.id)]),
        ];
    }
  }

  function setRatioA(id: number, v: number) {
    const scope = spellRegistry.get(id)?.scope;
    const matchedSpells = allSpells.filter((s) => s.scope == scope).map((s) => s.id);
    buildA = {
      ...buildA,
      rotation: buildA.rotation.map((r) => (matchedSpells.includes(r.id) ? { ...r, ratio: v } : r)),
    };
  }

  function setRatioB(id: number, v: number) {
    const scope = spellRegistry.get(id)?.scope;
    const matchedSpells = allSpells.filter((s) => s.scope == scope).map((s) => s.id);
    buildB = {
      ...buildB,
      rotation: buildB.rotation.map((r) => (matchedSpells.includes(r.id) ? { ...r, ratio: v } : r)),
    };
  }

  function setTargetsA(id: number, v: number) {
    buildA = { ...buildA, rotation: buildA.rotation.map((r) => (r.id === id ? { ...r, targets: v } : r)) };
  }

  function setTargetsB(id: number, v: number) {
    buildB = { ...buildB, rotation: buildB.rotation.map((r) => (r.id === id ? { ...r, targets: v } : r)) };
  }

  function addRotationA(id: number) {
    const scope = spellRegistry.get(id)?.scope;
    const spellsToAdd =
      allSpells
        .filter((s) => s.scope == scope)
        .map((spell, i) => ({ id: spell.id, targets: 1, ratio: 1, extraSpell: i > 0 })) ?? [];
    buildA = { ...buildA, rotation: [...buildA.rotation, ...spellsToAdd] };
  }

  function addRotationB(id: number) {
    const scope = spellRegistry.get(id)?.scope;
    const spellsToAdd =
      allSpells
        .filter((s) => s.scope == scope)
        .map((spell, i) => ({ id: spell.id, targets: 1, ratio: 1, extraSpell: i > 0 })) ?? [];
    buildB = { ...buildB, rotation: [...buildB.rotation, ...spellsToAdd] };
  }

  function removeRotationA(id: number) {
    const scope = spellRegistry.get(id)?.scope;
    const spellsToRemove = allSpells.filter((s) => s.scope == scope).map((s) => s.id);
    buildA = { ...buildA, rotation: buildA.rotation.filter((a) => !spellsToRemove.includes(a.id)) };
    if (!buildB.rotation.some((r) => r.id === id)) {
      rotationOrder = rotationOrder.filter((x) => !spellsToRemove.includes(x));
    }
  }

  function removeRotationB(id: number) {
    const scope = spellRegistry.get(id)?.scope;
    const spellsToRemove = allSpells.filter((s) => s.scope == scope).map((s) => s.id);
    buildB = { ...buildB, rotation: buildB.rotation.filter((a) => !spellsToRemove.includes(a.id)) };
    if (!buildA.rotation.some((r) => r.id === id)) {
      rotationOrder = rotationOrder.filter((x) => !spellsToRemove.includes(x));
    }
  }

  function syncOrder() {
    const allIds = new Set([...buildA.rotation.map((r) => r.id), ...buildB.rotation.map((r) => r.id)]);
    const kept = rotationOrder.filter((id) => allIds.has(id));
    const added = [...allIds].filter((id) => !kept.includes(id));
    rotationOrder = [...kept, ...added];
  }
  function copyAtoB() {
    buildB = { ...buildB, rotation: buildA.rotation.map((r) => ({ ...r })) };
    syncOrder();
  }
  function copyBtoA() {
    buildA = { ...buildA, rotation: buildB.rotation.map((r) => ({ ...r })) };
    syncOrder();
  }

  let pasteTarget: "a" | "b" | null = $state(null);

  function orderedRotation(build: Build) {
    return rotationOrder.flatMap((id) => build.rotation.filter((r) => r.id === id));
  }
  function onCopyA(): string {
    return packSection(SECTION_TAG.rotation, compactRotation(orderedRotation(buildA)));
  }
  function onCopyB(): string {
    return packSection(SECTION_TAG.rotation, compactRotation(orderedRotation(buildB)));
  }
  function handlePaste(data: unknown) {
    const pasted = expandRotation(data as any);
    if (pasteTarget === "a") {
      buildA = { ...buildA, rotation: pasted };
    } else {
      buildB = { ...buildB, rotation: pasted };
    }
    syncOrder();
    pasteTarget = null;
  }
</script>

{#snippet rotationCell(
  build: Build,
  buildId: string,
  spell: Spell,
  setTargets: (id: number, v: number) => void,
  setRatio: (id: number, v: number) => void,
  addRotation: (id: number) => void,
  removeRotation: (id: number) => void,
)}
  {@const isAuto = isAutoAttack(spell.id)}
  <td>
    {#if build.rotation.some((r) => r.id === spell.id)}
      <div class="input-with-remove">
        <input
          type="number"
          step="any"
          class="input-{buildId}"
          value={build.rotation.find((r) => r.id === spell.id)?.targets ?? 1}
          oninput={(e) => setTargets(spell.id, Number(e.currentTarget.value))} />
        {#if !isAuto && !spell.isExtra}
          <input
            type="number"
            step="any"
            class="input-{buildId}"
            value={build.rotation.find((r) => r.id === spell.id)?.ratio ?? 1}
            oninput={(e) => setRatio(spell.id, Number(e.currentTarget.value))} />
        {:else if isAuto}
          <span class="phantom-input"></span>
        {/if}
        {#if !spell.isExtra}
          <RemoveButton onclick={() => removeRotation(spell.id)} />
        {/if}
        {#if spell.isExtra}
          <div class="extra-link">
            <span class="extra-link-tee"></span>
            <span class="extra-link-tee"></span>
          </div>
        {/if}
      </div>
    {:else if !spell.isExtra}
      <div class="add-placeholder">
        <button type="button" class="add-btn input-{buildId}" onclick={() => addRotation(spell.id)}>+</button>
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
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} {onCopyA} {onCopyB} bind:pasteTarget />
</tr>
{#if pasteTarget && !collapsed}
  <ClipboardPasteRow sectionTag={SECTION_TAG.rotation} {pasteTarget} {showSecondBuild} onPaste={handlePaste} />
{/if}

{#if !collapsed}
  <tr class="data-row">
    <td>
      <FuzzySelect selectType="spells" all={selectableSpells} selectedIds={rotationOrder} onAdd={addSpellToRotation} />
    </td>
    <td class="sub-header">
      {#if rotationOrder.length > 0}
        <div class="rotation-labels">
          <span>Targets</span>
          <span>Ratio</span>
        </div>
      {/if}
    </td>
    {#if showSecondBuild}
      <td class="sub-header">
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
        {@render rotationCell(buildA, "a", def, setTargetsA, setRatioA, addRotationA, removeRotationA)}
        {#if showSecondBuild}
          {@render rotationCell(buildB, "b", def, setTargetsB, setRatioB, addRotationB, removeRotationB)}
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

  .rotation-labels {
    display: flex;
    gap: 0.25rem;
    padding-right: 1.65rem; /* account for remove button width */
  }

  .rotation-labels span {
    flex: 1;
    text-align: center;
  }

  /* Reserves ratio-input space in auto-attack rows so layout matches other rows */
  .phantom-input {
    flex: 1 1 0;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.25rem 0.4rem;
    border: 1px solid transparent;
  }

  /* Extra spell connector lines */
  .extra-link {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    gap: 0.25rem;
    align-self: stretch;
    position: relative;
  }

  /* Horizontal line spanning from targets input to the right edge */
  .extra-link::before {
    content: "";
    position: absolute;
    top: 50%;
    left: -0.375rem; /* extend left to connect with targets input */
    right: 0.75rem; /* end at center of last tee to form right angle */
    border-top: 1px solid var(--text-muted);
    z-index: 0;
  }

  .extra-link-tee {
    position: relative;
  }

  .extra-link-tee:first-child {
    width: 3.5rem; /* match ratio input width */
  }

  .extra-link-tee:last-child {
    width: 1.8rem; /* approximate remove button width */
  }

  /* Vertical lines going up to connect with the primary spell row */
  .extra-link-tee::before {
    content: "";
    position: absolute;
    left: 50%;
    top: -1.2rem; /* extend up into primary row */
    z-index: 0;
    bottom: 50%;
    border-left: 1px solid var(--text-muted);
  }
</style>
