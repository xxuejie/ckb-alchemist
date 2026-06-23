import {
  OutPoint,
  Transaction,
  CellOutput,
  Script,
  hexFrom,
  numToHex,
  bytesFrom,
} from "@ckb-ccc/core";
import type { TransactionLike, CellOutputLike } from "@ckb-ccc/core";
import { asHex, type EdgeType, type Value } from "./types";

/** Raw CKB JSON-RPC call with 30s timeout. */
async function ckbRpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Date.now(), jsonrpc: "2.0", method, params }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.error)
      throw new Error(`RPC error (${json.error.code}): ${json.error.message}`);
    return json.result;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("RPC request timed out (30s)", { cause: e });
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Encode a JS object as hex-encoded UTF-8 Bytes value. */
function jsonToValue(obj: unknown): Value {
  return { type: "Bytes", hex: hexFrom(bytesFrom(JSON.stringify(obj), "utf8")) };
}

export interface RpcMethodInput {
  id: string;
  label: string;
  type: EdgeType;
}

/** Method-specific param fields rendered by the RPC component. */
export interface RpcMethodParam {
  id: string;
  label: string;
  kind: "select" | "number";
  options?: string[];
  default: string;
}

export interface RpcFetchResult {
  value: Value;
  nextCursor?: string;
  hasMore?: boolean;
}

export interface RpcMethodDef {
  id: string;
  label: string;
  description: string;
  inputs: RpcMethodInput[];
  params: RpcMethodParam[];
  outputLabel: string;
  outputType: EdgeType;
  paginated: boolean;
  fetch: (
    url: string,
    inputs: Record<string, Value | undefined>,
    params: Record<string, unknown>,
    cursor?: string,
  ) => Promise<RpcFetchResult>;
}

function numToHexStr(n: number): string {
  return `0x${n.toString(16)}`;
}

