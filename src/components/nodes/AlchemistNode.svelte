<script lang="ts">
  import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/svelte";
  import { requireNodeSpec } from "$lib/nodes";
  import { graph } from "$lib/store/graph.svelte";
  import type { AlchemistNode } from "$lib/engine";
  import ParamField from "./ParamField.svelte";

  type AlchemistNodeProps = NodeProps<AlchemistNode>;

  let { id, type, data, selected }: AlchemistNodeProps = $props();

  const result = $derived(graph.evaluation.results.get(id));
  const spec = $derived(requireNodeSpec(type as string));
  const params = $derived(data.params as Record<string, unknown>);
</script>

<div
  class="al-node"
  class:selected
  class:errored={!result?.ok}
  role="group"
  tabindex="-1"
>
  <NodeResizer isVisible={selected} minWidth={200} minHeight={80} />
  <header class="al-node__header">
    <span class="al-node__title">{spec.label}</span>
    <span class="al-node__type">{spec.output.type}</span>
  </header>

  {#if spec.inputs.length > 0}
    <section class="al-node__inputs">
      {#each spec.inputs as handle (handle.id)}
        <div class="al-node__row">
          <Handle
            id={handle.id}
            type="target"
            position={Position.Left}
            class="al-handle al-handle--{handle.type}"
          />
          <span class="al-node__label">
            {handle.label}
            <span class="al-node__hint">{handle.type}</span>
          </span>
        </div>
      {/each}
    </section>
  {/if}

  {#if spec.params.length > 0}
    <section class="al-node__params">
      {#each spec.params as field (field.key)}
        <ParamField
          {field}
          value={params[field.key]}
          onupdate={(v: unknown) => graph.updateNodeParams(id, { [field.key]: v })}
        />
      {/each}
    </section>
  {/if}

  <section class="al-node__result">
    {#if result?.ok}
      {#if result.value.type === "Number"}
        <span class="al-node__num">{result.value.value}</span>
      {:else}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="al-node__hex-wrap nodrag" onpointerdown={(e) => e.stopPropagation()}>
          <code class="al-node__hex">{result.value.hex}</code>
        </div>
      {/if}
    {:else if result}
      <div class="al-node__error">{result.error}</div>
    {:else}
      <div class="al-node__pending">—</div>
    {/if}
  </section>

  <Handle
    id={spec.output.id}
    type="source"
    position={Position.Right}
    class="al-handle al-handle--{spec.output.type}"
  />
</div>

<style>
  .al-node {
    width: 100%;
    min-width: 200px;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    font-size: 12px;
    color: var(--c-text);
    box-shadow: 0 2px 8px var(--c-shadow);
    transition: border-color 0.12s;
  }
  .al-node.selected {
    border-color: var(--c-accent);
    box-shadow:
      0 0 0 1px var(--c-accent),
      0 2px 12px color-mix(in srgb, var(--c-accent) 30%, transparent);
  }
  .al-node.errored {
    border-color: var(--c-err);
  }
  .al-node__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid var(--c-border);
    font-weight: 600;
  }
  .al-node__title {
    color: var(--c-text);
  }
  .al-node__type {
    color: var(--c-accent);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .al-node__inputs {
    padding: 4px 0;
  }
  .al-node__row {
    position: relative;
    display: flex;
    align-items: center;
    padding: 3px 10px 3px 14px;
    min-height: 22px;
  }
  .al-node__label {
    color: var(--c-text-dim);
  }
  .al-node__hint {
    color: var(--c-text-mute);
    font-size: 10px;
    margin-left: 6px;
  }
  .al-node__params {
    padding: 4px 10px;
    border-top: 1px solid var(--c-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .al-node__result {
    padding: 6px 10px;
    border-top: 1px solid var(--c-border);
    min-height: 28px;
  }
  .al-node__hex-wrap {
    max-height: 80px;
    overflow-y: auto;
    cursor: text;
    user-select: text;
    -webkit-user-select: text;
  }
  .al-node__hex {
    display: block;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    color: var(--c-ok);
    word-break: break-all;
    overflow-wrap: break-word;
    font-size: 11px;
    line-height: 1.4;
  }
  .al-node__num {
    color: var(--c-ok);
    font-weight: 500;
  }
  .al-node__error {
    color: var(--c-err);
    word-break: break-word;
  }
  .al-node__pending {
    color: var(--c-text-mute);
  }

  :global(.al-handle) {
    width: 10px;
    height: 10px;
    border: 2px solid var(--c-border);
    background: var(--c-panel);
  }
  :global(.al-handle--Bytes) {
    background: var(--c-bytes);
  }
  :global(.al-handle--Script) {
    background: var(--c-warn);
  }
  :global(.al-handle--Hash) {
    background: var(--c-accent);
  }
  :global(.al-handle--Number) {
    background: var(--c-ok);
  }
</style>
