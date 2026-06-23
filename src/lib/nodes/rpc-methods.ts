import { OutPoint, Transaction, CellOutput, hexFrom, numToHex } from "@ckb-ccc/core";
import type { TransactionLike, CellOutputLike } from "@ckb-ccc/core";
import { asHex, type EdgeType, type Value } from "./types";

/** Raw CKB JSON-RPC call. */
async function ckbRpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: Date.now(), jsonrpc: "2.0", method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error (${json.error.code}): ${json.error.message}`);
  return json.result;
}

export interface RpcMethodInput {
  id: string;
  label: string;
  type: EdgeType;
}

export interface RpcMethodDef {
  id: string;
  label: string;
  description: string;
  inputs: RpcMethodInput[];
  outputLabel: string;
  outputType: EdgeType;
  fetch: (url: string, inputs: Record<string, Value | undefined>) => Promise<Value>;
}

export const RPC_METHODS: RpcMethodDef[] = [
  {
    id: "get_transaction",
    label: "get_transaction",
    description: "Fetch a transaction by hash.",
    inputs: [{ id: "txHash", label: "tx_hash", type: "Hash" }],
    outputLabel: "Transaction",
    outputType: "Bytes",
    async fetch(url, inputs) {
      const txHash = asHex(inputs.txHash);
      if (!txHash) throw new Error("tx_hash is not connected");
      const result = (await ckbRpc(url, "get_transaction", [txHash])) as {
        transaction?: TransactionLike;
      };
      if (!result.transaction) throw new Error("Transaction not found");
      const tx = Transaction.from(result.transaction);
      return { type: "Bytes" as const, hex: hexFrom(tx.toBytes()) };
    },
  },
  {
    id: "get_live_cell",
    label: "get_live_cell",
    description: "Fetch a live cell by OutPoint.",
    inputs: [{ id: "outPoint", label: "out_point", type: "Bytes" }],
    outputLabel: "CellOutput",
    outputType: "Bytes",
    async fetch(url, inputs) {
      const opHex = asHex(inputs.outPoint);
      if (!opHex) throw new Error("out_point is not connected");
      const op = OutPoint.fromBytes(opHex);
      const result = (await ckbRpc(url, "get_live_cell", [
        { tx_hash: op.txHash, index: numToHex(op.index) },
        true,
      ])) as { cell?: { output?: CellOutputLike }; status?: string };
      if (!result.cell) throw new Error(`Cell not found (status: ${result.status ?? "unknown"})`);
      const cellOutput = CellOutput.from(result.cell.output!);
      return { type: "Bytes" as const, hex: hexFrom(cellOutput.toBytes()) };
    },
  },
];

export function getRpcMethod(id: string): RpcMethodDef | undefined {
  return RPC_METHODS.find((m) => m.id === id);
}
