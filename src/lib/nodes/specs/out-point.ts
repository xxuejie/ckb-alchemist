import { OutPoint, hexFrom } from "@ckb-ccc/core";
import { decodeHex } from "$lib/ckb";
import type { NodeSpec } from "../spec";

/**
 * OutPoint — references a cell by transaction hash and output index.
 * Serializes to the CKB molecule struct `{ txHash: Byte32, index: Uint32 }`.
 */
export const OutPointSpec: NodeSpec = {
  type: "out-point",
  label: "OutPoint",
  description: "References a cell by tx hash + output index.",
  category: "Transaction",
  inputs: [],
  output: { id: "out", label: "OutPoint", type: "Bytes" },
  params: [
    {
      kind: "text",
      key: "txHash",
      label: "Tx Hash",
      mono: true,
      placeholder: "0x… (32 bytes)",
    },
    { kind: "number", key: "index", label: "Index", placeholder: "0" },
  ],
  defaultParams: { txHash: "0x", index: "0" },
  evaluate: (_inputs, params) => {
    const txHashStr = (params.txHash as string | undefined) ?? "0x";
    const indexStr = (params.index as string | undefined) ?? "0";

    try {
      const txHashBytes = decodeHex(txHashStr);
      if (txHashBytes.length !== 32) {
        return {
          ok: false,
          error: `Tx hash must be 32 bytes (got ${txHashBytes.length})`,
        };
      }
      const index = Number.parseInt(indexStr, 10);
      if (Number.isNaN(index)) {
        return { ok: false, error: `Invalid index: ${indexStr}` };
      }
      const op = OutPoint.from({ txHash: txHashStr as `0x${string}`, index });
      return { ok: true, value: { type: "Bytes", hex: hexFrom(op.toBytes()) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
