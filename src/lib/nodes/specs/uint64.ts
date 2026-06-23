import { hexFrom, bytesFrom, numToBytes, numFromBytes } from "@ckb-ccc/core";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

export const ToUint64Spec: NodeSpec = {
  type: "to-uint64",
  label: "To Uint64 LE",
  description: "Encode a decimal number as 8-byte little-endian.",
  category: "Conversion",
  inputs: [],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [
    {
      kind: "text",
      key: "value",
      label: "Value",
      mono: true,
      placeholder: "e.g. 100000000",
    },
  ],
  defaultParams: { value: "0" },
  evaluate: (_inputs, params) => {
    const raw = (params.value as string) ?? "0";
    try {
      const n = BigInt(raw);
      if (n < 0n) return { ok: false, error: "Value must be non-negative" };
      return { ok: true, value: { type: "Bytes", hex: hexFrom(numToBytes(n, 8)) } };
    } catch {
      return { ok: false, error: `Invalid number: ${raw}` };
    }
  },
};

export const FromUint64Spec: NodeSpec = {
  type: "from-uint64",
  label: "From Uint64 LE",
  description: "Decode 8-byte little-endian to a decimal number.",
  category: "Conversion",
  inputs: [{ id: "input", label: "input", type: "Bytes" }],
  output: { id: "out", label: "Number", type: "Number" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const input = inputs.input;
    if (!input) return { ok: false, error: "input is not connected" };
    const hex = asHex(input);
    if (hex === undefined) return { ok: false, error: "input must carry bytes" };
    try {
      const bytes = bytesFrom(hex);
      if (bytes.length > 8)
        return { ok: false, error: `Expected ≤8 bytes, got ${bytes.length}` };
      const n = numFromBytes(bytes);
      return { ok: true, value: { type: "Number", value: Number(n) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
