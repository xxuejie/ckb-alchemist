import { getRpcMethod } from "../rpc-methods";
import type { NodeSpec } from "../spec";

/**
 * RPC — fetches data from a CKB node. Unlike other nodes, the evaluate
 * function is passive: it returns the cached result from the last fetch.
 * The actual fetch is triggered by the RPC node component (button click).
 *
 * The cached result is stored in `data.params.__rpcResult` as a JSON-serialized
 * Value. The method selection is in `data.params.method`.
 */
export const RpcSpec: NodeSpec = {
  type: "rpc",
  label: "RPC",
  description: "Fetch cells, transactions, etc. from a CKB node.",
  // Declare a superset of handles; the component renders only the relevant ones.
  inputs: [
    { id: "txHash", label: "tx_hash", type: "Hash", optional: true },
    { id: "outPoint", label: "out_point", type: "Bytes", optional: true },
  ],
  output: { id: "out", label: "RPC Result", type: "Bytes" },
  params: [
    { kind: "select", key: "method", label: "Method", options: [] },
  ],
  defaultParams: { method: "get_transaction", __rpcResult: "" },
  evaluate: (_inputs, params) => {
    const cached = params.__rpcResult as string | undefined;
    if (!cached || cached === "") {
      return { ok: false, error: "Click Fetch to load data" };
    }
    try {
      const value = JSON.parse(cached);
      const methodId = params.method as string;
      const method = getRpcMethod(methodId);
      const label = method?.outputLabel ?? "RPC Result";
      return { ok: true, value, info: `cached: ${label}` };
    } catch {
      return { ok: false, error: "Invalid cached result" };
    }
  },
};
