import type { AlchemistEdge, AlchemistNode } from "$lib/engine";
import type { EvalParams } from "$lib/nodes";

/** The on-disk / in-DOM workflow shape. Versioned for forward compatibility. */
export interface WorkflowJson {
  version: 1;
  rpcUrl: string;
  nodes: Array<{
    id: string;
    type: string;
    position: [number, number];
    params: EvalParams;
    width?: number;
    style?: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
  }>;
}

export function toWorkflowJson(
  nodes: AlchemistNode[],
  edges: AlchemistEdge[],
  rpcUrl: string,
): WorkflowJson {
  return {
    version: 1,
    rpcUrl,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as string,
      position: [n.position.x, n.position.y],
      params: n.data.params,
      width: n.width,
      style: n.style,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? "",
      targetHandle: e.targetHandle ?? "",
    })),
  };
}

export function fromWorkflowJson(wf: WorkflowJson): {
  nodes: AlchemistNode[];
  edges: AlchemistEdge[];
  rpcUrl: string;
} {
  const nodes: AlchemistNode[] = wf.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position[0], y: n.position[1] },
    data: { params: n.params ?? {} },
    width: n.width,
    style: n.style,
  }));
  const edges: AlchemistEdge[] = wf.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: "alchemist",
  }));
  return { nodes, edges, rpcUrl: wf.rpcUrl };
}

/** Parses a JSON string into a WorkflowJson, with light validation. */
export function parseWorkflowJson(text: string): WorkflowJson {
  const obj = JSON.parse(text) as Partial<WorkflowJson>;
  if (obj.version !== 1) {
    throw new Error(`Unsupported workflow version: ${obj.version ?? "(missing)"}`);
  }
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error("Invalid workflow: nodes and edges must be arrays");
  }
  return obj as WorkflowJson;
}
