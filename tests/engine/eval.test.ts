import { describe, it, expect } from "vitest";
import { evaluateGraph, makeConnectionValidator, wouldCreateCycle } from "$lib/engine";
import { createSeedGraph } from "$lib/nodes";
import { makeNode, makeEdge, type AlchemistNode, type AlchemistEdge } from "$lib/engine";
import { ckbHash } from "$lib/ckb";
import type { Connection, Node } from "@xyflow/svelte";

describe("evaluateGraph: seed", () => {
  it("produces a valid Hash from the seed pipeline", () => {
    const { nodes, edges } = createSeedGraph();
    const { results, cycled } = evaluateGraph(nodes, edges);

    expect(cycled.size).toBe(0);

    const scriptResult = results.get("seed-script");
    expect(scriptResult?.ok).toBe(true);
    if (scriptResult?.ok && scriptResult.value.type !== "Number") {
      expect(scriptResult.value.type).toBe("Script");
      expect(scriptResult.value.hex.startsWith("0x")).toBe(true);
    }

    const hashResult = results.get("seed-hash");
    expect(hashResult?.ok).toBe(true);
    if (hashResult?.ok && hashResult.value.type !== "Number") {
      expect(hashResult.value.type).toBe("Hash");
      // 32-byte hash = 64 hex chars + 0x
      expect(hashResult.value.hex.length).toBe(66);
    }
  });
});

describe("evaluateGraph: error propagation", () => {
  it("marks a node errored when its input is disconnected", () => {
    const nodes: AlchemistNode[] = [makeNode("a", "ckb-hash", { x: 0, y: 0 }, {})];
    const { results } = evaluateGraph(nodes, []);
    const r = results.get("a");
    expect(r?.ok).toBe(false);
    if (r && !r.ok) expect(r.error).toMatch(/not connected/);
  });

  it("propagates upstream errors downstream", () => {
    // Disconnected ScriptAssembler feeds CkbHash; both should error.
    const nodes: AlchemistNode[] = [
      makeNode("s", "script-assembler", { x: 0, y: 0 }, { hashType: { kind: "Data" } }),
      makeNode("h", "ckb-hash", { x: 100, y: 0 }, {}),
    ];
    const edges: AlchemistEdge[] = [makeEdge("e", "s", "h", "out", "content")];
    const { results } = evaluateGraph(nodes, edges);
    expect(results.get("s")?.ok).toBe(false);
    expect(results.get("h")?.ok).toBe(false);
  });

  it("reports a clear error for invalid hex in HexInput", () => {
    const nodes: AlchemistNode[] = [
      makeNode("h", "hex-input", { x: 0, y: 0 }, { hex: "0xnope" }),
    ];
    const { results } = evaluateGraph(nodes, []);
    const r = results.get("h");
    expect(r?.ok).toBe(false);
    if (r && !r.ok) expect(r.error).toMatch(/hex content/);
  });
});

describe("evaluateGraph: cycles", () => {
  it("detects a 2-node cycle and marks both nodes errored", () => {
    // Impossible with Phase 1 node types (no cycles possible via types), so
    // simulate by forcing edges that bypass type checks.
    const nodes: AlchemistNode[] = [
      makeNode("a", "concat", { x: 0, y: 0 }, {}),
      makeNode("b", "concat", { x: 100, y: 0 }, {}),
    ];
    const edges: AlchemistEdge[] = [
      makeEdge("e1", "a", "b", "out", "a"),
      makeEdge("e2", "b", "a", "out", "b"),
    ];
    const { cycled, results } = evaluateGraph(nodes, edges);
    expect(cycled.has("a")).toBe(true);
    expect(cycled.has("b")).toBe(true);
    expect(results.get("a")?.ok).toBe(false);
    expect(results.get("b")?.ok).toBe(false);
  });
});

describe("connection validator", () => {
  const nodes: Node[] = [
    { id: "h", type: "hex-input", position: { x: 0, y: 0 }, data: {} },
    { id: "s", type: "script-assembler", position: { x: 0, y: 0 }, data: {} },
    { id: "hash", type: "ckb-hash", position: { x: 0, y: 0 }, data: {} },
  ];
  const validate = makeConnectionValidator(nodes);

  it("accepts Hash -> Hash (exact)", () => {
    const c: Connection = {
      source: "hash",
      target: "s",
      sourceHandle: "out",
      targetHandle: "code_hash",
    };
    expect(validate(c)).toBe(true);
  });

  it("accepts Bytes -> Bytes", () => {
    const c: Connection = {
      source: "h",
      target: "s",
      sourceHandle: "out",
      targetHandle: "args",
    };
    expect(validate(c)).toBe(true);
  });

  it("accepts Hash -> Bytes (subtype widening)", () => {
    const c: Connection = {
      source: "hash",
      target: "s",
      sourceHandle: "out",
      targetHandle: "args",
    };
    expect(validate(c)).toBe(true);
  });

  it("accepts Bytes -> Hash (cross-type, runtime-validated)", () => {
    const c: Connection = {
      source: "h",
      target: "s",
      sourceHandle: "out",
      targetHandle: "code_hash",
    };
    expect(validate(c)).toBe(true);
  });

  it("rejects self-connections", () => {
    const c: Connection = {
      source: "s",
      target: "s",
      sourceHandle: "out",
      targetHandle: "code_hash",
    };
    expect(validate(c)).toBe(false);
  });

  it("rejects unknown handles", () => {
    const c: Connection = {
      source: "h",
      target: "s",
      sourceHandle: "bogus",
      targetHandle: "args",
    };
    expect(validate(c)).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  it("detects back-edge", () => {
    const edges = [{ source: "a", target: "b" }];
    expect(wouldCreateCycle(edges, "b", "a")).toBe(true);
  });
  it("allows forward-edge", () => {
    const edges = [{ source: "a", target: "b" }];
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
  });
});

describe("cross-check: CkbHash of empty bytes matches domain helper", () => {
  it("produces the same digest as ckbHash('')", () => {
    const nodes: AlchemistNode[] = [
      makeNode("h", "hex-input", { x: 0, y: 0 }, { hex: "0x" }),
      makeNode("hash", "ckb-hash", { x: 100, y: 0 }, {}),
    ];
    const edges: AlchemistEdge[] = [makeEdge("e", "h", "hash", "out", "content")];
    const { results } = evaluateGraph(nodes, edges);
    const r = results.get("hash");
    expect(r?.ok).toBe(true);
    if (r?.ok && r.value.type === "Hash") {
      expect(r.value.hex).toBe(ckbHash("0x"));
    }
  });
});
