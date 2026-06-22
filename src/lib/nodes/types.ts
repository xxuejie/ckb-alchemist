import type { Hex } from "@ckb-ccc/core";

/**
 * Edge types carried on connections between nodes.
 * Phase 1 set, per PLAN.md §5.
 */
export type EdgeType = "Bytes" | "Script" | "Hash" | "Number";

/**
 * Subtyping lattice. `Hash` is a subtype of `Bytes` (32-byte hashes can flow
 * into any Bytes consumer). `Script` is structurally bytes but semantically
 * distinct — it does NOT widen to Bytes to avoid accidental misuse.
 * `Number` is incomparable with the byte-family types.
 */
export function isAssignable(source: EdgeType, target: EdgeType): boolean {
  if (source === target) return true;
  if (target === "Bytes" && source === "Hash") return true;
  return false;
}

/**
 * Runtime value carried along an edge or produced by a node's `evaluate`.
 */
export type Value =
  | { type: "Bytes"; hex: Hex }
  | { type: "Script"; hex: Hex }
  | { type: "Hash"; hex: Hex }
  | { type: "Number"; value: number };

/**
 * Extracts the hex payload from any byte-family value.
 * Returns `undefined` for Number values or absent inputs.
 */
export function asHex(v: Value | undefined): Hex | undefined {
  if (!v) return undefined;
  if (v.type === "Number") return undefined;
  return v.hex;
}

/** Constructs a typed Value from a hex string and a declared edge type. */
export function valueOf(hex: Hex, type: EdgeType): Value {
  if (type === "Number") {
    const n = Number(hex);
    return { type: "Number", value: n };
  }
  return { type, hex };
}
