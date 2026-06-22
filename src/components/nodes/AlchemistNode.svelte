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
    background: #1a1d24;
    border: 1px solid #2a2e37;
    border-radius: 8px;
    font-size: 12px;
    color: #e6e6e6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition: border-color 0.12s;
  }
  .al-node.selected {
    border-color: #7c5cff;
    box-shadow:
      0 0 0 1px #7c5cff,
      0 2px 12px rgba(124, 92, 255, 0.3);
  }
  .al-node.errored {
    border-color: #a3715f;
  }
  .al-node__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid #2a2e37;
    font-weight: 600;
  }
  .al-node__title {
    color: #e6e6e6;
  }
  .al-node__type {
    color: #7c5cff;
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
    color: #b0b4bd;
  }
  .al-node__hint {
    color: #6a6e77;
    font-size: 10px;
    margin-left: 6px;
  }
  .al-node__params {
    padding: 4px 10px;
    border-top: 1px solid #2a2e37;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .al-node__result {
    padding: 6px 10px;
    border-top: 1px solid #2a2e37;
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
    color: #3fb950;
    word-break: break-all;
    overflow-wrap: break-word;
    font-size: 11px;
    line-height: 1.4;
  }
  .al-node__num {
    color: #3fb950;
    font-weight: 500;
  }
  .al-node__error {
    color: #a3715f;
    word-break: break-word;
  }
  .al-node__pending {
    color: #6a6e77;
  }

  :global(.al-handle) {
    width: 10px;
    height: 10px;
    border: 2px solid #2a2e37;
    background: #1a1d24;
  }
  :global(.al-handle--Bytes) {
    background: #58a6ff;
  }
  :global(.al-handle--Script) {
    background: #d29922;
  }
  :global(.al-handle--Hash) {
    background: #7c5cff;
  }
  :global(.al-handle--Number) {
    background: #3fb950;
  }
</style>
