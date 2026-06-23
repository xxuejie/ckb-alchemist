import {
  CellOutput,
  CellInput,
  OutPoint,
  Transaction,
  hexFrom,
  type Hex,
} from "@ckb-ccc/core";
import { multiAsHex } from "../types";
import type { NodeSpec } from "../spec";

/**
 * Transaction — assembles a CKB transaction from multiple cell outputs and
 * input OutPoints. Computes the serialized transaction and its hash.
 *
 * Uses multi-input handles for `outputs` (CellOutput molecules from Cell
 * nodes) and `inputs` (OutPoint molecules from OutPoint nodes).
 *
 * The tx hash is `blake2b(rawTransactionBytes)` — the canonical CKB
 * transaction hash excluding witnesses.
 */
export const TransactionSpec: NodeSpec = {
  type: "transaction",
  label: "Transaction",
  description: "Assemble a CKB transaction from outputs and inputs.",
  inputs: [
    {
      id: "outputs",
      label: "outputs",
      type: "Bytes",
      multiple: true,
      optional: true,
    },
    {
      id: "inputs",
      label: "inputs",
      type: "Bytes",
      multiple: true,
      optional: true,
    },
  ],
  output: { id: "out", label: "Transaction", type: "Bytes" },
  params: [
    {
      kind: "text",
      key: "headerDeps",
      label: "Header Deps (one per line)",
      multiline: true,
      mono: true,
      placeholder: "0x…",
    },
  ],
  defaultParams: { headerDeps: "" },

  evaluate: (inputs, params) => {
    try {
      // --- Parse outputs (CellOutput molecules) ---
      const outputHexes = multiAsHex(inputs.outputs);
      const cellOutputs: CellOutput[] = [];
      for (const hex of outputHexes) {
        try {
          cellOutputs.push(CellOutput.fromBytes(hex));
        } catch {
          return { ok: false, error: "Invalid CellOutput molecule in outputs" };
        }
      }

      // --- Parse inputs (OutPoint molecules) ---
      const inputHexes = multiAsHex(inputs.inputs);
      const cellInputs: CellInput[] = [];
      for (const hex of inputHexes) {
        try {
          const op = OutPoint.fromBytes(hex);
          cellInputs.push(CellInput.from({ previousOutput: op }));
        } catch {
          return { ok: false, error: "Invalid OutPoint molecule in inputs" };
        }
      }

      // --- Parse headerDeps ---
      const headerDepsStr = (params.headerDeps as string | undefined) ?? "";
      const headerDeps: Hex[] = headerDepsStr
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => {
          if (s.length !== 66) {
            throw new Error(`Header dep must be 32 bytes: ${s.slice(0, 20)}…`);
          }
          return hexFrom(s) as Hex;
        });

      // --- Build the transaction ---
      const outputsData: Hex[] = cellOutputs.map(() => "0x" as Hex);

      const tx = Transaction.from({
        version: 0,
        cellDeps: [],
        headerDeps,
        inputs: cellInputs.map((ci) => ({
          previousOutput: ci.previousOutput,
        })),
        outputs: cellOutputs.map((co) => ({
          capacity: co.capacity,
          lock: co.lock,
          type: co.type,
        })),
        outputsData,
        witnesses: [],
      });

      const fullHex = hexFrom(tx.toBytes());
      const txHash = tx.hash();

      const info = `tx hash: ${txHash}\n${cellOutputs.length} output(s), ${cellInputs.length} input(s)`;

      return { ok: true, value: { type: "Bytes", hex: fullHex }, info };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
