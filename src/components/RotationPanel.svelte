<script lang="ts">
  import { spells } from "@data/spells";
  import FuzzySelect from "./FuzzySelect.svelte";
  import type { RotationSpell } from "@lib/damage-calc";
  import RotationEditor from "./RotationEditor.svelte";

  const registry = new Map(spells.map((s) => [s.id, s]));

  export let rotation: RotationSpell[];

  function addSpell(id: string) {
    if (rotation.some((r) => r.id === id)) return;
    rotation = [...rotation, { id, targets: 1, ratio: 1 }];
  }
</script>

<div style="padding-right: 1rem">
  <h3>Rotation</h3>

  <div class="rotation-panel">
    <FuzzySelect
      selectType="spells"
      all={spells.filter((s) => s.id !== "auto-attack")}
      selectedIds={rotation.map((rs) => rs.id)}
      onAdd={addSpell} />
    <!-- <RotationEditor active={rotation} onActiveChange={(next) => (rotation = next)} {registry} /> -->
  </div>
</div>

<style>
</style>
