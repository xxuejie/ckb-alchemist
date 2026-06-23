import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesFrom, hexFrom, numBeToBytes, bytesConcat, hashCkb } from "@ckb-ccc/core";
import { messageHashCkbSecp256k1 } from "@ckb-ccc/core";
import { asHex, singleValue } from "../types";
import type { NodeSpec } from "../spec";

export const SignerSpec: NodeSpec = {
  type: "signer",
  label: "Signer",
  description: "Sign a message with a secp256k1 private key (CKB format).",
  category: "CKB",
  inputs: [{ id: "message", label: "message", type: "Bytes" }],
  output: { id: "out", label: "Signature", type: "Bytes" },
  params: [
    {
      kind: "text",
      key: "privateKey",
      label: "Private Key",
      mono: true,
      placeholder: "0x… (32 bytes)",
    },
  ],
  defaultParams: { privateKey: "" },
  evaluate: (inputs, params) => {
    const msgVal = singleValue(inputs.message);
    if (!msgVal) return { ok: false, error: "message is not connected" };
    const msgHex = asHex(msgVal);
    if (msgHex === undefined) return { ok: false, error: "message must carry bytes" };

    const pkStr = ((params.privateKey as string) ?? "").trim();
    if (!pkStr) return { ok: false, error: "Private key is required" };

    try {
      const pkBytes = bytesFrom(pkStr);
      if (pkBytes.length !== 32) {
        return {
          ok: false,
          error: `Private key must be 32 bytes (got ${pkBytes.length})`,
        };
      }

      // Hash message: "Nervos Message:" + message, then blake2b
      const hash = messageHashCkbSecp256k1(msgHex);

      // Sign
      const sig = secp256k1.sign(bytesFrom(hash), pkBytes);

      // Format: r(32 BE) || s(32 BE) || recovery(1) = 65 bytes
      const sigBytes = bytesConcat(
        numBeToBytes(sig.r, 32),
        numBeToBytes(sig.s, 32),
        numBeToBytes(sig.recovery, 1),
      );

      // Derive lock arg for display (blake2b of compressed pubkey, first 20 bytes)
      const pubKey = secp256k1.getPublicKey(pkBytes, true);
      const lockArg = hashCkb(pubKey).slice(2, 42);

      return {
        ok: true,
        value: { type: "Bytes", hex: hexFrom(sigBytes) },
        info: `lock arg: 0x${lockArg}`,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
