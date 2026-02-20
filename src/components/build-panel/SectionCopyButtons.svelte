<script lang="ts">
  let {
    showSecondBuild,
    collapsed,
    copyAtoB,
    copyBtoA,
  }: {
    showSecondBuild: boolean;
    collapsed: boolean;
    copyAtoB: () => void;
    copyBtoA: () => void;
  } = $props();
</script>

<td>
  {#if showSecondBuild && !collapsed}
    <button class="copy-btn" onclick={copyAtoB}>Copy →</button>
  {/if}
</td>
{#if showSecondBuild}
  <td>
    {#if !collapsed}
      <button class="copy-btn" onclick={copyBtoA}>← Copy</button>
    {/if}
  </td>
{/if}

<style>
  .copy-btn {
    padding: 0.1rem 0.4rem;
    font-size: 0.7rem;
    line-height: 1.2;
    background: transparent;
    border: 1px solid var(--input-border);
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    opacity: 0.5;
  }

  .copy-btn:hover {
    opacity: 1;
    background: var(--input-bg);
  }
</style>
