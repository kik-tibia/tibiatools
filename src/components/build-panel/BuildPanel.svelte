<script lang="ts">
  import BuildBadge from "@components/BuildBadge.svelte";
  import BasicStatsSection from "@components/build-panel/BasicStatsSection.svelte";
  import WeaponSection from "@components/build-panel/WeaponSection.svelte";
  import PerksSection from "@components/build-panel/PerksSection.svelte";
  import RotationSection from "@components/build-panel/RotationSection.svelte";
  import type { Build } from "@lib/build-state";

  let {
    buildA = $bindable(),
    buildB = $bindable(),
    showSecondBuild = false,
  }: {
    buildA: Build;
    buildB: Build;
    showSecondBuild?: boolean;
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
    <BasicStatsSection bind:buildA bind:buildB {showSecondBuild} />
    <WeaponSection bind:buildA bind:buildB {showSecondBuild} />
    <PerksSection bind:buildA bind:buildB {showSecondBuild} />
    <RotationSection bind:buildA bind:buildB {showSecondBuild} />
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
    background: hsl(220 10% 18%);
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
  }

  /* All cells get vertical borders — :global() to reach into child components */
  .build-table :global(td) {
    padding: 0.35rem 0.75rem;
    border-left: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
    vertical-align: middle;
  }

  /* Section header rows get top border */
  .build-table :global(.section-header td) {
    border-top: 1px solid var(--border-color);
    padding-top: 0.6rem;
    padding-bottom: 0.4rem;
  }

  /* Last row of table needs bottom border */
  .build-table :global(tbody tr:last-child td) {
    border-bottom: 1px solid var(--border-color);
  }

  /* Section headers */
  .build-table :global(h4) {
    margin: 0;
  }

  /* Item names (perks, spells) */
  .build-table :global(.item-name) {
    font-size: 0.9rem;
  }

  /* Shared input styles */
  .build-table :global(input) {
    width: 100%;
    box-sizing: border-box;
  }

  .build-table :global(input[type="number"]) {
    padding: 0.25rem 0.4rem;
    font: inherit;
    border: 1px solid var(--input-border);
    border-radius: 0.25rem;
    background: var(--input-bg);
    color: inherit;
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .build-table :global(input[type="number"]::-webkit-outer-spin-button),
  .build-table :global(input[type="number"]::-webkit-inner-spin-button) {
    -webkit-appearance: none;
    margin: 0;
  }

  .build-table :global(input.input-a) {
    border-color: var(--build-a-border);
  }

  .build-table :global(input.input-b) {
    border-color: var(--build-b-border);
  }

  .build-table :global(input:focus) {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  /* Input with remove button */
  .build-table :global(.input-with-remove) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .build-table :global(.input-with-remove input[type="number"]) {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
  }

  .build-table :global(.input-with-remove input[type="number"].small) {
    flex: 0 0 auto;
    width: 3.5rem;
  }

  .build-table :global(.input-with-remove input[type="number"].small:nth-child(2)) {
    margin-left: auto;
  }

  /* Add placeholder and button */
  .build-table :global(.add-placeholder) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .build-table :global(.add-btn) {
    padding: 0.25rem 0.75rem;
    font-size: 1rem;
    line-height: 1;
    background: transparent;
    border: 1px dashed var(--input-border);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition:
      opacity 0.15s,
      background-color 0.15s;
  }

  .build-table :global(.add-btn:hover) {
    opacity: 1;
    background: hsl(220 10% 20%);
  }

  .build-table :global(.add-btn.input-a) {
    border-color: var(--build-a-border);
  }

  .build-table :global(.add-btn.input-a:hover) {
    background: hsl(210, 30%, 25%);
  }

  .build-table :global(.add-btn.input-b) {
    border-color: var(--build-b-border);
  }

  .build-table :global(.add-btn.input-b:hover) {
    background: hsl(30, 30%, 25%);
  }

  .build-table :global(td .fuzzy-select) {
    width: 100%;
  }
</style>
