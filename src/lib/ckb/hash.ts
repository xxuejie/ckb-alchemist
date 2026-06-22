import { hashCkb } from "@ckb-ccc/core";
import type { Hex, BytesLike } from "@ckb-ccc/core";

/**
 * CKB blake2b hash (32 bytes, `ckb-default-hash` personalization).
 * Identical to the Rust `blake2b_256` helper. Returns `0x`-prefixed lowercase hex.
 */
export function ckbHash(data: BytesLike): Hex {
  return hashCkb(data);
}
