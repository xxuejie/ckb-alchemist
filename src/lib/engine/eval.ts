import type { AlchemistEdge, AlchemistNode } from "./graph";
import type { EvalInputs, EvalResult } from "../nodes/spec";
import type { Value } from "../nodes/types";
import { requireNodeSpec } from "../nodes/registry";

export interface GraphEvaluation {
  /** Per-node result, keyed by node id. Absent = node was skipped (cycle). */
  results: Map<string, EvalResult>;
  /** Node ids that are part of a cycle and therefore unevaluated. */
  cycled: Set<string>;
}

/**
 * Topologically evaluates the graph in dependency order, propagating each
 * node's output to its consumers' inputs. Replaces the Rust `refresh()` +
 * `propagate()` loop with an explicit, correct dataflow.
 *
 * Cycles are detected and their members are marked unevaluated (with an
 * error result) rather than recursing forever.
 */
export function evaluateGraph(
  nodes: AlchemistNode[],
  edges: AlchemistEdge[],
): GraphEvaluation {
  const results = new Map<string, EvalResult>();
  const cycled = new Set<string>();

  const nodeById = new Map<string, AlchemistNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  // Group incoming edges per target.
  const incoming = new Map<string, AlchemistEdge[]>();
  for (const e of edges) {
    const arr = incoming.get(e.target) ?? [];
    arr.push(e);
    incoming.set(e.target, arr);
  }

  const order = topologicalOrder(nodes, edges, cycled);

  for (const id of order) {
    const node = nodeById.get(id);
    if (!node || typeof node.type !== "string") continue;
    const spec = requireNodeSpec(node.type);

    const inputs: EvalInputs = {};
    for (const e of incoming.get(id) ?? []) {
      if (!e.targetHandle) continue;
      const upstream = results.get(e.source);
      if (!upstream || !upstream.ok) continue;

      const inputDef = spec.inputs.find((i) => i.id === e.targetHandle);
      if (inputDef?.multiple) {
        const arr = (inputs[e.targetHandle] as Value[] | undefined) ?? [];
        arr.push(upstream.value);
        inputs[e.targetHandle] = arr;
      } else {
        inputs[e.targetHandle] = upstream.value;
      }
    }

    const result = spec.evaluate(inputs, node.data.params);
    results.set(id, result);
  }

  // Mark cycled nodes with an explicit error.
  for (const id of cycled) {
    results.set(id, { ok: false, error: "Node is part of a cycle" });
  }

  return { results, cycled };
}

/**
 * Kahn's algorithm. Nodes not reachable in topological order (cycle members)
 * are added to `cycledOut`.
 */
function topologicalOrder(
  nodes: AlchemistNode[],
  edges: AlchemistEdge[],
  cycledOut: Set<string>,
): string[] {
  const ids = nodes.map((n) => n.id);

  // Count incoming edges per node (only edges between known nodes).
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of ids) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (!inDegree.has(e.source) || !inDegree.has(e.target)) continue;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)!.push(e.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const out: string[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    out.push(cur);
    for (const next of adj.get(cur) ?? []) {
      const d = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  for (const [id, deg] of inDegree) {
    if (deg > 0) cycledOut.add(id);
  }

  return out;
}
