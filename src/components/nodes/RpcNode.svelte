<script lang="ts">
  import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/svelte";
  import { graph } from "$lib/store/graph.svelte";
  import { rpc as rpcStore } from "$lib/store/rpc.svelte";
  import { getRpcMethod, RPC_METHODS } from "$lib/nodes/rpc-methods";
  import type { Value } from "$lib/nodes/types";
  import type { AlchemistNode } from "$lib/engine";

  type AlchemistNodeProps = NodeProps<AlchemistNode>;
  let { id, data, selected }: AlchemistNodeProps = $props();

  const params = $derived(data.params as Record<string, unknown>);
  const methodId = $derived((params.method as string) ?? "get_transaction");
  const method = $derived(getRpcMethod(methodId) ?? RPC_METHODS[0]!);

  const result = $derived(graph.evaluation.results.get(id));

  let fetchState = $state<"idle" | "fetching" | "error">("idle");
  let fetchError = $state("");

  const rpcUrl = $derived((params.rpcUrl as string) ?? rpcStore.url);

  // Pagination state
  const cursor = $derived((params.__rpcCursor as string) ?? "");
  const hasMore = $derived((params.__rpcHasMore as boolean) ?? false);

  function onMethodChange(e: Event) {
    graph.updateNodeParams(id, {
      method: (e.currentTarget as HTMLSelectElement).value,
      __rpcResult: "",
      __rpcCursor: "",
      __rpcHasMore: false,
    });
  }

  function onUrlChange(e: Event) {
    graph.updateNodeParams(id, {
      rpcUrl: (e.currentTarget as HTMLInputElement).value,
      __rpcResult: "",
      __rpcCursor: "",
      __rpcHasMore: false,
    });
  }

  function onParamChange(paramId: string, value: string) {
    graph.updateNodeParams(id, {
      [paramId]: value,
      __rpcResult: "",
      __rpcCursor: "",
      __rpcHasMore: false,
    });
  }

  function getInputValue(handleId: string): Value | undefined {
    const edge = graph.edges.find((e) => e.target === id && e.targetHandle === handleId);
    if (!edge) return undefined;
    const upstream = graph.evaluation.results.get(edge.source);
    if (upstream?.ok) return upstream.value;
    return undefined;
  }

  async function doFetch(nextPage = false) {
    const inputs: Record<string, Value | undefined> = {};
    for (const inp of method.inputs) {
      const val = getInputValue(inp.id);
      if (!val) {
        fetchState = "error";
        fetchError = `${inp.label} is not connected`;
        return;
      }
      inputs[inp.id] = val;
    }

    fetchState = "fetching";
    fetchError = "";
    try {
      const fetchCursor = nextPage ? cursor || undefined : undefined;
      const result = await method.fetch(rpcUrl, inputs, params, fetchCursor);
      graph.updateNodeParams(id, {
        __rpcResult: JSON.stringify(result.value),
        __rpcCursor: result.nextCursor ?? "",
        __rpcHasMore: result.hasMore ?? false,
      });
      fetchState = "idle";
    } catch (e) {
      fetchState = "error";
      fetchError = (e as Error).message;
    }
  }

  // Clear cache when method changes
  let prevMethod = $state("");
  $effect(() => {
    if (methodId !== prevMethod && prevMethod !== "") {
      graph.updateNodeParams(id, {
        __rpcResult: "",
        __rpcCursor: "",
        __rpcHasMore: false,
      });
    }
    prevMethod = methodId;
  });
</script>

<div
  class="al-node al-rpc"
  class:selected
  class:errored={fetchState === "error"}
  role="group"
  tabindex="-1"
