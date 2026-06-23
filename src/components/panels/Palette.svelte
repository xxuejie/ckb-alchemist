<script lang="ts">
  import { specsByCategory } from "$lib/nodes";
  import { graph } from "$lib/store/graph.svelte";

  let search = $state("");

  const allGroups = specsByCategory();

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        specs: g.specs.filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.type.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.specs.length > 0);
  });

  function addNode(type: string) {
    graph.addNode(type, {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    });
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="al-palette nodrag" onpointerdown={(e) => e.stopPropagation()}>
  <div class="al-palette__search">
    <input
      class="al-palette__search-input"
      type="text"
      placeholder="Search widgets…"
      bind:value={search}
    />
  </div>

  <div class="al-palette__list">
    {#each filtered as group (group.category)}
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
    {#if filtered.length === 0}
      <div class="al-palette__empty">No widgets found</div>
    {/if}
  </div>
</div>

<style>
  .al-palette {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px var(--c-shadow);
    width: 220px;
    max-height: 70vh;
  }
  .al-palette__search {
    padding: 6px;
    border-bottom: 1px solid var(--c-border);
  }
  .al-palette__search-input {
    width: 100%;
    background: var(--c-input-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-text);
    padding: 3px 8px;
    font-size: 12px;
    outline: none;
  }
  .al-palette__search-input:focus {
    border-color: var(--c-accent);
  }
  .al-palette__list {
    overflow-y: auto;
    padding: 4px 6px;
    flex: 1;
  }
  .al-palette__category {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--c-text-mute);
    margin: 6px 4px 2px;
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
    margin-bottom: 2px;
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
  .al-palette__empty {
    color: var(--c-text-mute);
    font-size: 12px;
    padding: 12px;
    text-align: center;
  }
</style>
