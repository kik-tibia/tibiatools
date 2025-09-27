<script lang="ts">
  import type { PerkDef } from "@data/perks";
  import { Fzf, type FzfOptions, type FzfResultItem } from "fzf";
  export let all: PerkDef[] = [];
  export let selectedIds: string[] = [];
  export let onAdd: (id: string) => void;

  let q = "";
  let open = false;
  let activeIndex = 0;

  $: available = all.filter((p) => !selectedIds.includes(p.id));
  $: fzfOptions = { selector: (p: PerkDef) => p.name } as FzfOptions<PerkDef>;
  $: fzf = new Fzf(available, fzfOptions);

  $: results = q ? fzf.find(q).map((r: FzfResultItem<PerkDef>) => r.item) : available;

  function select(p: PerkDef) {
    onAdd(p.id);
    // reset input for quick subsequent adds
    q = "";
    open = false;
    activeIndex = 0;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open && (e.key.length === 1 || e.key === "ArrowDown")) {
      open = true;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      activeIndex = results.length ? (activeIndex + 1) % results.length : 0;
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      activeIndex = results.length ? (activeIndex - 1 + results.length) % results.length : 0;
      e.preventDefault();
    } else if (e.key === "Enter") {
      const item = results[activeIndex];
      if (item) select(item);
    } else if (e.key === "Escape") {
      open = false;
    }
  }

  function handleFocus() {
    open = true;
  }

  function handleBlur() {
    // Delay so clicks on options can register before closing
    setTimeout(() => (open = false), 120);
  }
</script>

<div class="perk-picker">
  <div class="combo">
    <input
      class="perk-search"
      placeholder="Search perks…"
      bind:value={q}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={onKeydown}
      role="combobox"
      aria-controls="perk-listbox"
      aria-expanded={open}
      aria-autocomplete="list"
      aria-haspopup="listbox"
    />
    <svg class="chev" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 7l5 6 5-6" />
    </svg>
  </div>
  {#if open}
    <ul id="perk-listbox" class="dropdown" role="listbox">
      {#if results.length === 0}
        <li class="empty">No matches</li>
      {:else}
        {#each results as p, i}
          <li
            role="option"
            aria-selected={i === activeIndex}
            class:selected={i === activeIndex}
            on:mousedown|preventDefault={() => select(p)}
          >
            {p.name}
          </li>
        {/each}
      {/if}
    </ul>
  {/if}

  {#if selectedIds.length}
    <p class="subtle">{selectedIds.length} selected</p>
  {/if}
</div>

<!-- Usage in BuildPanel.svelte (unchanged signature):
  <PerkPicker
    all={perks}
    selectedIds={build.perks.map((p) => p.id)}
    onAdd={addPerk}
  />
-->

<style>
  .perk-picker {
    position: relative;
    max-width: 24rem;
  }

  .combo {
    position: relative;
  }

  .perk-search {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 0.625rem;
    border: 1px solid hsl(0 0% 40%);
    border-radius: 0.5rem;
    outline: none;
    background: hsl(220 10% 15%); /* dark input background */
    color: hsl(0 0% 95%); /* light text */
  }
  .perk-search:focus {
    border-color: hsl(220 90% 65%);
    box-shadow: 0 0 0 3px hsl(220 90% 65% / 0.3);
  }

  .dropdown {
    background: hsl(220 10% 10%); /* dark dropdown */
    border: 1px solid hsl(0 0% 30%);
    color: hsl(0 0% 95%); /* light text */
  }
  .dropdown li:hover,
  .dropdown li.selected {
    background: hsl(220 20% 25%);
  }
  .dropdown li.empty {
    color: hsl(0 0% 60%);
  }
  .chev {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    transform: translateY(-50%);
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    opacity: 0.6;
    pointer-events: none;
  }

  .subtle {
    color: hsl(0 0% 40%);
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
