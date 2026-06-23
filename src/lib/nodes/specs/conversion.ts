import { hexFrom, bytesFrom, bytesTo } from "@ckb-ccc/core";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

export const StringToHexSpec: NodeSpec = {
  type: "string-to-hex",
  label: "String → Hex",
  description: "Encode UTF-8 text to hex bytes.",
  category: "Conversion",
  inputs: [],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [
    { kind: "text", key: "text", label: "Text", multiline: true, placeholder: "Hello" },
  ],
  defaultParams: { text: "" },
  evaluate: (_inputs, params) => {
    const text = (params.text as string) ?? "";
    const hex = hexFrom(bytesFrom(text, "utf8"));
    return { ok: true, value: { type: "Bytes", hex } };
  },
};

export const HexToStringSpec: NodeSpec = {
  type: "hex-to-string",
  label: "Hex → String",
  description: "Decode hex bytes as UTF-8 text.",
  category: "Conversion",
  inputs: [{ id: "input", label: "input", type: "Bytes" }],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const input = inputs.input;
    if (!input) return { ok: false, error: "input is not connected" };
    const hex = asHex(input);
    if (hex === undefined) return { ok: false, error: "input must carry bytes" };
    try {
      const text = bytesTo(bytesFrom(hex), "utf8");
      return { ok: true, value: { type: "Bytes", hex }, info: `text: "${text}"` };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

export const ReverseBytesSpec: NodeSpec = {
  type: "reverse-bytes",
  label: "Reverse Bytes",
  description: "Reverse byte order (swap endianness).",
  category: "Conversion",
  inputs: [{ id: "input", label: "input", type: "Bytes" }],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const input = inputs.input;
    if (!input) return { ok: false, error: "input is not connected" };
    const hex = asHex(input);
    if (hex === undefined) return { ok: false, error: "input must carry bytes" };
    const reversed = bytesFrom(hex).reverse();
    return { ok: true, value: { type: "Bytes", hex: hexFrom(reversed) } };
  },
};
