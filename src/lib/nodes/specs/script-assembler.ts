import {
  decodeHex,
  parseCodeHash,
  serializeScriptHex,
  type ScriptHashType,
} from "$lib/ckb";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

/** Stored shape of the hashType param (n is a string to allow partial input). */
export type HashTypeParam =
  | { kind: "Data" }
  | { kind: "Type" }
  | { kind: "Data1" }
  | { kind: "DataN"; n: string };

export const DEFAULT_HASH_TYPE_PARAM: HashTypeParam = { kind: "Data" };

/** Parses the param shape into the domain type, validating `n`. */
export function toScriptHashType(p: HashTypeParam): ScriptHashType {
  if (p.kind === "DataN") {
    const n = Number.parseInt(p.n, 10);
    if (Number.isNaN(n)) {
      throw new Error(`Error parsing n: ${p.n}`);
    }
    return { kind: "DataN", n };
  }
  return p;
}

/**
 * ScriptAssembler — assembles a CKB Script from code_hash + hash_type + args
 * and serializes it to molecule bytes. Ports `src/widgets/script.rs`.
 */
export const ScriptAssemblerSpec: NodeSpec = {
  type: "script-assembler",
  label: "Script Assembler",
  description: "Assemble code_hash + hash_type + args into a serialized Script.",
  inputs: [
    { id: "code_hash", label: "code_hash", type: "Hash" },
    { id: "args", label: "args", type: "Bytes" },
  ],
  output: { id: "out", label: "Script", type: "Script" },
  params: [{ kind: "hashType", key: "hashType", label: "Hash Type" }],
  defaultParams: { hashType: { ...DEFAULT_HASH_TYPE_PARAM } },
  evaluate: (inputs, params) => {
    const codeHashVal = inputs.code_hash;
    if (!codeHashVal) return { ok: false, error: "code_hash is not connected" };
    const argsVal = inputs.args;
    if (!argsVal) return { ok: false, error: "args is not connected" };

    try {
      const codeHashHex = asHex(codeHashVal);
      if (codeHashHex === undefined) {
        return { ok: false, error: "code_hash must carry bytes" };
      }
      const codeHash = parseCodeHash(codeHashHex);

      const hashTypeParam = (params.hashType as HashTypeParam) ?? DEFAULT_HASH_TYPE_PARAM;
      const hashType = toScriptHashType(hashTypeParam);

      const argsHex = asHex(argsVal);
      if (argsHex === undefined) {
        return { ok: false, error: "args must carry bytes" };
      }
      const args = decodeHex(argsHex);

      const hex = serializeScriptHex({ codeHash, hashType, args });
      return { ok: true, value: { type: "Script", hex } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
