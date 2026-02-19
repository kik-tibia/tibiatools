<script lang="ts">
  import { weapons, ammo } from "@data/weapons";
  import FuzzySelect from "@components/FuzzySelect.svelte";
  import RemoveButton from "@components/RemoveButton.svelte";
  import type { Build } from "@lib/build-state";

  let { buildA = $bindable(), buildB = $bindable(), showSecondBuild, collapsed = $bindable(false) }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild: boolean;
    collapsed: boolean;
  } = $props();

  const weaponRegistry = new Map(weapons.map((w) => [w.id, w]));
  const ammoRegistry = new Map(ammo.map((a) => [a.id, a]));

  let weaponsForA = $derived(
    weapons
      .filter((i) => i.vocations.includes(buildA.stats.vocation))
      .sort((a, b) => a.vocations.length - b.vocations.length),
  );
  let weaponsForB = $derived(
    weapons
      .filter((i) => i.vocations.includes(buildB.stats.vocation))
      .sort((a, b) => a.vocations.length - b.vocations.length),
  );

  let weaponA = $derived(weaponRegistry.get(buildA.weapon.id as string));
  let weaponB = $derived(weaponRegistry.get(buildB.weapon.id as string));

  let availableAmmoA = $derived(weaponA?.ammo ? ammo.filter((a) => a.type === weaponA.ammo) : []);
  let availableAmmoB = $derived(weaponB?.ammo ? ammo.filter((a) => a.type === weaponB.ammo) : []);

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
</script>

<tr class="section-header">
  <td>
    <h4>
      <button class="section-toggle" onclick={() => (collapsed = !collapsed)}>
        {collapsed ? "▶" : "▼"} Weapon
      </button>
    </h4>
  </td>
  <td>
    {#if !collapsed}
      <FuzzySelect selectType="weapons" all={weaponsForA} selectedIds={[]} onAdd={setWeaponA} />
    {/if}
  </td>
  {#if showSecondBuild}
    <td>
      {#if !collapsed}
        <FuzzySelect selectType="weapons" all={weaponsForB} selectedIds={[]} onAdd={setWeaponB} />
      {/if}
    </td>
  {/if}
</tr>
{#if !collapsed}
<tr class="data-row">
  <td></td>
  <td>
    {#if weaponA}
      <div class="selected-item input-with-remove">
        <span class="selected-name selected-name-a">{weaponA.name}</span>
        {#if weaponA.id !== "fists"}
          <RemoveButton pushRight onclick={clearWeaponA} />
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
              <RemoveButton onclick={clearAmmoA} />
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
