import { describe, it, expect } from "vitest";
import {
  encodeWorkflowText,
  decodeWorkflowText,
  toWorkflowJson,
  parseWorkflowJson,
} from "$lib/persistence";
import { createSeedGraph } from "$lib/nodes";

function sampleWorkflow() {
  const { nodes, edges } = createSeedGraph();
  return toWorkflowJson(nodes, edges, "https://testnet.ckbapp.dev/");
}

describe("schema round-trip", () => {
  it("toWorkflowJson + parseWorkflowJson round-trips losslessly", () => {
    const wf = sampleWorkflow();
    const json = JSON.stringify(wf);
    const parsed = parseWorkflowJson(json);
    expect(parsed).toEqual(wf);
  });

  it("rejects unsupported version", () => {
    expect(() => parseWorkflowJson(JSON.stringify({ version: 99 }))).toThrow(
      /Unsupported workflow version/,
    );
  });

  it("rejects missing nodes/edges arrays", () => {
    expect(() => parseWorkflowJson(JSON.stringify({ version: 1 }))).toThrow(
      /nodes and edges must be arrays/,
    );
  });
});

describe("text codec round-trip", () => {
  it("encode → decode is lossless for the seed graph", () => {
    const { nodes, edges } = createSeedGraph();
    const text = encodeWorkflowText(nodes, edges, "https://testnet.ckbapp.dev/");
    const decoded = decodeWorkflowText(text);
    const expected = toWorkflowJson(nodes, edges, "https://testnet.ckbapp.dev/");
    expect(decoded).toEqual(expected);
  });

  it("decode accepts raw JSON (human-edited workflows)", () => {
    const wf = sampleWorkflow();
    const decoded = decodeWorkflowText(JSON.stringify(wf));
    expect(decoded).toEqual(wf);
  });

  it("encoded text is URL-safe (no +, /, or =)", () => {
    const text = encodeWorkflowText([], [], "https://testnet.ckbapp.dev/");
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
