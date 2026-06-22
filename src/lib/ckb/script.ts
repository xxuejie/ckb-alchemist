import { bytesFrom, hexFrom, mol } from "@ckb-ccc/core";
import type { Bytes, BytesLike, Hex } from "@ckb-ccc/core";
import { decodeHex } from "./hex";

/**
 * CKB Script hash type — mirrors the Rust `ScriptHashTypeInner`.
 * `Data`, `Type`, `Data1` are the named variants; `DataN` is parameterized
 * by `n` (1..=127), serialized as `n << 1` in a single byte.
 */
export type ScriptHashType =
  | { kind: "Data" }
  | { kind: "Type" }
  | { kind: "Data1" }
  | { kind: "DataN"; n: number };

export const DEFAULT_HASH_TYPE: ScriptHashType = { kind: "Data" };

/**
 * Encodes a `ScriptHashType` into the single byte used in molecule
 * serialization. Matches the Rust behavior exactly:
 *
 * - `Data`   -> 0
 * - `Type`   -> 1
 * - `Data1`  -> 2
 * - `DataN`  -> `n << 1`, rejected when `n > 127` with the Rust message.
 */
export function hashTypeToByte(ht: ScriptHashType): number {
  switch (ht.kind) {
    case "Data":
      return 0;
    case "Type":
      return 1;
    case "Data1":
      return 2;
    case "DataN": {
      if (!Number.isInteger(ht.n) || ht.n < 0) {
        throw new Error(`Error parsing n: ${ht.n}`);
      }
      if (ht.n > 127) {
        throw new Error(`It is not possible to build data version ${ht.n}!`);
      }
      return ht.n << 1;
    }
  }
}

/** Custom 1-byte codec so molecule tables accept our `ScriptHashType`. */
const HashTypeByteCodec = mol.Codec.from({
  byteLength: 1,
  encode: (ht: ScriptHashType) => bytesFrom([hashTypeToByte(ht)]),
  decode: (buf: BytesLike) => {
    const b = bytesFrom(buf)[0]!;
    if (!b) return undefined as unknown as ScriptHashType;
    throw new Error(`hashType decode is not supported in Phase 1 (byte=${b})`);
  },
});

/**
 * Molecule table codec for `Script`, identical in layout to CCC's own `Script`
 * codec but parameterized over our `ScriptHashType` so `DataN` works.
 *
 * Layout: `table { codeHash: Byte32, hashType: byte, args: Bytes }`.
 */
export const ScriptCodec = mol.table({
  codeHash: mol.Byte32,
  hashType: HashTypeByteCodec,
  args: mol.Bytes,
});

export interface ScriptLike {
  codeHash: BytesLike;
  hashType: ScriptHashType;
  args: BytesLike;
}

/**
 * Serializes a Script to molecule bytes. The Rust code formats this with
 * `format!("0x{:x}", script.as_bytes())` — lowercase hex, `0x`-prefixed.
 */
export function serializeScriptBytes(script: ScriptLike): Bytes {
  return ScriptCodec.encode(script);
}

export function serializeScriptHex(script: ScriptLike): Hex {
  return hexFrom(serializeScriptBytes(script));
}

/**
 * Parses a 32-byte hex code hash into raw bytes, mirroring the Rust error
 * message (`Error parsing code hash: <reason>`).
 */
export function parseCodeHash(input: string): Bytes {
  const stripped =
    input.startsWith("0x") || input.startsWith("0X") ? input.slice(2) : input;
  if (stripped.length !== 64) {
    throw new Error(`Error parsing code hash: Invalid length (expected 32 bytes)`);
  }
  try {
    return decodeHex(`0x${stripped}`);
  } catch (e) {
    throw new Error(`Error parsing code hash: ${(e as Error).message}`, { cause: e });
  }
}
