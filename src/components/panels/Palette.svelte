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
    background: #1a1d24;
    border: 1px solid #2a2e37;
    border-radius: 8px;
    padding: 8px;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
  .al-palette h3 {
    font-size: 10px;
    text-transform: uppercase;
    color: #6a6e77;
    margin: 0 0 4px;
    letter-spacing: 0.05em;
  }
  .al-palette__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f1115;
    border: 1px solid #2a2e37;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    color: #e6e6e6;
    font-size: 12px;
  }
  .al-palette__item:hover {
    border-color: #7c5cff;
    background: #15171c;
  }
  .al-palette__out {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .al-palette__out--Bytes {
    color: #58a6ff;
  }
  .al-palette__out--Script {
    color: #d29922;
  }
  .al-palette__out--Hash {
    color: #7c5cff;
  }
  .al-palette__out--Number {
    color: #3fb950;
  }
</style>
