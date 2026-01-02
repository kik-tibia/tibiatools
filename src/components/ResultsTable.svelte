<script lang="ts">
  import type { SpellDamage } from "@data/spells";
  import type { Vocation } from "@lib/build-state";

  export let results: SpellDamage[] = [];
  export let vocation: Vocation;
  export let effectiveDpt: number;
  export let effectiveDph: number;

  export let isHigher: (id: string) => boolean = () => false;
  export let isDptHigher: boolean;
  export let isDphHigher: boolean;

  $: vocResults = results.filter((i) => i.vocations.includes(vocation));
</script>

<div>
  <table class="summary">
    <tbody>
      <tr class:highlight={isDptHigher}>
        <td class="summary-label">
          <span class="field-tip tip-right">
            <button type="button" class="tip-trigger" aria-describedby="tip-dpt">
              Average effective damage per turn
            </button>
            <span id="tip-dpt" role="tooltip" class="tip-content">
              The average damage you would deal per turn, using the defined rotation, taking into account resistances,
              armor, mitigation, crits and fatals.
            </span>
          </span>
        </td>
        <td class="summary-value">{effectiveDpt.toFixed(1)}</td>
      </tr>
      <tr class:highlight={isDphHigher}>
        <td class="summary-label">
          <span class="field-tip tip-right">
            <button type="button" class="tip-trigger" aria-describedby="tip-dph">
              Average effective damage per hit
            </button>
            <span id="tip-dph" role="tooltip" class="tip-content">
              The average damage you would deal per hit, using the defined rotation, taking into account resistances,
              armor, mitigation, crits and fatals.
            </span>
          </span>
        </td>
        <td class="summary-value">{effectiveDph.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>

  <div>
    <table class="results">
      <thead>
        <tr>
          <th class="desc" rowspan="2">Spell</th>
          <th class="desc">
            <span class="field-tip tip-right">
              <button type="button" class="tip-trigger" aria-describedby="tip-effective">Effective</button>
              <span id="tip-effective" role="tooltip" class="tip-content">
                The average damage you would deal, taking into account resistances, armor, mitigation, crits and fatals.
              </span>
            </span>
          </th>
          <th class="desc" colspan="3">
            <span class="field-tip tip-right">
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
        {#each vocResults as r}
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
</div>

<style>
  .summary {
    width: 100%;
    max-width: 600px;
    border-collapse: collapse;
    border: 1px solid #555555;
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .summary td {
    padding: 0.4rem 0.4rem;
    border-bottom: 1px solid #555555;
  }

  .summary tr:last-child td {
    border-bottom: none;
  }

  .summary-label {
    width: 100%;
  }

  .summary-value {
    text-align: right;
    font-weight: 600;
  }

  table.results {
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
</style>
