import {
  CellOutput,
  CellInput,
  CellDep,
  OutPoint,
  Transaction,
  hexFrom,
  type Hex,
} from "@ckb-ccc/core";
import { multiAsHex, singleValue } from "../types";
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
  category: "Transaction",
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
    {
      id: "cellDeps",
      label: "cell_deps",
      type: "Bytes",
      multiple: true,
      optional: true,
    },
    { id: "molecule", label: "decode", type: "Bytes", optional: true },
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
      // Decode mode: molecule input connected → decode and display
      const molVal = singleValue(inputs.molecule);
      if (molVal) {
        const molHex = molVal.type === "Number" ? undefined : molVal.hex;
        if (molHex !== undefined) {
          try {
            const tx = Transaction.fromBytes(molHex);
            const txHash = tx.hash();
            return {
              ok: true,
              value: { type: "Bytes", hex: molHex },
              info: [
                `tx hash: ${txHash}`,
                `version: ${tx.version}`,
                `${tx.inputs.length} input(s), ${tx.outputs.length} output(s)`,
                `${tx.cellDeps.length} cell dep(s), ${tx.headerDeps.length} header dep(s)`,
                `${tx.witnesses.length} witness(es)`,
              ].join("\n"),
            };
          } catch (e) {
            return {
              ok: false,
              error: `Invalid Transaction molecule: ${(e as Error).message}`,
            };
          }
        }
      }

      // Assemble mode
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

      // --- Parse cellDeps (CellDep molecules) ---
      const cellDepHexes = multiAsHex(inputs.cellDeps);
      const cellDepsParsed: CellDep[] = [];
      for (const hex of cellDepHexes) {
        try {
          cellDepsParsed.push(CellDep.fromBytes(hex));
        } catch {
          return { ok: false, error: "Invalid CellDep molecule in cell_deps" };
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
        cellDeps: cellDepsParsed.map((cd) => ({
          outPoint: cd.outPoint,
          depType: cd.depType,
        })),
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

      const info = `tx hash: ${txHash}\n${cellOutputs.length} output(s), ${cellInputs.length} input(s), ${cellDepsParsed.length} cell dep(s)`;

      return { ok: true, value: { type: "Bytes", hex: fullHex }, info };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
