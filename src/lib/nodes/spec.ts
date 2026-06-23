import type { EdgeType, Value } from "./types";

/** Result of evaluating a node. */
export type EvalResult =
  | { ok: true; value: Value; info?: string }
  | { ok: false; error: string };

/** Inputs passed to `evaluate`, keyed by input handle id. Multi-input handles
 * carry `Value[]`; single-input handles carry `Value | undefined`. */
export type EvalInputs = Record<string, Value | Value[] | undefined>;

/** Params passed to `evaluate`, keyed by param field key. */
export type EvalParams = Record<string, unknown>;

/** A form field rendered inside a node's body. */
export type ParamField =
  | {
      kind: "text";
      key: string;
      label: string;
      multiline?: boolean;
      placeholder?: string;
      mono?: boolean;
    }
  | { kind: "number"; key: string; label: string; placeholder?: string }
  | {
      kind: "select";
      key: string;
      label: string;
      options: Array<{ value: string; label: string }>;
    }
  | { kind: "hashType"; key: string; label: string };

export interface InputHandle {
  id: string;
  label: string;
  type: EdgeType;
  optional?: boolean;
  /** When true, this handle accepts multiple edges. The evaluate function
   * receives all incoming values as `Value[]` instead of a single `Value`. */
  multiple?: boolean;
}

export interface OutputHandle {
  id: string;
  label: string;
  type: EdgeType;
}

/**
 * Declarative description of a node type. The graph engine and UI render from
 * this; `evaluate` is the only behavior and is pure.
 */
export interface NodeSpec {
  /** Unique type identifier, e.g. `"script-assembler"`. */
  type: string;
  /** Human-readable label, shown in the palette and node header. */
  label: string;
  /** Short description for the palette tooltip. */
  description: string;
  /** Palette category for grouping. */
  category: string;
  inputs: InputHandle[];
  /** Output handle. Omitted for display-only nodes (e.g. Note). */
  output?: OutputHandle;
  params: ParamField[];
  defaultParams: EvalParams;
  evaluate: (inputs: EvalInputs, params: EvalParams) => EvalResult;
}
