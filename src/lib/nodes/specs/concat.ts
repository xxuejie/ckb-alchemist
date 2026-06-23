import { bytesFrom, hexFrom } from "@ckb-ccc/core";
import { decodeHex } from "$lib/ckb";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

/**
 * Concat — concatenates two byte streams. Ports `src/widgets/concat.rs`.
 * Rust output: `format!("0x{:x}{:x}", raw1, raw2)`.
 */
export const ConcatSpec: NodeSpec = {
  type: "concat",
  label: "Concat",
  description: "Concatenate two byte streams (a ‖ b).",
  category: "Utility",
  inputs: [
    { id: "a", label: "a", type: "Bytes" },
    { id: "b", label: "b", type: "Bytes" },
  ],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const a = inputs.a;
    const b = inputs.b;
    if (!a) return { ok: false, error: "a is not connected" };
    if (!b) return { ok: false, error: "b is not connected" };
    try {
      const aHex = asHex(a);
      const bHex = asHex(b);
      if (aHex === undefined) return { ok: false, error: "a must carry bytes" };
      if (bHex === undefined) return { ok: false, error: "b must carry bytes" };
      const raw1 = decodeHex(aHex);
      const raw2 = decodeHex(bHex);
      const combined = bytesFrom([...raw1, ...raw2]);
      return { ok: true, value: { type: "Bytes", hex: hexFrom(combined) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
