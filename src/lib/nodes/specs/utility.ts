import { asHex, singleValue } from "../types";
import type { NodeSpec } from "../spec";

export const NumberInputSpec: NodeSpec = {
  type: "number-input",
  label: "Number",
  description: "Enter a number constant.",
  category: "Utility",
  inputs: [],
  output: { id: "out", label: "Number", type: "Number" },
  params: [{ kind: "number", key: "value", label: "Value", placeholder: "0" }],
  defaultParams: { value: "0" },
  evaluate: (_inputs, params) => {
    const raw = (params.value as string) ?? "0";
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return { ok: false, error: `Invalid number: ${raw}` };
    return { ok: true, value: { type: "Number", value: n } };
  },
};

export const ConditionalSpec: NodeSpec = {
  type: "conditional",
  label: "Conditional",
  description: "Select A or B based on a Number predicate (0 = B, non-zero = A).",
  category: "Utility",
  inputs: [
    { id: "pred", label: "pred", type: "Number" },
    { id: "a", label: "a", type: "Bytes" },
    { id: "b", label: "b", type: "Bytes" },
  ],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const pred = singleValue(inputs.pred);
    if (!pred) return { ok: false, error: "pred is not connected" };
    if (pred.type !== "Number") return { ok: false, error: "pred must be a Number" };
    const chosen = pred.value !== 0 ? inputs.a : inputs.b;
    const label = pred.value !== 0 ? "a" : "b";
    if (!chosen) return { ok: false, error: `${label} is not connected` };
    const hex = asHex(chosen);
    if (hex === undefined) return { ok: false, error: `${label} must carry bytes` };
    return { ok: true, value: { type: "Bytes", hex }, info: `selected: ${label}` };
  },
};
