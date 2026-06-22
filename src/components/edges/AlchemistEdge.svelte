<script lang="ts">
  import {
    BaseEdge,
    EdgeLabel,
    getBezierPath,
    Position,
    type EdgeProps,
  } from "@xyflow/svelte";
  import { graph } from "$lib/store/graph.svelte";
  import { requireNodeSpec, type EvalResult, type EdgeType } from "$lib/nodes";

  let { id, source, sourceX, sourceY, targetX, targetY }: EdgeProps = $props();

  const geometry = $derived(
    getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: Position.Right,
      targetX,
      targetY,
      targetPosition: Position.Left,
    }),
  );
  const path = $derived(geometry[0]);
  const labelX = $derived(geometry[1]);
  const labelY = $derived(geometry[2]);

  const sourceNode = $derived(graph.nodes.find((n) => n.id === source));
  const sourceType: EdgeType = $derived(
    sourceNode && typeof sourceNode.type === "string"
      ? requireNodeSpec(sourceNode.type).output.type
      : "Bytes",
  );
  const sourceResult = $derived(graph.evaluation.results.get(source ?? ""));
  const preview = $derived(buildPreview(sourceResult));

  function buildPreview(result: EvalResult | undefined): string {
    if (!result || !result.ok) return "";
    if (result.value.type === "Number") return String(result.value.value);
    const hex = result.value.hex;
    return hex.length > 12 ? hex.slice(0, 12) + "…" : hex;
  }
</script>

<BaseEdge {id} {path} />
<EdgeLabel x={labelX} y={labelY} selectEdgeOnClick>
  <div class="al-edge-label al-edge-label--{sourceType}">
    <span class="al-edge-label__type">{sourceType}</span>
    {#if preview}
      <code class="al-edge-label__preview">{preview}</code>
    {/if}
  </div>
</EdgeLabel>

<style>
  .al-edge-label {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1a1d24;
    border: 1px solid #2a2e37;
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 10px;
    pointer-events: none;
    white-space: nowrap;
  }
  .al-edge-label__type {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .al-edge-label__preview {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    color: #b0b4bd;
  }
  .al-edge-label--Bytes .al-edge-label__type {
    color: #58a6ff;
  }
  .al-edge-label--Script .al-edge-label__type {
    color: #d29922;
  }
  .al-edge-label--Hash .al-edge-label__type {
    color: #7c5cff;
  }
  .al-edge-label--Number .al-edge-label__type {
    color: #3fb950;
  }
</style>
