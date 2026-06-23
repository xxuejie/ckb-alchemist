import type { Hex } from "@ckb-ccc/core";

/**
 * Edge types carried on connections between nodes.
 * Phase 1 set, per PLAN.md §5.
 */
export type EdgeType = "Bytes" | "Script" | "Hash" | "Number";

/**
 * Subtyping lattice. `Hash` and `Script` are subtypes of `Bytes` (hashes and
 * serialized scripts can flow into any Bytes consumer). `Number` is
 * incomparable with the byte-family types.
 */
export function isAssignable(source: EdgeType, target: EdgeType): boolean {
  if (source === target) return true;
  if (target === "Bytes" && (source === "Hash" || source === "Script")) return true;
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
 * For multi-input handles, takes the first value.
 * Returns `undefined` for Number values or absent inputs.
 */
export function asHex(v: Value | Value[] | undefined): Hex | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) v = v[0];
  if (!v) return undefined;
  if (v.type === "Number") return undefined;
  return v.hex;
}

/** Extracts all hex payloads from a multi-input handle. */
export function multiAsHex(v: Value | Value[] | undefined): Hex[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .filter((item): item is Extract<Value, { hex: string }> => item.type !== "Number")
    .map((item) => item.hex);
}

/** Constructs a typed Value from a hex string and a declared edge type. */
export function valueOf(hex: Hex, type: EdgeType): Value {
  if (type === "Number") {
    const n = Number(hex);
    return { type: "Number", value: n };
  }
  return { type, hex };
}