export const RPC_METHODS: RpcMethodDef[] = [
  {
    id: "get_transaction",
    label: "get_transaction",
    description: "Fetch a transaction by hash.",
    inputs: [{ id: "txHash", label: "tx_hash", type: "Hash" }],
    params: [],
    outputLabel: "Transaction",
    outputType: "Bytes",
    paginated: false,
    async fetch(url, inputs) {
      const txHash = asHex(inputs.txHash);
      if (!txHash) throw new Error("tx_hash is not connected");
      const result = (await ckbRpc(url, "get_transaction", [txHash])) as {
        transaction?: TransactionLike;
      };
      if (!result.transaction) throw new Error("Transaction not found");
      const tx = Transaction.from(result.transaction);
      return { value: { type: "Bytes", hex: hexFrom(tx.toBytes()) } };
    },
  },
  {
    id: "get_live_cell",
    label: "get_live_cell",
    description: "Fetch a live cell by OutPoint.",
    inputs: [{ id: "outPoint", label: "out_point", type: "Bytes" }],
    params: [],
    outputLabel: "CellOutput",
    outputType: "Bytes",
    paginated: false,
    async fetch(url, inputs) {
      const opHex = asHex(inputs.outPoint);
      if (!opHex) throw new Error("out_point is not connected");
      const op = OutPoint.fromBytes(opHex);
      const result = (await ckbRpc(url, "get_live_cell", [
        { tx_hash: op.txHash, index: numToHex(op.index) },
        true,
      ])) as { cell?: { output?: CellOutputLike }; status?: string };
      if (!result.cell)
        throw new Error(`Cell not found (status: ${result.status ?? "unknown"})`);
      const cellOutput = CellOutput.from(result.cell.output!);
      return { value: { type: "Bytes", hex: hexFrom(cellOutput.toBytes()) } };
    },
  },
  {
    id: "get_header",
    label: "get_header",
    description: "Fetch a block header by hash.",
    inputs: [{ id: "hash", label: "block_hash", type: "Hash" }],
    params: [],
    outputLabel: "Header",
    outputType: "Bytes",
    paginated: false,
    async fetch(url, inputs) {
      const hash = asHex(inputs.hash);
      if (!hash) throw new Error("block_hash is not connected");
      const result = await ckbRpc(url, "get_header", [hash, 1]);
      if (!result) throw new Error("Header not found");
      return { value: jsonToValue(result) };
    },
  },
  {
    id: "get_tip_header",
    label: "get_tip_header",
    description: "Fetch the latest (tip) block header.",
    inputs: [],
    params: [],
    outputLabel: "Header",
    outputType: "Bytes",
    paginated: false,
    async fetch(url) {
      const result = await ckbRpc(url, "get_tip_header", [1]);
      if (!result) throw new Error("No tip header");
      return { value: jsonToValue(result) };
    },
  },
  {
    id: "get_header_by_number",
    label: "get_header_by_number",
    description: "Fetch a block header by block number.",
    inputs: [{ id: "number", label: "block_number", type: "Number" }],
    params: [],
    outputLabel: "Header",
    outputType: "Bytes",
    paginated: false,
    async fetch(url, inputs) {
      const numVal = inputs.number;
      if (!numVal || numVal.type !== "Number")
        throw new Error("block_number is not connected");
      const result = await ckbRpc(url, "get_header_by_number", [
        `0x${numVal.value.toString(16)}`,
        1,
      ]);
      if (!result) throw new Error(`Header not found for block ${numVal.value}`);
      return { value: jsonToValue(result) };
    },
  },
  {
    id: "get_cells",
    label: "get_cells (indexer)",
    description: "Query live cells by lock/type script.",
    inputs: [{ id: "script", label: "script", type: "Bytes" }],
    params: [
      {
        id: "scriptType",
        label: "Script Type",
        kind: "select",
        options: ["lock", "type"],
        default: "lock",
      },
      { id: "limit", label: "Limit", kind: "number", default: "10" },
    ],
    outputLabel: "Cells",
    outputType: "Bytes",
    paginated: true,
    async fetch(url, inputs, params, cursor) {
      const scriptHex = asHex(inputs.script);
      if (!scriptHex) throw new Error("script is not connected");
      const script = Script.fromBytes(scriptHex);
      const scriptType = (params.scriptType as string) ?? "lock";
      const limit = numToHexStr(Number.parseInt((params.limit as string) ?? "10", 10));

      const searchKey: Record<string, unknown> = {
        script: {
          code_hash: script.codeHash,
          hash_type: script.hashType,
          args: script.args,
        },
        script_type: scriptType,
      };

      const rpcParams: unknown[] = [searchKey, "asc", limit];
      if (cursor) rpcParams.push(cursor);

      const result = (await ckbRpc(url, "get_cells", rpcParams)) as {
        objects: unknown[];
        last_cursor: string;
      };

      const hasMore = result.objects.length >= Number.parseInt(limit, 16);
      return {
        value: jsonToValue({ cells: result.objects, count: result.objects.length }),
        nextCursor: result.last_cursor,
        hasMore,
      };
    },
  },
  {
    id: "get_transactions",
    label: "get_transactions (indexer)",
    description: "Query transactions by lock/type script.",
    inputs: [{ id: "script", label: "script", type: "Bytes" }],
    params: [
      {
        id: "scriptType",
        label: "Script Type",
        kind: "select",
        options: ["lock", "type"],
        default: "lock",
      },
      { id: "limit", label: "Limit", kind: "number", default: "10" },
    ],
    outputLabel: "Transactions",
    outputType: "Bytes",
    paginated: true,
    async fetch(url, inputs, params, cursor) {
      const scriptHex = asHex(inputs.script);
      if (!scriptHex) throw new Error("script is not connected");
      const script = Script.fromBytes(scriptHex);
      const scriptType = (params.scriptType as string) ?? "lock";
      const limit = numToHexStr(Number.parseInt((params.limit as string) ?? "10", 10));

      const searchKey: Record<string, unknown> = {
        script: {
          code_hash: script.codeHash,
          hash_type: script.hashType,
          args: script.args,
        },
        script_type: scriptType,
      };

      const rpcParams: unknown[] = [searchKey, "asc", limit];
      if (cursor) rpcParams.push(cursor);

      const result = (await ckbRpc(url, "get_transactions", rpcParams)) as {
        objects: unknown[];
        last_cursor: string;
      };

      const hasMore = result.objects.length >= Number.parseInt(limit, 16);
      return {
        value: jsonToValue({
          transactions: result.objects,
          count: result.objects.length,
        }),
        nextCursor: result.last_cursor,
        hasMore,
      };
    },
  },
];

export function getRpcMethod(id: string): RpcMethodDef | undefined {
  return RPC_METHODS.find((m) => m.id === id);
}
