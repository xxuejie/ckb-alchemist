<script lang="ts">
  import { listNodeSpecs } from "$lib/nodes";
  import { graph } from "$lib/store/graph.svelte";

  const specs = listNodeSpecs();

  function addNode(type: string) {
    graph.addNode(type, {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    });
  }
</script>

<div class="al-palette">
  <h3>Nodes</h3>
  {#each specs as spec (spec.type)}
    <button
      class="al-palette__item"
      onclick={() => addNode(spec.type)}
      title={spec.description}
    >
      <span class="al-palette__label">{spec.label}</span>
      <span class="al-palette__out al-palette__out--{spec.output.type}"
        >{spec.output.type}</span
      >
    </button>
  {/each}
</div>

<style>
  .al-palette {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 8px;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 2px 8px var(--c-shadow);
  }
  .al-palette h3 {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--c-text-mute);
    margin: 0 0 4px;
    letter-spacing: 0.05em;
  }
  .al-palette__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    color: var(--c-text);
    font-size: 12px;
  }
  .al-palette__item:hover {
    border-color: var(--c-accent);
    background: var(--c-panel-hover);
  }
  .al-palette__out {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .al-palette__out--Bytes {
    color: var(--c-bytes);
  }
  .al-palette__out--Script {
    color: var(--c-warn);
  }
  .al-palette__out--Hash {
    color: var(--c-accent);
  }
  .al-palette__out--Number {
    color: var(--c-ok);
  }
</style>
