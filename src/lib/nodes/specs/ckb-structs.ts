import { WitnessArgs, CellDep, OutPoint, hexFrom } from "@ckb-ccc/core";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

export const WitnessArgsSpec: NodeSpec = {
  type: "witness-args",
  label: "WitnessArgs",
  description: "Build witness arguments { lock, inputType, outputType }.",
  category: "CKB",
  inputs: [
    { id: "lock", label: "lock", type: "Bytes", optional: true },
    { id: "inputType", label: "input_type", type: "Bytes", optional: true },
    { id: "outputType", label: "output_type", type: "Bytes", optional: true },
  ],
  output: { id: "out", label: "WitnessArgs", type: "Bytes" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    try {
      const wa = WitnessArgs.from({
        lock: asHex(inputs.lock) ?? undefined,
        inputType: asHex(inputs.inputType) ?? undefined,
        outputType: asHex(inputs.outputType) ?? undefined,
      });
      return { ok: true, value: { type: "Bytes", hex: hexFrom(wa.toBytes()) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};

export const CellDepSpec: NodeSpec = {
  type: "cell-dep",
  label: "CellDep",
  description: "Build a cell dependency { outPoint, depType }.",
  category: "CKB",
  inputs: [{ id: "outPoint", label: "out_point", type: "Bytes" }],
  output: { id: "out", label: "CellDep", type: "Bytes" },
  params: [
    {
      kind: "select",
      key: "depType",
      label: "Dep Type",
      options: [
        { value: "code", label: "code" },
        { value: "depGroup", label: "depGroup" },
      ],
    },
  ],
  defaultParams: { depType: "code" },
  evaluate: (inputs, params) => {
    const opVal = inputs.outPoint;
    if (!opVal) return { ok: false, error: "out_point is not connected" };
    const opHex = asHex(opVal);
    if (opHex === undefined) return { ok: false, error: "out_point must carry bytes" };
    try {
      const op = OutPoint.fromBytes(opHex);
      const dep = CellDep.from({
        outPoint: op,
        depType: (params.depType as string) ?? "code",
      });
      return { ok: true, value: { type: "Bytes", hex: hexFrom(dep.toBytes()) } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
