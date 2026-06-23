import type { AlchemistEdge, AlchemistNode } from "$lib/engine";
import { evaluateGraph } from "$lib/engine";
import type { XYPosition } from "@xyflow/svelte";
import { createSeedGraph } from "$lib/nodes";
import type { EvalParams } from "$lib/nodes";
import { requireNodeSpec, getNodeSpec } from "$lib/nodes";

let idCounter = 0;

function freshId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * Graph store using Svelte 5 class-based runes. The `nodes` and `edges`
 * properties are `$state` fields, which means `bind:nodes={graph.nodes}` in
 * a component compiles to a writable property access — Svelte Flow's internal
 * mutations (deletions, drags) flow directly back here.
 */
class GraphStore {
  nodes = $state<AlchemistNode[]>([]);
  edges = $state<AlchemistEdge[]>([]);
  selectedNodeId = $state<string | null>(null);

  selectedNode(): AlchemistNode | undefined {
    return this.selectedNodeId
      ? this.nodes.find((n) => n.id === this.selectedNodeId)
      : undefined;
  }

  select(id: string | null) {
    this.selectedNodeId = id;
  }

  addNode(type: string, position: XYPosition): AlchemistNode {
    requireNodeSpec(type);
    const params = structuredClone(requireNodeSpec(type).defaultParams);
    const node: AlchemistNode = {
      id: freshId(type),
      type,
      position,
      data: { params },
      width: 280,
      style: "width: 280px",
    };
    this.nodes.push(node);
    this.selectedNodeId = node.id;
    return node;
  }

  removeNode(id: string) {
    const idx = this.nodes.findIndex((n) => n.id === id);
    if (idx >= 0) this.nodes.splice(idx, 1);
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const e = this.edges[i]!;
      if (e.source === id || e.target === id) {
        this.edges.splice(i, 1);
      }
    }
    if (this.selectedNodeId === id) this.selectedNodeId = null;
  }

  updateNodeParams(id: string, patch: EvalParams) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    node.data.params = { ...node.data.params, ...patch };
  }

  replaceNodeParams(id: string, params: EvalParams) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    node.data.params = params;
  }

  updateNodePosition(id: string, position: XYPosition) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    node.position = position;
  }

  addEdge(edge: AlchemistEdge) {
    // Check if the target handle is multi-input.
    const targetNode = this.nodes.find((n) => n.id === edge.target);
    const spec =
      targetNode && typeof targetNode.type === "string"
        ? getNodeSpec(targetNode.type)
        : undefined;
    const inputDef = spec?.inputs.find((i) => i.id === edge.targetHandle);

    if (inputDef?.multiple) {
      // Allow multiple edges — skip exact duplicates only.
      const exists = this.edges.some(
        (e) =>
          e.source === edge.source &&
          e.sourceHandle === edge.sourceHandle &&
          e.target === edge.target &&
          e.targetHandle === edge.targetHandle,
      );
      if (!exists) this.edges.push(edge);
    } else {
      // Single-input: replace existing edge into the same target handle.
      const idx = this.edges.findIndex(
        (e) => e.target === edge.target && e.targetHandle === edge.targetHandle,
      );
      if (idx >= 0) this.edges.splice(idx, 1);
      this.edges.push(edge);
    }
  }

  removeEdge(id: string) {
    const idx = this.edges.findIndex((e) => e.id === id);
    if (idx >= 0) this.edges.splice(idx, 1);
  }

  loadGraph(nodes: AlchemistNode[], edges: AlchemistEdge[]) {
    this.nodes.splice(0, this.nodes.length, ...nodes);
    this.edges.splice(0, this.edges.length, ...edges);
    this.selectedNodeId = null;
  }

  resetToSeed() {
    const seed = createSeedGraph();
    this.nodes.splice(0, this.nodes.length, ...seed.nodes);
    this.edges.splice(0, this.edges.length, ...seed.edges);
    this.selectedNodeId = null;
  }

  clear() {
    this.nodes.splice(0, this.nodes.length);
    this.edges.splice(0, this.edges.length);
    this.selectedNodeId = null;
  }

  /** Called after Svelte Flow deletes elements — resets selection only. */
  onElementsDeleted(deletedNodeIds: Set<string>) {
    if (this.selectedNodeId && deletedNodeIds.has(this.selectedNodeId)) {
      this.selectedNodeId = null;
    }
  }

  get evaluation() {
    return evaluateGraph(this.nodes, this.edges);
  }
}

export const graph = new GraphStore();
