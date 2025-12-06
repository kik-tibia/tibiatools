<script lang="ts">
  import { perks } from "@data/perks";
  import { spells } from "@data/spells";
  import FuzzySelect from "./FuzzySelect.svelte";
  import type { Build, BuildStats } from "@lib/build-state";
  import type { RotationSpell } from "@lib/damage-calc";

  const perkRegistry = new Map(perks.map((p) => [p.id, p]));
  const spellRegistry = new Map(spells.map((s) => [s.id, s]));

  export let buildA: Build;
  export let buildB: Build;
  export let showSecondBuild: boolean = false;
  export let rotationA: RotationSpell[] = [];
  export let rotationB: RotationSpell[] = [];

  function setStatA<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildA = { ...buildA, stats: { ...buildA.stats, [key]: value } };
  }
  function setStatB<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildB = { ...buildB, stats: { ...buildB.stats, [key]: value } };
  }

  function addPerk(id: string) {
    buildA = { ...buildA, perks: [...buildA.perks, { id, value: 0 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: 0 }] };
    }
  }

  function addSpellToRotation(id: string) {
    if (rotationA.some((r) => r.id === id)) return;
    rotationA = [...rotationA, { id, targets: 1, ratio: 1 }];
    if (showSecondBuild) {
      rotationB = [...rotationB, { id, targets: 1, ratio: 1 }];
    }
  }

  // Perk helpers
  $: allPerkIds = [...new Set([...buildA.perks.map((p) => p.id), ...buildB.perks.map((p) => p.id)])];

  function getPerkValueA(id: string): number {
    return buildA.perks.find((p) => p.id === id)?.value ?? 0;
  }
  function getPerkValueB(id: string): number {
    return buildB.perks.find((p) => p.id === id)?.value ?? 0;
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

  // Rotation helpers
  $: allRotationIds = [...new Set([...rotationA.map((r) => r.id), ...rotationB.map((r) => r.id)])];

  function getRotationA(id: string): RotationSpell {
    return rotationA.find((r) => r.id === id) ?? { id, targets: 1, ratio: 1 };
  }
  function getRotationB(id: string): RotationSpell {
    return rotationB.find((r) => r.id === id) ?? { id, targets: 1, ratio: 1 };
  }
  function setRotationValueA(id: string, field: "targets" | "ratio", v: number) {
    const exists = rotationA.some((r) => r.id === id);
    if (exists) {
      rotationA = rotationA.map((r) => (r.id === id ? { ...r, [field]: v } : r));
    } else {
      rotationA = [...rotationA, { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 }];
    }
  }
  function setRotationValueB(id: string, field: "targets" | "ratio", v: number) {
    const exists = rotationB.some((r) => r.id === id);
    if (exists) {
      rotationB = rotationB.map((r) => (r.id === id ? { ...r, [field]: v } : r));
    } else {
      rotationB = [...rotationB, { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 }];
    }
  }
  function removeRotationA(id: string) {
    rotationA = rotationA.filter((r) => r.id !== id);
  }
  function removeRotationB(id: string) {
    rotationB = rotationB.filter((r) => r.id !== id);
  }

  let showAdvanced = false;

  type StatField = {
    key: keyof BuildStats;
    label: string;
    advanced?: boolean;
  };

  const statFields: StatField[] = [
    { key: "level", label: "Level" },
    { key: "bonus", label: "Bonus Damage" },
    { key: "magicLevel", label: "Magic Level" },
    { key: "skill", label: "Skill" },
    { key: "weapon", label: "Weapon Attack" },
    { key: "critChance", label: "Crit Chance %" },
    { key: "critDamage", label: "Crit Damage %" },
    { key: "fatalChance", label: "Fatal Chance %", advanced: true },
    { key: "shielding", label: "Shielding", advanced: true },
    { key: "fishing", label: "Fishing", advanced: true },
  ];

  $: basicFields = statFields.filter((f) => !f.advanced);
  $: visibleFields = showAdvanced ? statFields : basicFields;
</script>

<table class="build-table" class:two-builds={showSecondBuild}>
  <colgroup>
    <col class="col-labels" />
    <col class="col-build" />
    {#if showSecondBuild}
      <col class="col-build" />
    {/if}
  </colgroup>
  <thead>
    <tr>
      <th>Build Stats</th>
      <th>
        {#if showSecondBuild}
          <span class="build-label build-a">Build A</span>
        {/if}
      </th>
      {#if showSecondBuild}
        <th>
          <span class="build-label build-b">Build B</span>
        </th>
      {/if}
    </tr>
  </thead>
  <tbody>
    <!-- ==================== BASIC STATS SECTION ==================== -->
    <tr class="section-header">
      <td><h4>Basic Stats</h4></td>
      <td></td>
      {#if showSecondBuild}<td></td>{/if}
    </tr>

    {#each visibleFields as field}
      <tr class="data-row">
        <td>{field.label}</td>
        <td>
          <input
            type="number"
            step="any"
            inputmode="numeric"
            class="input-a"
            value={buildA.stats[field.key]}
            on:input={(e) =>
              setStatA(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
        </td>
        {#if showSecondBuild}
          <td>
            <input
              type="number"
              step="any"
              inputmode="numeric"
              class="input-b"
              value={buildB.stats[field.key]}
              on:input={(e) =>
                setStatB(field.key, e.currentTarget.value === "" ? null : Number(e.currentTarget.value))} />
          </td>
        {/if}
      </tr>
    {/each}

    <tr class="data-row">
      <td>
        <button type="button" class="toggle-advanced" on:click={() => (showAdvanced = !showAdvanced)}>
          {showAdvanced ? "▼ Less stats" : "▶ More stats"}
        </button>
      </td>
      <td></td>
      {#if showSecondBuild}<td></td>{/if}
    </tr>

    <!-- ==================== PERKS SECTION ==================== -->
    <tr class="section-header">
      <td><h4>Perks</h4></td>
      <td></td>
      {#if showSecondBuild}<td></td>{/if}
    </tr>

    <tr class="data-row">
      <td>
        <FuzzySelect selectType="perks" all={perks} selectedIds={allPerkIds} onAdd={addPerk} />
      </td>
      <td></td>
      {#if showSecondBuild}<td></td>{/if}
    </tr>

    {#each allPerkIds as id (id)}
      {@const def = perkRegistry.get(id)}
      {#if def}
        <tr class="data-row">
          <td class="item-name">{def.name}</td>
          <td>
            <div class="input-with-remove">
              <input
                type="number"
                step="any"
                class="input-a"
                value={getPerkValueA(id)}
                on:input={(e) => setPerkValueA(id, Number(e.currentTarget.value))} />
              <button type="button" class="remove-btn" aria-label="Remove" on:click={() => removePerkA(id)}>×</button>
            </div>
          </td>
          {#if showSecondBuild}
            <td>
              <div class="input-with-remove">
                <input
                  type="number"
                  step="any"
                  class="input-b"
                  value={getPerkValueB(id)}
                  on:input={(e) => setPerkValueB(id, Number(e.currentTarget.value))} />
                <button type="button" class="remove-btn" aria-label="Remove" on:click={() => removePerkB(id)}>×</button>
              </div>
            </td>
          {/if}
        </tr>
      {/if}
    {/each}

    <!-- ==================== ROTATION SECTION ==================== -->
    <tr class="section-header">
      <td><h4>Rotation</h4></td>
      <td></td>
      {#if showSecondBuild}<td></td>{/if}
    </tr>

    <tr class="data-row">
      <td>
        <FuzzySelect
          selectType="spells"
          all={spells.filter((s) => s.id !== "auto-attack")}
          selectedIds={allRotationIds}
          onAdd={addSpellToRotation} />
      </td>
      <td class="sub-header rotation-label-cell">
        {#if allRotationIds.length > 0}
          <div class="rotation-labels">
            <span>Targets</span>
            <span>Ratio</span>
          </div>
        {/if}
      </td>
      {#if showSecondBuild}
        <td class="sub-header rotation-label-cell">
          {#if allRotationIds.length > 0}
            <div class="rotation-labels">
              <span>Targets</span>
              <span>Ratio</span>
            </div>
          {/if}
        </td>
      {/if}
    </tr>

    {#each allRotationIds as id (id)}
      {@const def = spellRegistry.get(id)}
      {@const rotA = getRotationA(id)}
      {@const rotB = getRotationB(id)}
      {#if def}
        <tr class="data-row">
          <td class="item-name">{def.name}</td>
          <td>
            <div class="input-with-remove">
              <input
                type="number"
                step="any"
                class="input-a small"
                value={rotA.targets}
                on:input={(e) => setRotationValueA(id, "targets", Number(e.currentTarget.value))} />
              <input
                type="number"
                step="any"
                class="input-a small"
                value={rotA.ratio}
                on:input={(e) => setRotationValueA(id, "ratio", Number(e.currentTarget.value))} />
              <button type="button" class="remove-btn" aria-label="Remove" on:click={() => removeRotationA(id)}>
                ×
              </button>
            </div>
          </td>
          {#if showSecondBuild}
            <td>
              <div class="input-with-remove">
                <input
                  type="number"
                  step="any"
                  class="input-b small"
                  value={rotB.targets}
                  on:input={(e) => setRotationValueB(id, "targets", Number(e.currentTarget.value))} />
                <input
                  type="number"
                  step="any"
                  class="input-b small"
                  value={rotB.ratio}
                  on:input={(e) => setRotationValueB(id, "ratio", Number(e.currentTarget.value))} />
                <button type="button" class="remove-btn" aria-label="Remove" on:click={() => removeRotationB(id)}>
                  ×
                </button>
              </div>
            </td>
          {/if}
        </tr>
      {/if}
    {/each}
  </tbody>
</table>

<style>
  .build-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    border: 1px solid hsl(0 0% 30%);
  }

  col.col-build {
    width: 160px;
  }

  /* Header row */
  thead th {
    background: hsl(220 10% 18%);
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid hsl(0 0% 30%);
  }

  /* All cells get vertical borders */
  tbody td {
    padding: 0.35rem 0.75rem;
    border-left: 1px solid hsl(0 0% 30%);
    border-right: 1px solid hsl(0 0% 30%);
    vertical-align: middle;
  }

  /* Section header rows get top border */
  .section-header td {
    border-top: 1px solid hsl(0 0% 30%);
    padding-top: 0.6rem;
    padding-bottom: 0.4rem;
  }

  /* Last row of table needs bottom border */
  tbody tr:last-child td {
    border-bottom: 1px solid hsl(0 0% 30%);
  }

  /* Build labels */
  .build-label {
    display: inline-block;
    text-align: center;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .build-label.build-a {
    background: rgba(100, 180, 255, 0.2);
    color: hsl(210, 80%, 70%);
  }

  .build-label.build-b {
    background: rgba(255, 180, 100, 0.2);
    color: hsl(30, 80%, 70%);
  }

  /* Section headers */
  h4 {
    margin: 0;
  }

  .sub-header {
    font-size: 0.75rem;
    color: hsl(0 0% 60%);
  }

  .rotation-label-cell {
    padding-bottom: 0;
    vertical-align: bottom;
  }

  /* Rotation labels - align with inputs below */
  .rotation-labels {
    display: flex;
    gap: 0.25rem;
    padding-right: 1.65rem; /* account for remove button width */
  }

  .rotation-labels span {
    flex: 1;
    text-align: center;
  }

  /* Item names (perks, spells) */
  .item-name {
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    box-sizing: border-box;
  }

  /* Inputs */
  input[type="number"] {
    padding: 0.25rem 0.4rem;
    font: inherit;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    background: hsl(220 10% 15%);
    color: inherit;
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input.input-a {
    border-color: hsl(210, 50%, 40%);
  }

  input.input-b {
    border-color: hsl(30, 50%, 40%);
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 0 2px hsl(220 90% 65% / 0.3);
  }

  /* Input with remove button */
  .input-with-remove {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .input-with-remove input[type="number"] {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  /* Toggle button */
  .toggle-advanced {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 0;
    text-align: left;
  }

  .toggle-advanced:hover {
    color: hsl(220 90% 70%);
  }

  /* Remove button */
  .remove-btn {
    padding: 0.1rem 0.4rem;
    font-size: 1rem;
    line-height: 1;
    background: transparent;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    background: hsl(0, 50%, 30%);
    border-color: hsl(0, 50%, 40%);
  }

  td :global(.fuzzy-select) {
    width: 100%;
  }
</style>
