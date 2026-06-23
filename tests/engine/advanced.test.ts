import { describe, it, expect } from "vitest";
import { CellOutput, Script, hexFrom } from "@ckb-ccc/core";
import { evaluateGraph } from "$lib/engine";
import { makeNode, makeEdge, type AlchemistNode, type AlchemistEdge } from "$lib/engine";
import { asHex } from "$lib/nodes/types";
import { serializeScriptHex } from "$lib/ckb";

describe("Multi-input handle evaluation", () => {
  it("collects multiple edges into Value[] for multiple handles", () => {
    // Create real CellOutput molecules for the Transaction to consume
    const lock = new Script(
      ("0x" + "00".repeat(32)) as `0x${string}`,
      "type",
      "0x" as `0x${string}`,
    );
    const co1 = new CellOutput(BigInt(10000000000), lock);
    const co2 = new CellOutput(BigInt(20000000000), lock);
    const hex1 = hexFrom(co1.toBytes());
    const hex2 = hexFrom(co2.toBytes());

    const nodes: AlchemistNode[] = [
      makeNode("a", "hex-input", { x: 0, y: 0 }, { hex: hex1 }),
      makeNode("b", "hex-input", { x: 0, y: 100 }, { hex: hex2 }),
      makeNode("t", "transaction", { x: 300, y: 50 }, { headerDeps: "" }),
    ];

    const edges: AlchemistEdge[] = [
      makeEdge("e1", "a", "t", "out", "outputs"),
      makeEdge("e2", "b", "t", "out", "outputs"),
    ];

    const { results, cycled } = evaluateGraph(nodes, edges);
    expect(cycled.size).toBe(0);

    const txResult = results.get("t");
    expect(txResult?.ok).toBe(true);
    if (txResult?.ok) {
      expect(txResult.info).toContain("2 output(s)");
    }
  });
});

describe("Molecule decode mode", () => {
  it("ScriptAssembler decodes Script molecule from decode input", () => {
    const scriptHex = serializeScriptHex({
      codeHash: "0x" + "ab".repeat(32),
      hashType: { kind: "Type" },
      args: "0xdeadbeef",
    });

    const nodes: AlchemistNode[] = [
      makeNode("h", "hex-input", { x: 0, y: 0 }, { hex: scriptHex }),
      makeNode(
        "s",
        "script-assembler",
        { x: 300, y: 0 },
        {
          hashType: { kind: "Data" },
        },
      ),
    ];

    const edges: AlchemistEdge[] = [makeEdge("e", "h", "s", "out", "molecule")];

    const { results } = evaluateGraph(nodes, edges);
    const result = results.get("s");
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.info).toContain("code_hash:");
      expect(result.info).toContain("hash_type: type");
      expect(result.info).toContain("args:");
    }
  });

  it("Transaction decodes from molecule input", () => {
    // Build a transaction first, then decode it
    const nodes1: AlchemistNode[] = [
      makeNode("tx", "transaction", { x: 0, y: 0 }, { headerDeps: "" }),
    ];
    const built = evaluateGraph(nodes1, []);
    const txResult = built.results.get("tx");
    expect(txResult?.ok).toBe(true);

    if (!txResult?.ok) return;

    // Now decode the transaction molecule
    const nodes2: AlchemistNode[] = [
      makeNode(
        "h",
        "hex-input",
        { x: 0, y: 0 },
        { hex: txResult.value.type === "Number" ? "0x" : asHex(txResult.value) },
      ),
      makeNode("t", "transaction", { x: 300, y: 0 }, { headerDeps: "" }),
    ];
    const edges: AlchemistEdge[] = [makeEdge("e", "h", "t", "out", "molecule")];

    const { results } = evaluateGraph(nodes2, edges);
    const decoded = results.get("t");
    expect(decoded?.ok).toBe(true);
    if (decoded?.ok) {
      expect(decoded.info).toContain("tx hash:");
      expect(decoded.info).toContain("0 output(s)");
    }
  });
});