>
  <NodeResizer isVisible={selected} minWidth={260} minHeight={80} />

  <header class="al-node__header">
    <span class="al-node__title">RPC</span>
    <span class="al-node__type">{method.outputLabel}</span>
  </header>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <section class="al-rpc__config nodrag" onpointerdown={(e) => e.stopPropagation()}>
    <select class="al-rpc__select al-input" value={methodId} onchange={onMethodChange}>
      {#each RPC_METHODS as m (m.id)}
        <option value={m.id}>{m.label}</option>
      {/each}
    </select>

    <input
      class="al-rpc__url al-input"
      type="url"
      value={rpcUrl}
      onchange={onUrlChange}
      placeholder="https://testnet.ckbapp.dev/"
      spellcheck="false"
    />

    {#each method.params as p (p.id)}
      {#if p.kind === "select"}
        <div class="al-rpc__param-row">
          <span class="al-rpc__param-label">{p.label}</span>
          <select
            class="al-input al-rpc__param-input"
            value={(params[p.id] as string) ?? p.default}
            onchange={(e) =>
              onParamChange(p.id, (e.currentTarget as HTMLSelectElement).value)}
          >
            {#each p.options as opt (opt)}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
        </div>
      {:else}
        <div class="al-rpc__param-row">
          <span class="al-rpc__param-label">{p.label}</span>
          <input
            class="al-input al-rpc__param-input"
            type="text"
            inputmode="numeric"
            value={(params[p.id] as string) ?? p.default}
            onchange={(e) => onParamChange(p.id, e.currentTarget.value)}
          />
        </div>
      {/if}
    {/each}

    <div class="al-rpc__buttons">
      <button
        class="al-rpc__fetch"
        onclick={() => doFetch(false)}
        disabled={fetchState === "fetching"}
      >
        {fetchState === "fetching" ? "Loading…" : "Fetch"}
      </button>
      {#if hasMore}
        <button
          class="al-rpc__next"
          onclick={() => doFetch(true)}
          disabled={fetchState === "fetching"}
        >
          → Next
        </button>
      {/if}
    </div>

    {#if fetchState === "error"}
      <div class="al-rpc__error">{fetchError}</div>
    {/if}
  </section>

  <section class="al-node__inputs">
    {#each method.inputs as inp (inp.id)}
      <div class="al-node__row">
        <Handle
          id={inp.id}
          type="target"
          position={Position.Left}
          class="al-handle al-handle--{inp.type}"
        />
        <span class="al-node__label">
          {inp.label}
          <span class="al-node__hint">{inp.type}</span>
        </span>
      </div>
    {/each}
  </section>

  <section class="al-node__result">
    {#if result?.ok}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="al-node__hex-wrap nodrag" onpointerdown={(e) => e.stopPropagation()}>
        <code class="al-node__hex"
          >{result.value.type === "Number" ? result.value.value : result.value.hex}</code
        >
      </div>
      {#if result.info}
        <div class="al-node__info">{result.info}</div>
      {/if}
    {:else if result}
      <div class="al-node__error">{result.error}</div>
    {/if}
  </section>

  {#if params.__rpcResult && params.__rpcResult !== ""}
    <div class="al-rpc__cached">
      ● cached{#if hasMore}
        · page available{/if}
    </div>
  {/if}

  <Handle
    id="out"
    type="source"
    position={Position.Right}
    class="al-handle al-handle--{method.outputType}"
  />
</div>

<style>
  .al-rpc {
    width: 100%;
    min-width: 260px;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    font-size: 12px;
    color: var(--c-text);
    box-shadow: 0 2px 8px var(--c-shadow);
  }
  .al-rpc.selected {
    border-color: var(--c-accent);
    box-shadow:
      0 0 0 1px var(--c-accent),
      0 2px 12px color-mix(in srgb, var(--c-accent) 30%, transparent);
  }
  .al-node__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid var(--c-border);
    font-weight: 600;
  }
  .al-node__type {
    color: var(--c-accent);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .al-rpc__config {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .al-rpc__select {
    cursor: pointer;
  }
  .al-input {
    width: 100%;
    background: var(--c-input-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-text);
    padding: 3px 6px;
    font-size: 11px;
    outline: none;
  }
  .al-input:focus {
    border-color: var(--c-accent);
  }
  .al-rpc__url {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 10px;
  }
  .al-rpc__param-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .al-rpc__param-label {
    font-size: 10px;
    color: var(--c-text-mute);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    min-width: 70px;
  }
  .al-rpc__param-input {
    flex: 1;
  }
  .al-rpc__buttons {
    display: flex;
    gap: 6px;
  }
  .al-rpc__fetch,
  .al-rpc__next {
    flex: 1;
    background: var(--c-border-strong);
    border: 1px solid var(--c-border-strong);
    border-radius: 4px;
    color: var(--c-text);
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .al-rpc__fetch:hover:not(:disabled) {
    background: var(--c-accent);
    border-color: var(--c-accent);
  }
  .al-rpc__next {
    flex: 0 0 auto;
  }
  .al-rpc__next:hover:not(:disabled) {
    background: var(--c-ok);
    border-color: var(--c-ok);
  }
  .al-rpc__fetch:disabled,
  .al-rpc__next:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .al-rpc__error {
    color: var(--c-err);
    font-size: 11px;
    word-break: break-word;
  }
  .al-rpc__cached {
    padding: 2px 10px 4px;
    font-size: 10px;
    color: var(--c-ok);
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
  .al-node__info {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid var(--c-border);
    font-size: 11px;
    color: var(--c-text-dim);
  }
  .al-node__error {
    color: var(--c-err);
    word-break: break-word;
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
    background: var(--c-script);
  }
  :global(.al-handle--Hash) {
    background: var(--c-hash);
  }
  :global(.al-handle--Number) {
    background: var(--c-number);
  }
</style>
