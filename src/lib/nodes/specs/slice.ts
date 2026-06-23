import { hexFrom } from "@ckb-ccc/core";
import { decodeHex } from "$lib/ckb";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

/**
 * Slice — extracts a sub-slice `[start, end)` from the input bytes.
 * Ports `src/widgets/slice.rs`. Errors preserve the Rust messages.
 */
export const SliceSpec: NodeSpec = {
  type: "slice",
  label: "Slice",
  description: "Extract bytes[start..end].",
  category: "Utility",
  inputs: [{ id: "input", label: "input", type: "Bytes" }],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [
    { kind: "number", key: "start", label: "Start", placeholder: "0" },
    { kind: "number", key: "end", label: "End", placeholder: "0" },
  ],
  defaultParams: { start: "0", end: "0" },
  evaluate: (inputs, params) => {
    const input = inputs.input;
    if (!input) return { ok: false, error: "input is not connected" };
    try {
      const hex = asHex(input);
      if (hex === undefined) return { ok: false, error: "input must carry bytes" };
      const data = decodeHex(hex);

      const startRaw = (params.start as string | undefined) ?? "";
      const endRaw = (params.end as string | undefined) ?? "";
      const start = parseRange(startRaw);
      const end = parseRange(endRaw);

      if (start > end) {
        return { ok: false, error: "Start must be smaller or equal to end!" };
      }
      if (end > data.length) {
        return { ok: false, error: "End exceeds data range!" };
      }
      const sliced = data.slice(start, end);
      return { ok: true, value: { type: "Bytes", hex: hexFrom(sliced) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

function parseRange(s: string): number {
  const n = Number.parseInt(s, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Error parsing number: ${s}`);
  }
  return n;
}
