<script lang="ts">
  import { perks } from "@data/perks";
  import { spells } from "@data/spells";
  import { weapons, ammo } from "@data/weapons";
  import FuzzySelect from "./FuzzySelect.svelte";
  import type { Build, BuildStats, Vocation } from "@lib/build-state";

  const perkRegistry = new Map(perks.map((p) => [p.id, p]));
  const spellRegistry = new Map(spells.map((s) => [s.id, s]));
  const weaponRegistry = new Map(weapons.map((w) => [w.id, w]));
  const ammoRegistry = new Map(ammo.map((a) => [a.id, a]));

  const vocations: Vocation[] = ["knight", "paladin", "sorcerer", "druid", "monk"];

  export let buildA: Build;
  export let buildB: Build;
  export let showSecondBuild: boolean = false;

  function setStatA<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildA = { ...buildA, stats: { ...buildA.stats, [key]: value } };
  }
  function setStatB<K extends keyof BuildStats>(key: K, value: BuildStats[K]) {
    buildB = { ...buildB, stats: { ...buildB.stats, [key]: value } };
  }

  // Weapon helpers
  $: weaponA = weaponRegistry.get(buildA.weapon.id as string);
  $: weaponB = weaponRegistry.get(buildB.weapon.id as string);

  $: availableAmmoA = weaponA?.ammo ? ammo.filter((a) => a.type === weaponA.ammo) : [];
  $: availableAmmoB = weaponB?.ammo ? ammo.filter((a) => a.type === weaponB.ammo) : [];

  function setWeaponA(id: string) {
    const weapon = weaponRegistry.get(id);
    const currentAmmo = buildA.weapon.ammo ? ammoRegistry.get(buildA.weapon.ammo as string) : null;
    const keepAmmo = weapon?.ammo && currentAmmo && currentAmmo.type === weapon.ammo;
    buildA = {
      ...buildA,
      weapon: {
        id,
        ammo: keepAmmo ? buildA.weapon.ammo : undefined,
      },
    };
  }

  function setWeaponB(id: string) {
    const weapon = weaponRegistry.get(id);
    const currentAmmo = buildB.weapon.ammo ? ammoRegistry.get(buildB.weapon.ammo as string) : null;
    const keepAmmo = weapon?.ammo && currentAmmo && currentAmmo.type === weapon.ammo;
    buildB = {
      ...buildB,
      weapon: {
        id,
        ammo: keepAmmo ? buildB.weapon.ammo : undefined,
      },
    };
  }

  function setAmmoA(id: string) {
    buildA = { ...buildA, weapon: { ...buildA.weapon, ammo: id } };
  }

  function setAmmoB(id: string) {
    buildB = { ...buildB, weapon: { ...buildB.weapon, ammo: id } };
  }

  function clearWeaponA() {
    buildA = { ...buildA, weapon: { id: "fists", ammo: undefined } };
  }

  function clearWeaponB() {
    buildB = { ...buildB, weapon: { id: "fists", ammo: undefined } };
  }

  function clearAmmoA() {
    buildA = { ...buildA, weapon: { ...buildA.weapon, ammo: undefined } };
  }

  function clearAmmoB() {
    buildB = { ...buildB, weapon: { ...buildB.weapon, ammo: undefined } };
  }

  function addPerk(id: string) {
    buildA = { ...buildA, perks: [...buildA.perks, { id, value: 0 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, perks: [...buildB.perks, { id, value: 0 }] };
    }
  }

  // TODO defense against adding same spell twice
  function addSpellToRotation(id: string) {
    buildA = { ...buildA, rotation: [...buildA.rotation, { id, targets: 1, ratio: 1 }] };
    if (showSecondBuild) {
      buildB = { ...buildB, rotation: [...buildB.rotation, { id, targets: 1, ratio: 1 }] };
    }
  }

  let allSelectedPerkIds: string[] = [];
  $: {
    const currentIds = new Set([...buildA.perks.map((p) => p.id), ...buildB.perks.map((p) => p.id)]);
    // Remove IDs that are no longer in either build
    allSelectedPerkIds = allSelectedPerkIds.filter((id) => currentIds.has(id));
    // Add any new IDs that aren't in the order
    for (const id of currentIds) {
      if (!allSelectedPerkIds.includes(id)) {
        allSelectedPerkIds.push(id);
      }
    }
  }

  function setPerkValueA(id: string, v: number) {
    const exists = buildA.perks.some((p) => p.id === id);
    if (exists) {
      buildA.perks = buildA.perks.map((a) => (a.id === id ? { ...a, value: v } : a));
    } else {
      buildA.perks = [...buildA.perks, { id, value: v }];
    }
    buildA = buildA;
  }
  function setPerkValueB(id: string, v: number) {
    const exists = buildB.perks.some((p) => p.id === id);
    if (exists) {
      buildB.perks = buildB.perks.map((a) => (a.id === id ? { ...a, value: v } : a));
    } else {
      buildB.perks = [...buildB.perks, { id, value: v }];
    }
    buildB = buildB;
  }
  function removePerkA(id: string) {
    buildA = { ...buildA, perks: buildA.perks.filter((a) => a.id !== id) };
  }
  function removePerkB(id: string) {
    buildB = { ...buildB, perks: buildB.perks.filter((a) => a.id !== id) };
  }

  // TODO it's still not ideal - on page refresh, the order can get changed
  // Rotation helpers - maintain stable order, with auto-attack always first
  let allSelectedRotationIds: string[] = [];
  $: {
    const currentIds = new Set([...buildA.rotation.map((r) => r.id), ...buildB.rotation.map((r) => r.id)]);
    let filtered = allSelectedRotationIds.filter((id) => currentIds.has(id));
    for (const id of currentIds) {
      if (!filtered.includes(id)) {
        filtered.push(id);
      }
    }
    // Sort to always show auto-attack first
    allSelectedRotationIds = filtered.toSorted((a, b) => {
      if (a === "auto-attack") return -1;
      if (b === "auto-attack") return 1;
      return 0;
    });
  }

  function setRotationValueA(id: string, field: "targets" | "ratio", v: number) {
    const exists = buildA.rotation.some((r) => r.id === id);
    if (exists) {
      buildA.rotation = buildA.rotation.map((r) => (r.id === id ? { ...r, [field]: v } : r));
    } else {
      buildA.rotation = [
        ...buildA.rotation,
        { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 },
      ];
    }
    buildA = buildA;
  }
  function setRotationValueB(id: string, field: "targets" | "ratio", v: number) {
    const exists = buildB.rotation.some((r) => r.id === id);
    if (exists) {
      buildB.rotation = buildB.rotation.map((r) => (r.id === id ? { ...r, [field]: v } : r));
    } else {
      buildB.rotation = [
        ...buildB.rotation,
        { id, targets: field === "targets" ? v : 1, ratio: field === "ratio" ? v : 1 },
      ];
    }
    buildB = buildB;
  }

  function addRotationA(id: string) {
    buildA.rotation = [...buildA.rotation, { id, targets: 1, ratio: 1 }];
    buildA = buildA;
  }
  function addRotationB(id: string) {
    buildB.rotation = [...buildB.rotation, { id, targets: 1, ratio: 1 }];
    buildB = buildB;
  }
  function removeRotationA(id: string) {
    buildA = { ...buildA, rotation: buildA.rotation.filter((a) => a.id !== id) };
  }
  function removeRotationB(id: string) {
    buildB = { ...buildB, rotation: buildB.rotation.filter((a) => a.id !== id) };
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
    { key: "critChance", label: "Crit Chance %" },
    { key: "critDamage", label: "Crit Damage %" },
    { key: "fatalChance", label: "Fatal Chance %", advanced: true },
    { key: "shielding", label: "Shielding", advanced: true },
    { key: "fishing", label: "Fishing", advanced: true },
  ];

  $: basicFields = statFields.filter((f) => !f.advanced);
  $: visibleFields = showAdvanced ? statFields : basicFields;

  const isAutoAttack = (id: string) => id === "auto-attack";

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
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

    <!-- Vocation dropdown -->
    <tr class="data-row">
      <td>Vocation</td>
      <td>
        <select
          class="vocation-select input-a"
          value={buildA.stats.vocation}
          on:change={(e) => setStatA("vocation", e.currentTarget.value as Vocation)}>
          {#each vocations as voc}
            <option value={voc}>{capitalize(voc)}</option>
          {/each}
        </select>
      </td>
      {#if showSecondBuild}
        <td>
          <select
            class="vocation-select input-b"
            value={buildB.stats.vocation}
            on:change={(e) => setStatB("vocation", e.currentTarget.value as Vocation)}>
            {#each vocations as voc}
              <option value={voc}>{capitalize(voc)}</option>
            {/each}
          </select>
        </td>
      {/if}
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

    <!-- ==================== WEAPON SECTION ==================== -->

    <tr class="section-header">
      <td><h4>Weapon</h4></td>
      <td>
        <FuzzySelect selectType="weapons" all={weapons} selectedIds={[]} onAdd={setWeaponA} />
      </td>
      {#if showSecondBuild}
        <td>
          <FuzzySelect selectType="weapons" all={weapons} selectedIds={[]} onAdd={setWeaponB} />
        </td>
      {/if}
    </tr>
    <tr class="data-row">
      <td></td>
      <td>
        {#if weaponA}
          <div class="selected-item input-with-remove">
            <span class="selected-name selected-name-a">{weaponA.name}</span>
            {#if weaponA.id !== "fists"}
              <button type="button" class="remove-btn push-right" aria-label="Clear" on:click={clearWeaponA}>×</button>
            {/if}
          </div>
        {/if}
      </td>
      {#if showSecondBuild}
        <td>
          {#if weaponB}
            <div class="selected-item">
              <span class="selected-name selected-name-b">{weaponB.name}</span>
              {#if weaponB.id !== "fists"}
                <button type="button" class="remove-btn" aria-label="Clear" on:click={clearWeaponB}>×</button>
              {/if}
            </div>
          {/if}
        </td>
      {/if}
    </tr>

    {#if weaponA?.ammo || (showSecondBuild && weaponB?.ammo)}
      <tr class="data-row">
        <td></td>
        <td>
          {#if weaponA?.ammo}
            <FuzzySelect selectType="ammo" all={availableAmmoA} selectedIds={[]} onAdd={setAmmoA} />
          {/if}
        </td>
        {#if showSecondBuild}
          <td>
            {#if weaponB?.ammo}
              <FuzzySelect selectType="ammo" all={availableAmmoB} selectedIds={[]} onAdd={setAmmoB} />
            {/if}
          </td>
        {/if}
      </tr>
      <tr class="data-row">
        <td></td>
        <td>
          {#if weaponA?.ammo}
            {#if buildA.weapon.ammo}
              {@const selectedAmmo = ammoRegistry.get(buildA.weapon.ammo as string)}
              {#if selectedAmmo}
                <div class="selected-item">
                  <span class="selected-name selected-name-a">{selectedAmmo.name}</span>
                  <button type="button" class="remove-btn" aria-label="Clear" on:click={clearAmmoA}>×</button>
                </div>
              {/if}
            {/if}
          {/if}
        </td>
        {#if showSecondBuild}
          <td>
            {#if weaponB?.ammo}
              {#if buildB.weapon.ammo}
                {@const selectedAmmo = ammoRegistry.get(buildB.weapon.ammo as string)}
                {#if selectedAmmo}
                  <div class="selected-item">
                    <span class="selected-name selected-name-b">{selectedAmmo.name}</span>
                    <button type="button" class="remove-btn" aria-label="Clear" on:click={clearAmmoB}>×</button>
                  </div>
                {/if}
              {/if}
            {/if}
          </td>
        {/if}
      </tr>
    {/if}

    <!-- ==================== PERKS SECTION ==================== -->
    <tr class="section-header">
      <td><h4>Perks</h4></td>
      <td></td>
      {#if showSecondBuild}<td></td>{/if}
    </tr>

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
                  on:input={(e) => setPerkValueA(id, Number(e.currentTarget.value))} />
                <button type="button" class="remove-btn" aria-label="Remove" on:click={() => removePerkA(id)}>×</button>
              </div>
            {:else}
              <div class="add-placeholder">
                <button
                  type="button"
                  class="add-btn input-a"
                  aria-label="Add to Build A"
                  on:click={() => setPerkValueA(id, 0)}>
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
                    on:input={(e) => setPerkValueB(id, Number(e.currentTarget.value))} />
                  <button type="button" class="remove-btn" aria-label="Remove" on:click={() => removePerkB(id)}>
                    ×
                  </button>
                </div>
              {:else}
                <div class="add-placeholder">
                  <button
                    type="button"
                    class="add-btn input-b"
                    aria-label="Add to Build B"
                    on:click={() => setPerkValueB(id, 0)}>
                    +
                  </button>
                </div>
              {/if}
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
        <FuzzySelect selectType="spells" all={spells} selectedIds={allSelectedRotationIds} onAdd={addSpellToRotation} />
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
                  on:input={(e) => setRotationValueA(id, "targets", Number(e.currentTarget.value))} />
                {#if !isAuto}
                  <input
                    type="number"
                    step="any"
                    class="input-a small"
                    value={buildA.rotation.find((r) => r.id === id)?.ratio ?? 1}
                    on:input={(e) => setRotationValueA(id, "ratio", Number(e.currentTarget.value))} />
                {/if}
                <button
                  type="button"
                  class="remove-btn"
                  class:push-right={isAuto}
                  aria-label="Remove"
                  on:click={() => removeRotationA(id)}>
                  ×
                </button>
              </div>
            {:else}
              <div class="add-placeholder">
                <button
                  type="button"
                  class="add-btn input-a"
                  aria-label="Add to Build A"
                  on:click={() => addRotationA(id)}>
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
                    on:input={(e) => setRotationValueB(id, "targets", Number(e.currentTarget.value))} />
                  {#if !isAuto}
                    <input
                      type="number"
                      step="any"
                      class="input-b small"
                      value={buildB.rotation.find((r) => r.id === id)?.ratio ?? 1}
                      on:input={(e) => setRotationValueB(id, "ratio", Number(e.currentTarget.value))} />
                  {/if}
                  <button
                    type="button"
                    class="remove-btn"
                    class:push-right={isAuto}
                    aria-label="Remove"
                    on:click={() => removeRotationB(id)}>
                    ×
                  </button>
                </div>
              {:else}
                <div class="add-placeholder">
                  <button
                    type="button"
                    class="add-btn input-b"
                    aria-label="Add to Build B"
                    on:click={() => addRotationB(id)}>
                    +
                  </button>
                </div>
              {/if}
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
    width: 170px;
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

  .vocation-select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.25rem 0.4rem;
    font: inherit;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.25rem;
    background: hsl(220 10% 15%);
    color: inherit;
    cursor: pointer;
  }

  .vocation-select.input-a {
    border-color: hsl(210, 50%, 40%);
  }

  .vocation-select.input-b {
    border-color: hsl(30, 50%, 40%);
  }

  .vocation-select:focus {
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
    flex: 1 1 0;
    min-width: 0;
    width: auto;
  }

  .input-with-remove input[type="number"].small {
    flex: 0 0 auto;
    width: 3.5rem;
  }

  .input-with-remove input[type="number"].small:nth-child(2) {
    margin-left: auto;
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

  .remove-btn.push-right {
    margin-left: auto;
  }

  .remove-btn:hover {
    background: hsl(0, 50%, 30%);
    border-color: hsl(0, 50%, 40%);
  }

  /* Add placeholder and button */
  .add-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-btn {
    padding: 0.25rem 0.75rem;
    font-size: 1rem;
    line-height: 1;
    background: transparent;
    border: 1px dashed hsl(0 0% 40%);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition:
      opacity 0.15s,
      background-color 0.15s;
  }

  .add-btn:hover {
    opacity: 1;
    background: hsl(220 10% 20%);
  }

  .add-btn.input-a {
    border-color: hsl(210, 50%, 40%);
  }

  .add-btn.input-a:hover {
    background: hsl(210, 30%, 25%);
  }

  .add-btn.input-b {
    border-color: hsl(30, 50%, 40%);
  }

  .add-btn.input-b:hover {
    background: hsl(30, 30%, 25%);
  }

  td :global(.fuzzy-select) {
    width: 100%;
  }

  .selected-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .selected-name {
    font-size: 0.9rem;
    text-decoration-line: underline;
    text-decoration-thickness: 0.1rem;
  }
  .selected-name-a {
    text-decoration-color: hsl(210, 50%, 40%);
  }
  .selected-name-b {
    text-decoration-color: hsl(30, 50%, 40%);
  }
</style>
