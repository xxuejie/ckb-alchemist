import { ckbHash, decodeHex } from "$lib/ckb";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

/**
 * CkbHash — computes the CKB blake2b hash of the input bytes.
 * Ports `src/widgets/ckb_hash.rs`.
 */
export const CkbHashSpec: NodeSpec = {
  type: "ckb-hash",
  label: "CKB Hash",
  description: "Blake2b-256 with ckb-default-hash personalization.",
  category: "CKB",
  inputs: [{ id: "content", label: "content", type: "Bytes" }],
  output: { id: "out", label: "Hash", type: "Hash" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const content = inputs.content;
    if (!content) return { ok: false, error: "content is not connected" };
    try {
      const hex = asHex(content);
      if (hex === undefined) return { ok: false, error: "content must carry bytes" };
      const bytes = decodeHex(hex);
      const hashHex = ckbHash(bytes);
      return { ok: true, value: { type: "Hash", hex: hashHex } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
