<script lang="ts">
  export let build: "a" | "b";
</script>

<span class="build-badge" class:build-a={build === "a"} class:build-b={build === "b"}>
  <slot />
</span>

<style>
  .build-badge {
    display: inline-block;
    text-align: center;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .build-a {
    background: var(--build-a-bg);
    color: var(--build-a-text);
  }

  .build-b {
    background: var(--build-b-bg);
    color: var(--build-b-text);
  }
</style>
