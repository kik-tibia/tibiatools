<script lang="ts">
  let {
    label,
    tip,
    right = false,
  }: {
    label: string;
    tip: string;
    right?: boolean;
  } = $props();
</script>

<span class="field-tip" class:tip-right={right}>
  <button type="button" class="tip-trigger">{label}</button>
  <span role="tooltip" class="tip-content">{@html tip}</span>
</span>

<style>
  .field-tip {
    position: relative;
    display: inline-block;
  }

  .field-tip .tip-content {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    right: auto;
    font-size: 0.8rem;
    white-space: normal;
    display: inline-block;
    width: max-content;
    max-width: 250px;
    padding: 5px 8px;
    color: #fff;
    background: #444;
    border: 1px solid #555;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
  }

  .field-tip.tip-right .tip-content {
    left: auto;
    right: 0;
  }

  .tip-trigger {
    background: none;
    border: 0;
    font-size: 1rem;
    padding: 0;
    color: inherit;
    cursor: help;
    text-decoration: underline dotted;
  }

  .field-tip:hover .tip-content,
  .field-tip:focus .tip-content,
  .field-tip:focus-within .tip-content {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
</style>
