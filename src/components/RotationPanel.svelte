<script lang="ts">
  import { spells } from "@data/spells";
  import FuzzySelect from "./FuzzySelect.svelte";
  import type { RotationSpell } from "@lib/damage-calc";
  import RotationEditor from "./RotationEditor.svelte";

  const registry = new Map(spells.map((s) => [s.id, s]));

  export let rotation: RotationSpell[];

  function addSpell(id: string) {
    if (rotation.some((r) => r.id === id)) return;
    rotation = [...rotation, { id, ratio: 1 }];
  }
</script>

<div style="padding-right: 1rem">
  <h3>Rotation</h3>

  <div style="margin-top: 0.5rem">
    <FuzzySelect selectType="spells" all={spells} selectedIds={rotation.map((rs) => rs.id)} onAdd={addSpell} />
    <RotationEditor active={rotation} onActiveChange={(next) => (rotation = next)} {registry} />
  </div>
</div>

<style>
  input {
    width: 6rem;
    padding: 0.1rem;
    font: inherit;
  }
</style>
