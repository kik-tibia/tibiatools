<script lang="ts">
  import type { PerkDef } from "src/data/perks";
  export let all: PerkDef[] = [];
  export let selectedIds: string[] = [];
  export let onAdd: (id: string) => void;

  let q = "";
  $: filtered = all.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) && !selectedIds.includes(p.id));
</script>

<div class="perk-picker">
  <input class="perk-search" placeholder="Search perks…" bind:value={q} />
  <ul>
    {#each filtered as p}
      <li><button type="button" on:click={() => onAdd(p.id)}>{p.name}</button></li>
    {/each}
  </ul>
  {#if selectedIds.length}
    <p class="subtle">{selectedIds.length} selected</p>
  {/if}
</div>

<style>
  .perk-search {
    width: 8rem;
  }
</style>
