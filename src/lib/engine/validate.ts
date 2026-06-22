import type { Edge, Node, Connection } from "@xyflow/svelte";
import { isAssignable } from "../nodes/types";
import { requireNodeSpec } from "../nodes/registry";

/** The connection-like shapes Svelte Flow passes to `isValidConnection`. */
type ConnectionLike = Pick<
  Partial<Connection> & Partial<Edge>,
  "source" | "target" | "sourceHandle" | "targetHandle"
>;

/**
 * Returns a validator suitable for Svelte Flow's `isValidConnection` prop.
 *
 * Rules:
 *  - sourceHandle must be the source node's declared output handle
 *  - targetHandle must be one of the target node's declared input handles
 *  - the source output type must be assignable to the target input type
 *  - self-connections are rejected
 *
 * Note: type/cycle checks are independent; Svelte Flow calls this live while
 * dragging, so we keep it cheap and skip the cycle check (handled by the
 * engine's topological sort).
 */
export function makeConnectionValidator(
  nodes: Node[],
): (connection: ConnectionLike) => boolean {
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
  return (connection: ConnectionLike): boolean => {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || !sourceHandle || !targetHandle) return false;
    if (source === target) return false;

    const sourceNode = nodeById.get(source);
    const targetNode = nodeById.get(target);
    if (!sourceNode || !targetNode) return false;
    if (typeof sourceNode.type !== "string" || typeof targetNode.type !== "string")
      return false;

    const sourceSpec = requireNodeSpec(sourceNode.type);
    const targetSpec = requireNodeSpec(targetNode.type);

    if (sourceHandle !== sourceSpec.output.id) return false;
    const targetInput = targetSpec.inputs.find((i) => i.id === targetHandle);
    if (!targetInput) return false;

    if (!isAssignable(sourceSpec.output.type, targetInput.type)) return false;

    return true;
  };
}

/**
 * Cycle detector. Returns true if adding `source → target` to `edges` would
 * create a cycle (i.e. there is already a path from `target` back to `source`).
 */
export function wouldCreateCycle(
  edges: Pick<Edge, "source" | "target">[],
  source: string,
  target: string,
): boolean {
  if (source === target) return true;
  // BFS from target looking for source
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const arr = adj.get(e.source) ?? [];
    arr.push(e.target);
    adj.set(e.source, arr);
  }
  const seen = new Set<string>([target]);
  const queue: string[] = [target];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === source) return true;
    for (const next of adj.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
