<script lang="ts">
  import BuildBadge from "@components/BuildBadge.svelte";
  import BasicStatsSection from "@components/build-panel/BasicStatsSection.svelte";
  import AdvancedStatsSection from "@components/build-panel/AdvancedStatsSection.svelte";
  import WeaponSection from "@components/build-panel/WeaponSection.svelte";
  import PerksSection from "@components/build-panel/PerksSection.svelte";
  import RotationSection from "@components/build-panel/RotationSection.svelte";
  import type { Build, CollapsedSections } from "@lib/build-state";
  import "@styles/build-table.css";

  let {
    buildA = $bindable(),
    buildB = $bindable(),
    perkOrder = $bindable(),
    rotationOrder = $bindable(),
    showSecondBuild = false,
    collapsed = $bindable(),
  }: {
    buildA: Build;
    buildB: Build;
    perkOrder: number[];
    rotationOrder: number[];
    showSecondBuild?: boolean;
    collapsed: CollapsedSections;
  } = $props();
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
          <BuildBadge build="a">Build A</BuildBadge>
        {/if}
      </th>
      {#if showSecondBuild}
        <th>
          <BuildBadge build="b">Build B</BuildBadge>
        </th>
      {/if}
    </tr>
  </thead>
  <tbody>
    <BasicStatsSection bind:buildA bind:buildB {showSecondBuild} bind:collapsed={collapsed.basicStats} />
    <AdvancedStatsSection bind:buildA bind:buildB {showSecondBuild} bind:collapsed={collapsed.advancedStats} />
    <WeaponSection bind:buildA bind:buildB {showSecondBuild} bind:collapsed={collapsed.weapon} />
    <PerksSection bind:buildA bind:buildB {showSecondBuild} bind:collapsed={collapsed.perks} bind:perkOrder />
    <RotationSection bind:buildA bind:buildB {showSecondBuild} bind:collapsed={collapsed.rotation} bind:rotationOrder />
  </tbody>
</table>

<style>
  .build-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    border: 1px solid var(--border-color);
  }

  col.col-build {
    width: 170px;
  }

  /* Header row */
  thead th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
  }
</style>
