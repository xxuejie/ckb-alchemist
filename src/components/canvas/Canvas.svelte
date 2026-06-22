<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    type Connection,
    type NodeTypes,
    type EdgeTypes,
    BackgroundVariant,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/base.css";

  import AlchemistNode from "$components/nodes/AlchemistNode.svelte";
  import AlchemistEdge from "$components/edges/AlchemistEdge.svelte";
  import AlchemistConnectionLine from "$components/canvas/AlchemistConnectionLine.svelte";
  import Palette from "$components/panels/Palette.svelte";
  import TextPanel from "$components/panels/TextPanel.svelte";
  import { graph } from "$lib/store/graph.svelte";
  import { ui, theme } from "$lib/store";
  import { makeConnectionValidator } from "$lib/engine";
  import type { AlchemistEdge as AlchemistEdgeT } from "$lib/engine";

  const nodeTypes: NodeTypes = {
    "hex-input": AlchemistNode,
    "script-assembler": AlchemistNode,
    "ckb-hash": AlchemistNode,
    concat: AlchemistNode,
    slice: AlchemistNode,
  };

  const edgeTypes: EdgeTypes = {
    alchemist: AlchemistEdge,
  };

  const isValidConnection = $derived(makeConnectionValidator(graph.nodes));

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    if (!connection.sourceHandle || !connection.targetHandle) return;
    const edge: AlchemistEdgeT = {
      id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: "alchemist",
    };
    graph.addEdge(edge);
  }

  function onNodeClick(e: { node?: { id?: string } } | CustomEvent) {
    const nodeId = (e as unknown as { node?: { id?: string } }).node?.id;
    if (nodeId) graph.select(nodeId);
  }

  function onPaneClick() {
    graph.select(null);
  }

  // With bind:nodes/edges, Svelte Flow has already updated the arrays.
  // We only need to reset the selected node if it was deleted.
  function onDelete({ nodes: deletedNodes }: { nodes: { id: string }[] }) {
    graph.onElementsDeleted(new Set(deletedNodes.map((n) => n.id)));
  }

  // Enables edge reconnect anchors. Svelte Flow + bind:edges handles the
  // actual edge replacement; this handler exists to opt in to the feature.
  function onReconnect() {}
</script>

<SvelteFlow
  bind:nodes={graph.nodes}
  bind:edges={graph.edges}
  {nodeTypes}
  {edgeTypes}
  onconnect={onConnect}
  onreconnect={onReconnect}
  {isValidConnection}
  onnodeclick={onNodeClick}
  onpaneclick={onPaneClick}
  ondelete={onDelete}
  defaultEdgeOptions={{ type: "alchemist" }}
  connectionLineComponent={AlchemistConnectionLine}
  fitView
  colorMode={theme.current}
>
  <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
  <Controls />
  <MiniMap pannable zoomable />
  <Panel position="top-left">
    <Palette />
  </Panel>
  {#if ui.showTextPanel}
    <Panel position="top-right">
      <TextPanel />
    </Panel>
  {/if}
</SvelteFlow>
