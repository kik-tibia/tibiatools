<script lang="ts">
  import { spellOrdering, type SpellDamage } from "@data/spells";
  import type { Vocation } from "@lib/build-state";
  import type { RotationSpell } from "@lib/damage-calc";
  import Tooltip from "./Tooltip.svelte";

  let {
    results = [],
    vocation,
    rotation,
    effectiveDpt,
    effectiveDph,
    showHighlighting,
    isDptHigher,
    isDphHigher,
    isHigher = () => false,
  }: {
    results?: SpellDamage[];
    vocation: Vocation;
    rotation: RotationSpell[];
    effectiveDpt: number;
    effectiveDph: number;
    showHighlighting: boolean;
    isDptHigher: boolean;
    isDphHigher: boolean;
    isHigher?: (id: number) => boolean;
  } = $props();

  let vocResults = $derived(results.filter((i) => i.vocations.includes(vocation)));
  let vocSpellOrdering = $derived(spellOrdering.find((s) => s.vocation == vocation)?.order ?? []);
  let rotationIds = $derived(rotation.map((r) => r.id));
  let resultsOrdered = $derived(
    vocResults.toSorted((a, b) => {
      const aInRot = rotationIds.includes(a.id);
      const bInRot = rotationIds.includes(b.id);

      // Rotation spells come first
      if (aInRot !== bInRot) return aInRot ? -1 : 1;

      // Then list spells as defined by the ordering
      let ai = vocSpellOrdering.indexOf(a.scope);
      let bi = vocSpellOrdering.indexOf(b.scope);

      // Force spells to the bottom if they aren't included in the ordering
      if (ai == -1) ai = vocSpellOrdering.length;
      if (bi == -1) bi = vocSpellOrdering.length;

      return ai - bi;
    }),
  );
</script>

<div>
  <table class="summary">
    <tbody>
      <tr class:highlight={showHighlighting && isDptHigher}>
        <td class="summary-label">
          <Tooltip
            label={"Effective damage per turn"}
            tip={"The average damage you would deal per turn, using the defined rotation, taking inte account resistances, mitigation, crits and fatals."}
            right={true} />
        </td>
        <td class="summary-value">{effectiveDpt.toFixed(1)}</td>
      </tr>
      <tr class:highlight={showHighlighting && isDphHigher}>
        <td class="summary-label">
          <Tooltip
            label={"Effective damage per hit"}
            tip={"The average damage you would deal per hit, using the defined rotation, taking into account resistances, mitigation, crits and fatals."}
            right={true} />
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
            <Tooltip
              label={"Effective"}
              tip={"The average damage you would deal, taking into account resistances, mitigation, crits and fatals."}
              right={true} />
          </th>
          <th class="desc" colspan="3">
            <Tooltip
              label={"Raw"}
              tip={"The damage you would deal to a completely defenseless target, ignoring crits and fatals."}
              right={true} />
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
        {#each resultsOrdered as r}
          <tr class:highlight={showHighlighting && isHigher(r.id)}>
            <td class="spell">
              <div class="spell-name">
                {#if r.isSpender}
                  <Tooltip
                    label={r.name}
                    tip="Currently assuming VoH and no other harmony perks (208% bonus)"
                    right={true} />
                {:else}
                  {r.name}
                {/if}
              </div>
            </td>
            <td class="num" data-label="Effective Avg">{r.effectiveAvg.toFixed(1)}</td>
            <td class="num range" data-label="Min">
              {#if r.min === undefined}
                <Tooltip label="?" tip="The min for this <br/> spell is unknown" right={true} />
              {:else}
                {r.min}
              {/if}
            </td>
            <td class="num" data-label="Avg">{r.avg}</td>
            <td class="num range" data-label="Min">
              {#if r.max === undefined}
                <Tooltip label="?" tip="The max for this <br/> spell is unknown" right={true} />
              {:else}
                {r.max}
              {/if}
            </td>
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
    border: 1px solid var(--border-color);
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .summary td {
    padding: 0.4rem 0.4rem;
    border-bottom: 1px solid var(--border-color);
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
    border: 1px solid var(--border-color);
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }

  thead th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border-color);
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
    border-bottom: 1px solid var(--border-color);
  }

  .desc {
    text-align: center;
  }

  .num {
    text-align: right;
  }

  .range {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .spell {
    width: 100%;
  }

  .highlight td {
    background: var(--highlight-bg);
  }

  .spell-name {
    font-weight: 600;
  }

  @media (max-width: 899px) {
    .results thead {
      display: none;
    }

    .results,
    .results tbody,
    .results tr,
    .results td {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    .results {
      overflow: hidden;
    }

    .results tr {
      border-bottom: 1px solid var(--mobile-border);
    }

    .results td {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
    }

    .results td.spell {
      grid-template-columns: 1fr;
    }

    .results td.num::before {
      content: attr(data-label);
      text-align: left;
      opacity: 0.7;
      padding-right: 0.75rem;
      font-weight: 500;
    }
  }
</style>
