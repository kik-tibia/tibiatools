<script lang="ts">
  import { perks } from "@data/perks";
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
    perkOrder = $bindable(),
  }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
    perkOrder: number[];
  } = $props();

  const perkRegistry = new Map(perks.map((p) => [p.id, p]));
  const selectablePerks = $derived(
    perks.filter((p) => {
      if (p.spell) {
        const spell = spells.find((s) => s.scope == p.scope);
        return (
          spell?.vocations.includes(buildA.stats.vocation) ||
          (showSecondBuild && spell?.vocations.includes(buildB.stats.vocation))
        );
      } else return true;
    }),
  );

  function addPerk(id: number) {
    buildA = { ...buildA, perks: [...buildA.perks, { id, value: 0 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: 0 }] };
    }
    if (!perkOrder.includes(id)) {
      perkOrder = [...perkOrder, id];
    }
  }

  function setPerkValueA(id: number, v: number) {
    const exists = buildA.perks.some((p) => p.id === id);
    if (exists) {
      buildA = { ...buildA, perks: buildA.perks.map((a) => (a.id === id ? { ...a, value: v } : a)) };
    } else {
      buildA = { ...buildA, perks: [...buildA.perks, { id, value: v }] };
    }
  }
  function setPerkValueB(id: number, v: number) {
    const exists = buildB.perks.some((p) => p.id === id);
    if (exists) {
      buildB = { ...buildB, perks: buildB.perks.map((a) => (a.id === id ? { ...a, value: v } : a)) };
    } else {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: v }] };
    }
  }
  function removePerkA(id: number) {
    buildA = { ...buildA, perks: buildA.perks.filter((a) => a.id !== id) };
    if (!buildB.perks.some((p) => p.id === id)) {
      perkOrder = perkOrder.filter((x) => x !== id);
    }
  }
  function removePerkB(id: number) {
    buildB = { ...buildB, perks: buildB.perks.filter((a) => a.id !== id) };
    if (!buildA.perks.some((p) => p.id === id)) {
      perkOrder = perkOrder.filter((x) => x !== id);
    }
  }

  function copyAtoB() {
    buildB = { ...buildB, perks: buildA.perks.map((p) => ({ ...p })) };
  }
  function copyBtoA() {
    buildA = { ...buildA, perks: buildB.perks.map((p) => ({ ...p })) };
  }
</script>

{#snippet perkCell(
  build: Build,
  buildId: string,
  perkId: number,
  setPerkValue: (id: number, value: number) => void,
  removePerk: (id: number) => void,
)}
  {@const binary = perkRegistry.get(perkId)?.bonusType === "runic-mastery"}
  <td>
    {#if build.perks.some((p) => p.id === perkId)}
      <div class="input-with-remove">
        {#if binary}
          <input type="text" readonly class="input-{buildId} perk-toggle" value="✓" tabindex="-1" />
        {:else}
          <input
            type="number"
            step="any"
            class="input-{buildId}"
            value={build.perks.find((p) => p.id === perkId)?.value ?? 0}
            oninput={(e) => setPerkValue(perkId, Number(e.currentTarget.value))} />
        {/if}
        <RemoveButton onclick={() => removePerk(perkId)} />
      </div>
    {:else}
      <div class="add-placeholder">
        <button type="button" class="add-btn input-{buildId}" onclick={() => setPerkValue(perkId, 0)}>+</button>
      </div>
    {/if}
  </td>
{/snippet}

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Perks
      </button>
    </h4>
  </td>
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} />
</tr>

{#if !collapsed}
  <tr class="data-row">
    <td>
      <FuzzySelect selectType="perks" all={selectablePerks} selectedIds={perkOrder} onAdd={addPerk} />
    </td>
    <td></td>
    {#if showSecondBuild}<td></td>{/if}
  </tr>

  {#each perkOrder as id (id)}
    {@const def = perkRegistry.get(id)}
    {#if def}
      <tr class="data-row">
        <td class="item-name">{def.name}</td>
        {@render perkCell(buildA, "a", id, setPerkValueA, removePerkA)}
        {#if showSecondBuild}
          {@render perkCell(buildB, "b", id, setPerkValueB, removePerkB)}
        {/if}
      </tr>
    {/if}
  {/each}
{/if}
