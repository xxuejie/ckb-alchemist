import { bytesFrom, hexFrom } from "@ckb-ccc/core";
import type { Bytes, BytesLike, Hex } from "@ckb-ccc/core";

/**
 * Decodes a hex string (with or without `0x` prefix) into raw bytes.
 * Mirrors the Rust `decode_hex` helper: error message format is preserved
 * (`Error parsing hex content: <reason>`).
 */
export function decodeHex(input: string): Bytes {
  const stripped =
    input.startsWith("0x") || input.startsWith("0X") ? input.slice(2) : input;
  if (stripped.length % 2 !== 0) {
    throw new Error("Error parsing hex content: Odd number of digits");
  }
  if (!/^[0-9a-fA-F]*$/.test(stripped)) {
    throw new Error("Error parsing hex content: Invalid character");
  }
  return bytesFrom(stripped, "hex");
}

/**
 * Returns true when `input` is a syntactically valid hex string (with or
 * without `0x`). Used to keep node UIs from throwing on partial input.
 */
export function isValidHex(input: string): boolean {
  try {
    decodeHex(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes any hex-like input into a `0x`-prefixed lowercase hex string.
 * Empty / invalid input normalizes to `"0x"`.
 */
export function normalizeHex(input: BytesLike | string): Hex {
  if (typeof input === "string") {
    const stripped =
      input.startsWith("0x") || input.startsWith("0X") ? input.slice(2) : input;
    if (stripped === "") return "0x";
    if (!/^[0-9a-fA-F]*$/.test(stripped) || stripped.length % 2 !== 0) return "0x";
    return `0x${stripped.toLowerCase()}`;
  }
  return hexFrom(input);
}

/** Empty bytes constant for default values. */
export const EMPTY_BYTES: Bytes = bytesFrom([]);
