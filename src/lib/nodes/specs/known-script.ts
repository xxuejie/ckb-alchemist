import { Script, hexFrom } from "@ckb-ccc/core";
import { decodeHex, normalizeHex } from "$lib/ckb";
import type { NodeSpec } from "../spec";

interface KnownScriptDef {
  id: string;
  label: string;
  codeHash: string;
  hashType: "type" | "data";
}

// Mainnet code hashes for well-known system scripts.
const KNOWN_SCRIPTS: KnownScriptDef[] = [
  {
    id: "secp256k1-blake160",
    label: "Secp256k1-Blake160 (standard lock)",
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
  },
  {
    id: "secp256k1-multisig",
    label: "Secp256k1-Multisig",
    codeHash: "0x5c5069eb0857efc65e1bca060071ab50be5990717f059fe8aa8834c53936b54d",
    hashType: "type",
  },
  {
    id: "nervos-dao",
    label: "Nervos DAO (type)",
    codeHash: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3fb81d612c46ed1",
    hashType: "type",
  },
];

export const KnownScriptSpec: NodeSpec = {
  type: "known-script",
  label: "Known Script",
  description: "Predefined system script code hashes (mainnet).",
  category: "CKB",
  inputs: [],
  output: { id: "out", label: "Script", type: "Bytes" },
  params: [
    {
      kind: "select",
      key: "script",
      label: "Script",
      options: KNOWN_SCRIPTS.map((s) => ({ value: s.id, label: s.label })),
    },
    {
      kind: "text",
      key: "args",
      label: "Args",
      mono: true,
      placeholder: "0x… (e.g. 20-byte lock arg)",
    },
  ],
  defaultParams: { script: "secp256k1-blake160", args: "0x" },
  evaluate: (_inputs, params) => {
    const scriptId = (params.script as string) ?? "secp256k1-blake160";
    const def = KNOWN_SCRIPTS.find((s) => s.id === scriptId);
    if (!def) return { ok: false, error: `Unknown script: ${scriptId}` };
    const argsStr = (params.args as string) ?? "0x";
    try {
      decodeHex(argsStr);
      const script = new Script(
        def.codeHash as `0x${string}`,
        def.hashType,
        normalizeHex(argsStr) as `0x${string}`,
      );
      return {
        ok: true,
        value: { type: "Bytes", hex: hexFrom(script.toBytes()) },
        info: `${def.label} · ${def.hashType}`,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
