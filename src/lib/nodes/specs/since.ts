import { Since, hexFrom } from "@ckb-ccc/core";
import type { NodeSpec } from "../spec";

export const SinceSpec: NodeSpec = {
  type: "since",
  label: "Since",
  description: "Configure a since field (absolute/relative × block/epoch/timestamp).",
  category: "CKB",
  inputs: [],
  output: { id: "out", label: "Bytes", type: "Bytes" },
  params: [
    {
      kind: "select",
      key: "relative",
      label: "Mode",
      options: [
        { value: "absolute", label: "Absolute" },
        { value: "relative", label: "Relative" },
      ],
    },
    {
      kind: "select",
      key: "metric",
      label: "Metric",
      options: [
        { value: "blockNumber", label: "Block Number" },
        { value: "epoch", label: "Epoch" },
        { value: "timestamp", label: "Timestamp" },
      ],
    },
    { kind: "number", key: "value", label: "Value", placeholder: "0" },
  ],
  defaultParams: { relative: "absolute", metric: "blockNumber", value: "0" },
  evaluate: (_inputs, params) => {
    try {
      const relative = (params.relative as string) ?? "absolute";
      const metric = (params.metric as string) ?? "blockNumber";
      const valueStr = (params.value as string) ?? "0";
      const value = BigInt(valueStr);
      if (value < 0n) return { ok: false, error: "Value must be non-negative" };
      const since = Since.from({
        relative: relative as "absolute" | "relative",
        metric: metric as "blockNumber" | "epoch" | "timestamp",
        value,
      });
      return { ok: true, value: { type: "Bytes", hex: hexFrom(since.toBytes()) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
