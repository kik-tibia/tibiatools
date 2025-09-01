<script lang="ts">
  import { perks } from "src/data/perks";
  import PerkPicker from "./PerkPicker.svelte";
  import PerkEditor from "./PerkEditor.svelte";
  import type { Build, BuildStats } from "src/lib/build-state";

  export let results: any[] = [];

  export let isHigher: (id: string) => boolean = () => false;
</script>

<div>
  <div class="panel">
    <table class="results">
      <thead>
        <tr><th class="spell">Spell</th><th class="num">Min</th><th class="num">Avg</th><th class="num">Max</th></tr>
      </thead>
      <tbody>
        {#each results as r}
          <tr class:highlight={isHigher(r.id)}>
            <td class="spell">
              <div class="spell-name">{r.name}</div>
              <div class="meta"><span class="badge">{r.scalesWith}</span></div>
            </td>
            <td class="num range" data-label="Min">{r.min}</td>
            <td class="num" data-label="Avg">{r.avg}</td>
            <td class="num range" data-label="Max">{r.max}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
