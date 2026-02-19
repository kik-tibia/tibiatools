<script lang="ts">
  let { pushRight = false, onclick }: { pushRight?: boolean; onclick?: (e: MouseEvent) => void } = $props();
</script>

<button type="button" class="remove-btn" class:push-right={pushRight} aria-label="Remove" {onclick}>×</button>

<style>
  .remove-btn {
    padding: 0.1rem 0.4rem;
    font-size: 1rem;
    line-height: 1;
    background: transparent;
    border: 1px solid var(--input-border);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .push-right {
    margin-left: auto;
  }

  .remove-btn:hover {
    background: var(--remove-hover-bg);
    border-color: var(--remove-hover-border);
  }
</style>
