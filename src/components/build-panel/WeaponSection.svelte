<script lang="ts">
  import ClipboardPasteRow from "@components/build-panel/ClipboardPasteRow.svelte";
  import SectionCopyButtons from "@components/build-panel/SectionCopyButtons.svelte";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import { allAmmo, allWeapons } from "@data/weapons";
  import type { Build } from "@lib/build-state";
  import { packSection, SECTION_TAG } from "@lib/section-clipboard";
  import { compactWeapon, expandWeapon } from "@lib/url-pack";

  let {
    buildA = $bindable(),
    buildB = $bindable(),
    showSecondBuild,
    collapsed = $bindable(false),
  }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
  } = $props();

  const weaponRegistry = new Map(allWeapons.map((w) => [w.id, w]));
  const ammoRegistry = new Map(allAmmo.map((a) => [a.id, a]));

  let weaponsForA = $derived(
    allWeapons
      .filter((i) => i.vocations.includes(buildA.stats.vocation))
      .sort((a, b) => a.vocations.length - b.vocations.length),
  );
  let weaponsForB = $derived(
    allWeapons
      .filter((i) => i.vocations.includes(buildB.stats.vocation))
      .sort((a, b) => a.vocations.length - b.vocations.length),
  );

  let weaponA = $derived(weaponRegistry.get(buildA.weapon.id));
  let weaponB = $derived(weaponRegistry.get(buildB.weapon.id));

  let availableAmmoA = $derived(weaponA?.ammo ? allAmmo.filter((a) => a.type === weaponA.ammo) : []);
  let availableAmmoB = $derived(weaponB?.ammo ? allAmmo.filter((a) => a.type === weaponB.ammo) : []);

  function setWeaponA(id: number) {
    const weapon = weaponRegistry.get(id);
    const currentAmmo = buildA.weapon.ammoId ? ammoRegistry.get(buildA.weapon.ammoId) : null;
    const keepAmmo = weapon?.ammo && currentAmmo && currentAmmo.type === weapon.ammo;
    buildA = {
      ...buildA,
      weapon: {
        id,
        ammoId: keepAmmo ? buildA.weapon.ammoId : undefined,
      },
    };
  }

  function setWeaponB(id: number) {
    const weapon = weaponRegistry.get(id);
    const currentAmmo = buildB.weapon.ammoId ? ammoRegistry.get(buildB.weapon.ammoId) : null;
    const keepAmmo = weapon?.ammo && currentAmmo && currentAmmo.type === weapon.ammo;
    buildB = {
      ...buildB,
      weapon: {
        id,
        ammoId: keepAmmo ? buildB.weapon.ammoId : undefined,
      },
    };
  }

  function setAmmoA(id: number) {
    buildA = { ...buildA, weapon: { ...buildA.weapon, ammoId: id } };
  }

  function setAmmoB(id: number) {
    buildB = { ...buildB, weapon: { ...buildB.weapon, ammoId: id } };
  }

  function clearWeaponA() {
    buildA = { ...buildA, weapon: { id: 1, ammoId: undefined } };
  }

  function clearWeaponB() {
    buildB = { ...buildB, weapon: { id: 1, ammoId: undefined } };
  }

  function clearAmmoA() {
    buildA = { ...buildA, weapon: { ...buildA.weapon, ammoId: undefined } };
  }

  function clearAmmoB() {
    buildB = { ...buildB, weapon: { ...buildB.weapon, ammoId: undefined } };
  }

  function copyAtoB() {
    buildB = { ...buildB, weapon: { ...buildA.weapon } };
  }
  function copyBtoA() {
    buildA = { ...buildA, weapon: { ...buildB.weapon } };
  }

  let pasteTarget: "a" | "b" | null = $state(null);

  function onCopyA(): string {
    return packSection(SECTION_TAG.weapon, compactWeapon(buildA.weapon));
  }
  function onCopyB(): string {
    return packSection(SECTION_TAG.weapon, compactWeapon(buildB.weapon));
  }
  function handlePaste(data: unknown) {
    const weapon = expandWeapon(data as any);
    if (pasteTarget === "a") {
      buildA = { ...buildA, weapon };
    } else {
      buildB = { ...buildB, weapon };
    }
    pasteTarget = null;
  }
</script>

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Weapon
      </button>
    </h4>
  </td>
  <SectionCopyButtons {showSecondBuild} {collapsed} {copyAtoB} {copyBtoA} {onCopyA} {onCopyB} bind:pasteTarget />
</tr>
{#if pasteTarget && !collapsed}
  <ClipboardPasteRow sectionTag={SECTION_TAG.weapon} {pasteTarget} {showSecondBuild} onPaste={handlePaste} />
{/if}
{#if !collapsed}
  <tr class="data-row">
    <td></td>
    <td>
      <FuzzySelect selectType="weapons" build="a" all={weaponsForA} selectedIds={[]} onAdd={setWeaponA} />
    </td>
    {#if showSecondBuild}
      <td>
        <FuzzySelect selectType="weapons" build="b" all={weaponsForB} selectedIds={[]} onAdd={setWeaponB} />
      </td>
    {/if}
  </tr>
  <tr class="data-row">
    <td></td>
    <td>
      {#if weaponA}
        <div class="selected-item">
          <span class="selected-name selected-name-a">{weaponA.name}</span>
          {#if weaponA.id !== 1}
            <RemoveButton onclick={clearWeaponA} />
          {/if}
        </div>
      {/if}
    </td>
    {#if showSecondBuild}
      <td>
        {#if weaponB}
          <div class="selected-item">
            <span class="selected-name selected-name-b">{weaponB.name}</span>
            {#if weaponB.id !== 1}
              <RemoveButton onclick={clearWeaponB} />
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
          <FuzzySelect selectType="ammo" build="a" all={availableAmmoA} selectedIds={[]} onAdd={setAmmoA} />
        {/if}
      </td>
      {#if showSecondBuild}
        <td>
          {#if weaponB?.ammo}
            <FuzzySelect selectType="ammo" build="b" all={availableAmmoB} selectedIds={[]} onAdd={setAmmoB} />
          {/if}
        </td>
      {/if}
    </tr>
    <tr class="data-row">
      <td></td>
      <td>
        {#if weaponA?.ammo}
          {#if buildA.weapon.ammoId}
            {@const selectedAmmo = ammoRegistry.get(buildA.weapon.ammoId)}
            {#if selectedAmmo}
              <div class="selected-item">
                <span class="selected-name selected-name-a">{selectedAmmo.name}</span>
                <RemoveButton onclick={clearAmmoA} />
              </div>
            {/if}
          {/if}
        {/if}
      </td>
      {#if showSecondBuild}
        <td>
          {#if weaponB?.ammo}
            {#if buildB.weapon.ammoId}
              {@const selectedAmmo = ammoRegistry.get(buildB.weapon.ammoId)}
              {#if selectedAmmo}
                <div class="selected-item">
                  <span class="selected-name selected-name-b">{selectedAmmo.name}</span>
                  <RemoveButton onclick={clearAmmoB} />
                </div>
              {/if}
            {/if}
          {/if}
        </td>
      {/if}
    </tr>
  {/if}
{/if}

<style>
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
    text-decoration-color: var(--build-a-border);
  }
  .selected-name-b {
    text-decoration-color: var(--build-b-border);
  }
</style>
