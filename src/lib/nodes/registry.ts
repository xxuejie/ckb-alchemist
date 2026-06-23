import type { NodeSpec } from "./spec";
import { HexInputSpec } from "./specs/hex-input";
import { ScriptAssemblerSpec } from "./specs/script-assembler";
import { CkbHashSpec } from "./specs/ckb-hash";
import { ConcatSpec } from "./specs/concat";
import { SliceSpec } from "./specs/slice";
import { CellSpec } from "./specs/cell";
import { OutPointSpec } from "./specs/out-point";
import { TransactionSpec } from "./specs/transaction";
import { RpcSpec } from "./specs/rpc";
import { HeaderSpec } from "./specs/header";
import { AddressSpec } from "./specs/address";
import { ToUint64Spec, FromUint64Spec } from "./specs/uint64";
import { StringToHexSpec, HexToStringSpec, ReverseBytesSpec } from "./specs/conversion";
import { NumberInputSpec, ConditionalSpec } from "./specs/utility";
import { WitnessArgsSpec, CellDepSpec } from "./specs/ckb-structs";
import { NoteSpec } from "./specs/note";
import { SinceSpec } from "./specs/since";
import { KnownScriptSpec } from "./specs/known-script";
import { DaoCalculatorSpec } from "./specs/dao-calculator";

const SPECS: NodeSpec[] = [
  HexInputSpec,
  NumberInputSpec,
  StringToHexSpec,
  HexToStringSpec,
  ToUint64Spec,
  FromUint64Spec,
  AddressSpec,
  ReverseBytesSpec,
  ConcatSpec,
  SliceSpec,
  ConditionalSpec,
  ScriptAssemblerSpec,
  CkbHashSpec,
  CellSpec,
  HeaderSpec,
  WitnessArgsSpec,
  CellDepSpec,
  SinceSpec,
  KnownScriptSpec,
  DaoCalculatorSpec,
  OutPointSpec,
  TransactionSpec,
  RpcSpec,
  NoteSpec,
];

const BY_TYPE: Record<string, NodeSpec> = Object.fromEntries(
  SPECS.map((s) => [s.type, s]),
);

export function getNodeSpec(type: string): NodeSpec | undefined {
  return BY_TYPE[type];
}

export function requireNodeSpec(type: string): NodeSpec {
  const spec = BY_TYPE[type];
  if (!spec) throw new Error(`Unknown node type: ${type}`);
  return spec;
}

export function listNodeSpecs(): NodeSpec[] {
  return SPECS;
}

/** Returns specs grouped by category, preserving insertion order. */
export function specsByCategory(): { category: string; specs: NodeSpec[] }[] {
  const order: string[] = [];
  const map = new Map<string, NodeSpec[]>();
  for (const spec of SPECS) {
    const cat = spec.category;
    if (!map.has(cat)) {
      map.set(cat, []);
      order.push(cat);
    }
    map.get(cat)!.push(spec);
  }
  return order.map((category) => ({ category, specs: map.get(category)! }));
}
