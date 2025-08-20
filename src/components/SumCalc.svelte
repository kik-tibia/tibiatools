<script lang="ts">
  let a: number | '' = '';
  let b: number | '' = '';

  // coerce to numbers safely (empty input counts as 0)
  $: aNum = typeof a === 'number' ? a : Number(a || 0);
  $: bNum = typeof b === 'number' ? b : Number(b || 0);
  $: sum = aNum + bNum;
</script>

<form class="stack" on:submit|preventDefault>
  <label>First number
    <input type="number" bind:value={a} inputmode="decimal" />
  </label>

  <label>Second number
    <input type="number" bind:value={b} inputmode="decimal" />
  </label>
</form>

<p class="result">Sum: <strong>{isNaN(sum) ? 0 : sum}</strong></p>

<style>
  .stack { display: grid; gap: .75rem; max-width: 360px; }
  input { padding: .5rem; font: inherit; }
  .result { margin-top: .75rem; font-size: 1.125rem; }
</style>
