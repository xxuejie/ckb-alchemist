import type { Edge, Node, XYPosition } from "@xyflow/svelte";
import type { EvalParams } from "../nodes/spec";

/** Marker so Svelte Flow's generic `Node` narrows to our payload. */
export interface AlchemistNodeData extends Record<string, unknown> {
  params: EvalParams;
}

export type AlchemistNode = Node<AlchemistNodeData, string>;
export type AlchemistEdge = Edge;

export function makeNode(
  id: string,
  type: string,
  position: XYPosition,
  params: EvalParams,
): AlchemistNode {
  return { id, type, position, data: { params } };
}

export function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): AlchemistEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "alchemist",
  };
}
