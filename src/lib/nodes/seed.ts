import { HexInputSpec } from "./specs/hex-input";
import { ScriptAssemblerSpec } from "./specs/script-assembler";
import { CkbHashSpec } from "./specs/ckb-hash";
import { DEFAULT_HASH_TYPE_PARAM } from "./specs/script-assembler";
import type { AlchemistEdge, AlchemistNode } from "$lib/engine";

/**
 * Default canvas seed — a richer version of the Rust `RootApp::default`.
 *
 * The plan calls for "a `ScriptAssembler` whose `Script` output feeds a
 * `CkbHash` input." To make that pipeline actually evaluate on first load
 * (rather than showing "input not connected"), we add two `HexInput` nodes
 * feeding `code_hash` (32 zero bytes) and `args` (empty). This demonstrates
 * the script-hash pipeline end-to-end.
 */
export function createSeedGraph(): { nodes: AlchemistNode[]; edges: AlchemistEdge[] } {
  const nodes: AlchemistNode[] = [
    {
      id: "seed-code-hash",
      type: HexInputSpec.type,
      position: { x: 0, y: 0 },
      data: { params: { hex: "0x" + "00".repeat(32) } },
      width: 280,
      style: "width: 280px",
    },
    {
      id: "seed-args",
      type: HexInputSpec.type,
      position: { x: 0, y: 220 },
      data: { params: { hex: "0x" } },
      width: 280,
      style: "width: 280px",
    },
    {
      id: "seed-script",
      type: ScriptAssemblerSpec.type,
      position: { x: 380, y: 100 },
      data: { params: { hashType: { ...DEFAULT_HASH_TYPE_PARAM } } },
      width: 280,
      style: "width: 280px",
    },
    {
      id: "seed-hash",
      type: CkbHashSpec.type,
      position: { x: 760, y: 100 },
      data: { params: {} },
      width: 280,
      style: "width: 280px",
    },
  ];

  const edges: AlchemistEdge[] = [
    {
      id: "seed-e1",
      source: "seed-code-hash",
      target: "seed-script",
      sourceHandle: "out",
      targetHandle: "code_hash",
      type: "alchemist",
    },
    {
      id: "seed-e2",
      source: "seed-args",
      target: "seed-script",
      sourceHandle: "out",
      targetHandle: "args",
      type: "alchemist",
    },
    {
      id: "seed-e3",
      source: "seed-script",
      target: "seed-hash",
      sourceHandle: "out",
      targetHandle: "content",
      type: "alchemist",
    },
  ];

  return { nodes, edges };
}
