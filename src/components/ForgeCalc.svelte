<script lang="ts">
  import { computeForge, type ForgeInputs } from "@lib/forge-calc";
  import Tooltip from "./Tooltip.svelte";

  let inputs: ForgeInputs = $state({
    baseCost: 1_000_000,
    baseCostSameSlot: 8_000_000,
    bisCost: 300_000_000,
    sliverCost: 2_000,
  });

  let result = $derived(computeForge(inputs));

  function fmt(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + " T";
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + " B";
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + " M";
    if (abs >= 1e3) return (n / 1e3).toFixed(2) + " K";
    return n.toFixed(0);
  }

  function fmtFull(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return "";
    return Math.round(n).toLocaleString();
  }

  function toKk(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return "";
    const [divisor, suffix] = n >= 1_000_000 ? [1_000_000, "kk"] : n >= 1000 ? [1000, "k"] : [1, ""];
    return Math.floor(n / divisor) + suffix;
  }
</script>

<section class="inputs">
  <h3>Inputs</h3>
  <div class="input-grid">
    <label>
      Base cost
      <div class="input-row">
        <input type="number" step="1" inputmode="numeric" bind:value={inputs.baseCost} />
        <span class="kk">{toKk(inputs.baseCost)}</span>
      </div>
    </label>
    <label>
      Base cost (same slot)
      <div class="input-row">
        <input type="number" step="1" inputmode="numeric" bind:value={inputs.baseCostSameSlot} />
        <span class="kk">{toKk(inputs.baseCostSameSlot)}</span>
      </div>
    </label>
    <label>
      BIS cost
      <div class="input-row">
        <input type="number" step="1" inputmode="numeric" bind:value={inputs.bisCost} />
        <span class="kk">{toKk(inputs.bisCost)}</span>
      </div>
    </label>
    <label>
      Sliver cost
      <div class="input-row">
        <input type="number" step="1" inputmode="numeric" bind:value={inputs.sliverCost} />
        <span class="kk">{toKk(inputs.sliverCost)}</span>
      </div>
    </label>
  </div>
</section>

<div class="forge-results">
  <div class="panel">
    <h3>Convergence Fusion</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th class="desc">Tier</th>
          <th class="num">Gold fee</th>
          <th class="num">Average total cost</th>
        </tr>
      </thead>
      <tbody>
        {#each result.convergenceFusion as row}
          <tr>
            <td class="tier">{row.tier}</td>
            <td class="num" data-label="Gold fee" title={fmtFull(row.goldFee)}>{fmt(row.goldFee)}</td>
            <td class="num" data-label="Average total cost" title={fmtFull(row.totalCost)}>{fmt(row.totalCost)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="panel">
    <h3>Convergence Transfer</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th class="desc">Tier</th>
          <th class="num">Gold fee</th>
          <th class="num">Average total cost</th>
        </tr>
      </thead>
      <tbody>
        {#each result.convergenceTransfer as row}
          <tr>
            <td class="tier">{row.tier}</td>
            <td class="num" data-label="Gold fee" title={fmtFull(row.goldFee)}>{fmt(row.goldFee)}</td>
            <td class="num" data-label="Average total cost" title={fmtFull(row.totalCost)}>{fmt(row.totalCost)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="panel">
    <h3>Transfer</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th class="desc">Tier</th>
          <th class="num">Gold fee</th>
          <th class="num">Average total cost</th>
        </tr>
      </thead>
      <tbody>
        {#each result.transfer as row}
          <tr>
            <td class="tier">{row.tier}</td>
            <td class="num" data-label="Gold fee" title={fmtFull(row.goldFee)}>{fmt(row.goldFee)}</td>
            <td class="num" data-label="Average total cost" title={fmtFull(row.totalCost)}>{fmt(row.totalCost)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="panel">
    <h3>
      <Tooltip label="Fusion (base only)" tip="Fusion of the base items,<br/>not transferring to the BIS item" />
    </h3>
    <table class="data-table">
      <thead>
        <tr>
          <th class="desc">Tier</th>
          <th class="num">Gold fee</th>
          <th class="num">Average total cost</th>
        </tr>
      </thead>
      <tbody>
        {#each result.baseFusion as row}
          <tr>
            <td class="tier">{row.tier}</td>
            <td class="num" data-label="Gold fee" title={fmtFull(row.goldFee)}>{fmt(row.goldFee)}</td>
            <td class="num" data-label="Average total cost" title={fmtFull(row.totalCost)}>{fmt(row.totalCost)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="panel">
    <h3>
      <Tooltip
        label="Fusion (same slot base only)"
        tip="Fusion of the same slot base items,<br/>not transferring to the BIS item" />
    </h3>
    <table class="data-table">
      <thead>
        <tr>
          <th class="desc">Tier</th>
          <th class="num">Gold fee</th>
          <th class="num">Average total cost</th>
        </tr>
      </thead>
      <tbody>
        {#each result.sameSlotFusion as row}
          <tr>
            <td class="tier">{row.tier}</td>
            <td class="num" data-label="Gold fee" title={fmtFull(row.goldFee)}>{fmt(row.goldFee)}</td>
            <td class="num" data-label="Average total cost" title={fmtFull(row.totalCost)}>{fmt(row.totalCost)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
<section class="forge-about">
  <h4>About the forge calculator</h4>
  <p>
    This tool is a calculator, not a simulator. It uses a closed-form formula to calculate the expected value of each
    fusion type. As such, the calculator does not consider any bonus effects from the forge.
  </p>
  <p>The "Average total cost" columns refer to the mean cost, not the median.</p>
</section>

<style>
  .inputs {
    max-width: 450px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 1rem;
    background: var(--table-body-bg);
    box-sizing: border-box;
    margin-bottom: 1.5rem;
  }

  .inputs h3 {
    margin: 0 0 0.75rem 0;
  }

  .input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.6rem 1rem;
  }

  .input-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .input-grid input {
    flex: 0 0 60%;
    min-width: 0;
    box-sizing: border-box;
    background: var(--input-bg);
    color: var(--text-color);
    border: 1px solid var(--input-border);
    border-radius: 4px;
    padding: 0.35rem 0.5rem;
    font-size: 0.95rem;
  }

  .input-grid input:focus {
    outline: none;
    border-color: var(--focus-border);
    box-shadow: var(--focus-ring);
  }

  .kk {
    flex: 0 0 40%;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .forge-results {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .panel {
    flex: 1 1 450px;
    max-width: 450px;
    min-width: 0;
    box-sizing: border-box;
  }

  .panel h3 {
    margin: 0 0 0.5rem 0;
  }

  .forge-about {
    max-width: 800px;
    margin: 4rem auto 0;
  }
  .forge-about h4 {
    text-align: center;
  }

  @media (min-width: 750px) {
    .data-table {
      table-layout: fixed;
    }
    .data-table th:nth-child(1) {
      width: 20%;
    }
    .data-table th:nth-child(2),
    .data-table th:nth-child(3) {
      width: 40%;
    }
  }

  @media (max-width: 749px) {
    .data-table td.tier {
      grid-template-columns: 1fr;
    }
  }
</style>
