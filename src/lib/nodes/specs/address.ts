import { Script, hexFrom, hashTypeFromBytes } from "@ckb-ccc/core";
import { addressPayloadFromString, AddressFormat } from "@ckb-ccc/core/advanced";
import type { NodeSpec } from "../spec";

export const AddressSpec: NodeSpec = {
  type: "address",
  label: "Address",
  description: "Parse a CKB address into its lock Script.",
  category: "Conversion",
  inputs: [],
  output: { id: "out", label: "Script", type: "Bytes" },
  params: [
    { kind: "text", key: "address", label: "Address", mono: true, placeholder: "ckb1…" },
  ],
  defaultParams: { address: "" },
  evaluate: (_inputs, params) => {
    const addr = ((params.address as string) ?? "").trim();
    if (!addr) return { ok: false, error: "Enter a CKB address" };
    try {
      const { prefix, format, payload } = addressPayloadFromString(addr);
      if (format !== AddressFormat.Full) {
        return {
          ok: false,
          error: "Short/legacy addresses require an RPC client. Use Full format.",
        };
      }
      if (payload.length < 33) {
        return { ok: false, error: "Invalid address payload (too short)" };
      }
      const script = new Script(
        hexFrom(payload.slice(0, 32)),
        hashTypeFromBytes(payload.slice(32, 33)),
        hexFrom(payload.slice(33)),
      );
      const hex = hexFrom(script.toBytes());
      const network =
        prefix === "ckb" ? "mainnet" : prefix === "ckt" ? "testnet" : prefix;
      return {
        ok: true,
        value: { type: "Bytes", hex },
        info: `${network} · ${script.hashType}`,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
