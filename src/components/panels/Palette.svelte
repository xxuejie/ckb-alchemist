<script lang="ts">
  import { specsByCategory } from "$lib/nodes";
  import { graph } from "$lib/store/graph.svelte";

  const groups = specsByCategory();

  function addNode(type: string) {
    graph.addNode(type, {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    });
  }
</script>

<div class="al-palette">
  {#each groups as group (group.category)}
    <h3 class="al-palette__category">{group.category}</h3>
    {#each group.specs as spec (spec.type)}
      <button
        class="al-palette__item"
        onclick={() => addNode(spec.type)}
        title={spec.description}
      >
        <span class="al-palette__label">{spec.label}</span>
        {#if spec.output}
          <span class="al-palette__out al-palette__out--{spec.output.type}"
            >{spec.output.type}</span
          >
        {/if}
      </button>
    {/each}
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
    gap: 2px;
    box-shadow: 0 2px 8px var(--c-shadow);
    max-height: 80vh;
    overflow-y: auto;
  }
  .al-palette__category {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--c-text-mute);
    margin: 8px 0 2px;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--c-border);
    padding-bottom: 2px;
  }
  .al-palette__category:first-child {
    margin-top: 0;
  }
  .al-palette__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--c-input-bg);
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
    flex-shrink: 0;
    margin-left: 8px;
  }
  .al-palette__out--Bytes {
    color: var(--c-bytes);
  }
  .al-palette__out--Script {
    color: var(--c-script);
  }
  .al-palette__out--Hash {
    color: var(--c-hash);
  }
  .al-palette__out--Number {
    color: var(--c-number);
  }
</style>
