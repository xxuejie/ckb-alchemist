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

const SPECS: NodeSpec[] = [
  HexInputSpec,
  ScriptAssemblerSpec,
  CkbHashSpec,
  ConcatSpec,
  SliceSpec,
  CellSpec,
  OutPointSpec,
  TransactionSpec,
  HeaderSpec,
  RpcSpec,
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
