<script lang="ts">
  export let results: any[] = [];
  export let effectiveDpt: number;

  export let isHigher: (id: string) => boolean = () => false;
  export let isDptHigher: boolean;
</script>

<div class="dpt" class:highlight={isDptHigher}>
  <span class="dpt-desc field-tip">
    <button type="button" class="tip-trigger" aria-describedby="tip-effective">
      Average effective damage per turn
    </button>
    <span id="tip-effective" role="tooltip" class="tip-content">
      The average damage you would deal, using the defined rotation, taking into account resistances, armor, mitigation,
      crits and fatals.
    </span>
  </span>
  <span class="dpt-value">{effectiveDpt.toFixed(1)}</span>
</div>
<div>
  <table class="results">
    <thead>
      <tr>
        <th class="desc" rowspan="2">Spell</th>
        <th class="desc">
          <span class="field-tip">
            <button type="button" class="tip-trigger" aria-describedby="tip-effective">Effective</button>
            <span id="tip-effective" role="tooltip" class="tip-content">
              The average damage you would deal, taking into account resistances, armor, mitigation, crits and fatals.
            </span>
          </span>
        </th>
        <th class="desc" colspan="3">
          <span class="field-tip">
            <button type="button" class="tip-trigger" aria-describedby="tip-raw">Raw</button>
            <span id="tip-raw" role="tooltip" class="tip-content">
              The damage you would deal to a completely defenseless target, ignoring resistances, crits, etc.
            </span>
          </span>
        </th>
      </tr>
      <tr>
        <th class="num">Avg</th>
        <th class="num">Min</th>
        <th class="num">Avg</th>
        <th class="num">Max</th>
      </tr>
    </thead>
    <tbody>
      {#each results as r}
        <tr class:highlight={isHigher(r.id)}>
          <td class="spell">
            <div class="spell-name">{r.name}</div>
          </td>
          <td class="num" data-label="Effective Avg">{r.effectiveAvg.toFixed(1)}</td>
          <td class="num range" data-label="Min">{r.min}</td>
          <td class="num" data-label="Avg">{r.avg}</td>
          <td class="num range" data-label="Max">{r.max}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .dpt {
    padding: 0.4rem 0.4rem;
    border: 1px solid #555555;
    margin-bottom: 1rem;
  }
  .dpt-desc {
    float: left;
  }
  .dpt-value {
    float: right;
    font-variant-numeric: tabular-nums;
  }
  table {
    max-width: 600px;
    border-collapse: collapse;
    overflow: visible;
    border: 1px solid #555555;
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }

  thead th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    border: 1px solid #555555;
    font-weight: 600;
  }

  thead tr:nth-child(2) th:nth-child(2),
  thead tr:nth-child(2) th:nth-child(3) {
    border-right: none;
  }

  thead tr:nth-child(2) th:nth-child(3),
  thead tr:nth-child(2) th:nth-child(4) {
    border-left: none;
  }

  td {
    padding: 0.4rem 0.4rem;
    border-bottom: 1px solid #555555;
  }

  .desc {
    text-align: center;
  }

  .num {
    text-align: right;
  }

  .range {
    font-size: 0.85rem;
    color: #777777;
  }

  .spell {
    width: 100%;
  }

  .highlight {
    background: rgba(50, 255, 0, 0.12);
  }

  .spell-name {
    font-weight: 600;
  }

  .field-tip {
    position: relative;
    display: inline-block;
  }

  .field-tip .tip-content {
    position: absolute;
    top: -5px;
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
