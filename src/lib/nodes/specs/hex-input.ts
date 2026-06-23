import { decodeHex, normalizeHex } from "$lib/ckb";
import type { NodeSpec } from "../spec";

/**
 * HexInput — manual entry point for raw bytes on the canvas.
 * Extracts the free-form text fields that were baked into other Rust widgets.
 */
export const HexInputSpec: NodeSpec = {
  type: "hex-input",
  label: "Hex Input",
  description: "Type raw hex bytes. Output type: Bytes.",
  category: "Utility",
  inputs: [],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [
    {
      kind: "text",
      key: "hex",
      label: "Hex",
      multiline: true,
      mono: true,
      placeholder: "0x…",
    },
  ],
  defaultParams: { hex: "0x" },
  evaluate: (_inputs, params) => {
    const raw = (params.hex as string | undefined) ?? "";
    try {
      decodeHex(raw);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    return { ok: true, value: { type: "Bytes", hex: normalizeHex(raw) } };
  },
};
