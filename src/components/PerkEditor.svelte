<script lang="ts">
  import type { PerkDef, PerkParam } from "src/data/perks";
  import type { ActivePerk } from "src/lib/perk-types";

  export let registry: Map<string, PerkDef>;
  export let active: ActivePerk[]; // parent binds this

  function stepOf(p: PerkParam): number | undefined {
    if (p.step != null) return p.step;
    if (p.type === "int") return 1;
    if (p.type === "percent") return 0.1;
    return 0.01;
  }

  function setValue(ap: ActivePerk, p: PerkParam, raw: string) {
    let v: number | string = raw;
    if (p.type === "int" || p.type === "number" || p.type === "percent") {
      const n = Number(raw);
      v = Number.isFinite(n) ? n : 0;
    }
    ap.values[p.key] = v;
    // nudge reactivity
    active = active.slice();
  }

  function onNumInput(ap: ActivePerk, p: PerkParam, e: Event) {
    const target = e.target as HTMLInputElement;
    setValue(ap, p, target.value);
  }

  function onEnumChange(ap: ActivePerk, p: PerkParam, e: Event) {
    const target = e.target as HTMLSelectElement;
    setValue(ap, p, target.value);
  }

  function remove(id: string) {
    active = active.filter((a) => a.id !== id);
  }
</script>

<div class="perk-editor">
  {#each active as ap (ap.id)}
    {@const def = registry.get(ap.id)}
    {#if def}
      <div class="perk-chip">
        <strong>{def.name}</strong>
        <button type="button" aria-label="Remove" on:click={() => remove(ap.id)}>×</button>

        <div class="perk-fields">
          {#each def.params as p (p.key)}
            <label>
              <span>{p.label}</span>

              {#if p.type === "enum"}
                <select value={String(ap.values[p.key] ?? p.default)} on:change={(e) => onEnumChange(ap, p, e)}>
                  {#each p.options ?? [] as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={stepOf(p)}
                  value={String(ap.values[p.key] ?? p.default)}
                  on:input={(e) => onNumInput(ap, p, e)}
                  inputmode={p.type === "int" ? "numeric" : "decimal"}
                />
              {/if}
            </label>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>
