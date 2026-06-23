import {
  Script,
  CellOutput,
  hexFrom,
  fixedPointFrom,
  fixedPointToString,
  Zero,
} from "@ckb-ccc/core";
import { decodeHex } from "$lib/ckb";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

/**
 * Cell — a CKB cell output template with capacity, lock, type, and data.
 *
 * Capacity is entered as a decimal string (e.g. "100.5" for 100.5 CKB) and
 * internally uses CCC's `FixedPoint` (bigint with 8 decimal places) — no
 * floating point.
 *
 * Lock and type accept molecule-serialized Script bytes (from ScriptAssembler
 * or HexInput with raw molecule data). Type and data are optional.
 *
 * The node reports whether the capacity is sufficient to store the cell
 * (capacity >= occupied_size_in_bytes × 10⁸ shannon).
 */
export const CellSpec: NodeSpec = {
  type: "cell",
  label: "Cell",
  description: "CKB cell with capacity, lock, optional type, and data.",
  category: "CKB",
  inputs: [
    { id: "lock", label: "lock", type: "Bytes" },
    { id: "type", label: "type", type: "Bytes", optional: true },
    { id: "data", label: "data", type: "Bytes", optional: true },
  ],
  output: { id: "out", label: "CellOutput", type: "Bytes" },
  params: [
    {
      kind: "text",
      key: "capacity",
      label: "Capacity (CKB)",
      mono: true,
      placeholder: "e.g. 100.5",
    },
  ],
  defaultParams: { capacity: "0" },

  evaluate: (inputs, params) => {
    const lockVal = inputs.lock;
    if (!lockVal) return { ok: false, error: "lock is not connected" };

    try {
      const lockHex = asHex(lockVal);
      if (lockHex === undefined) {
        return { ok: false, error: "lock must carry bytes" };
      }

      // Decode molecule-serialized Script from the input.
      const lockScript = Script.fromBytes(lockHex);

      // Type is optional.
      const typeVal = inputs.type;
      let typeScript: Script | undefined;
      if (typeVal) {
        const typeHex = asHex(typeVal);
        if (typeHex !== undefined) {
          try {
            typeScript = Script.fromBytes(typeHex);
          } catch {
            return { ok: false, error: "type input is not a valid Script molecule" };
          }
        }
      }

      // Data is optional.
      const dataVal = inputs.data;
      let dataLen = 0;
      if (dataVal) {
        const dataHex = asHex(dataVal);
        if (dataHex !== undefined) {
          dataLen = decodeHex(dataHex).length;
        }
      }

      // Parse capacity as decimal CKB → shannon (FixedPoint bigint).
      const capacityStr = (params.capacity as string | undefined) ?? "0";
      const capacity = parseCapacity(capacityStr);

      // Calculate occupied size and minimum required capacity.
      const outputOccupied =
        8 + lockScript.occupiedSize + (typeScript?.occupiedSize ?? 0);
      const cellOccupied = outputOccupied + dataLen;
      const minCapacity = fixedPointFrom(cellOccupied); // bytes × 10^8 = shannon
      const isSufficient = capacity >= minCapacity;

      // Build CellOutput molecule.
      const cellOutput = CellOutput.from({
        capacity,
        lock: lockScript,
        type: typeScript,
      });
      const hex = hexFrom(cellOutput.toBytes());

      const info = buildInfo(capacity, minCapacity, isSufficient);

      if (!isSufficient) {
        return {
          ok: false,
          error: `${info}`,
        };
      }

      return { ok: true, value: { type: "Bytes", hex }, info };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

/** Parses a decimal CKB string to shannon (bigint), rejecting negative / NaN. */
function parseCapacity(s: string): bigint {
  const trimmed = s.trim();
  if (trimmed === "") return Zero;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid capacity: ${s}`);
  }
  return fixedPointFrom(trimmed);
}

function buildInfo(capacity: bigint, minCapacity: bigint, sufficient: boolean): string {
  const free = capacity - minCapacity;
  const sign = sufficient ? "✓" : "✗";
  const freeStr = sufficient
    ? `free ${fixedPointToString(free)} CKB`
    : `short ${fixedPointToString(-free)} CKB`;
  return `${sign} min ${fixedPointToString(minCapacity)} CKB · ${freeStr}`;
}
