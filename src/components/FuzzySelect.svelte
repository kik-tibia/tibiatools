<script lang="ts">
  import { Fzf, byLengthAsc } from "fzf";

  let {
    selectType,
    all = [],
    selectedIds = [],
    getId = (x: any) => x?.id,
    getLabel = (x: any) => x?.name ?? "",
    onAdd,
  }: {
    selectType: string;
    all?: any[];
    selectedIds?: string[];
    getId?: (x: any) => string;
    getLabel?: (x: any) => string;
    onAdd: (id: string) => void;
  } = $props();

  let q = $state("");
  let open = $state(false);
  let activeIndex = $state(0);

  let available = $derived(all.filter((x) => !selectedIds.includes(getId(x))));
  let fzf = $derived(new Fzf(available as any, { selector: (x: any) => getLabel(x), tiebreakers: [byLengthAsc] } as any));
  let results = $derived(q ? fzf.find(q).map((r: any) => r.item) : available);

  function select(item: any) {
    onAdd(getId(item));
    q = "";
    open = false;
    activeIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open && (e.key.length === 1 || e.key === "ArrowDown")) open = true;
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
    setTimeout(() => (open = false), 120);
  }
</script>

<div class="fuzzy-select">
  <div class="combo">
    <input
      class="fuzzy-search"
      placeholder="Search {selectType}"
      bind:value={q}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      role="combobox"
      aria-controls="{selectType}-listbox"
      aria-expanded={open}
      aria-autocomplete="list"
      aria-haspopup="listbox" />
    <svg class="chev" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 7l5 6 5-6" />
    </svg>
  </div>
  {#if open}
    <ul id="{selectType}-listbox" class="dropdown" role="listbox">
      {#if results.length === 0}
        <li class="empty">No matches</li>
      {:else}
        {#each results as p, i}
          <li
            role="option"
            aria-selected={i === activeIndex}
            class:selected={i === activeIndex}
            onmousedown={(e) => { e.preventDefault(); select(p); }}>
            {getLabel(p)}
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .fuzzy-select {
    position: relative;
  }

  .combo {
    position: relative;
  }

  .fuzzy-search {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem 0rem 0.5rem 0.625rem;
    border: 1px solid var(--input-border);
    border-radius: 0.5rem;
    outline: none;
    background: var(--input-bg);
    color: var(--text-color);
  }
  .fuzzy-search:focus {
    border-color: var(--focus-border);
    box-shadow: var(--focus-ring);
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;

    margin-top: 0.25rem;
    padding: 0;
    list-style: none;

    background: var(--dropdown-bg);
    border: 1px solid var(--border-color);
    color: var(--dropdown-text);
    border-radius: 0.5rem;

    max-height: 6rem;
    overflow-y: auto;
    z-index: 10;
  }
  .dropdown li:hover,
  .dropdown li.selected {
    background: var(--dropdown-hover);
  }
  .dropdown li.empty {
    color: var(--text-muted);
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
</style>
