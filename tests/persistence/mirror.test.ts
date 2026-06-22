// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  writeEmbeddedState,
  readEmbeddedState,
  toWorkflowJson,
  parseWorkflowJson,
  encodeWorkflowText,
  decodeWorkflowText,
} from "$lib/persistence";
import { createSeedGraph } from "$lib/nodes";

function setupStateElement() {
  const existing = document.getElementById("alchemist-state");
  if (existing) existing.remove();
  const el = document.createElement("script");
  el.id = "alchemist-state";
  el.setAttribute("type", "application/json");
  document.head.appendChild(el);
}

beforeEach(() => {
  setupStateElement();
  localStorage.clear();
});

describe("mirror flush round-trip", () => {
  it("writeEmbeddedState + readEmbeddedState round-trips the current graph", () => {
    const { nodes, edges } = createSeedGraph();
    const wf = toWorkflowJson(nodes, edges, "https://testnet.ckbapp.dev/");

    writeEmbeddedState(JSON.stringify(wf));

    const readBack = readEmbeddedState();
    expect(readBack).not.toBeNull();
    const parsed = parseWorkflowJson(readBack!);
    expect(parsed).toEqual(wf);
  });

  it("flushed state captures modifications (no stale snapshot)", () => {
    const { nodes, edges } = createSeedGraph();
    const original = toWorkflowJson(nodes, edges, "https://testnet.ckbapp.dev/");
    writeEmbeddedState(JSON.stringify(original));

    // Simulate a user modification: change the RPC URL and re-serialize.
    const modified = { ...original, rpcUrl: "https://mainnet.example.com/" };
    writeEmbeddedState(JSON.stringify(modified));

    const readBack = parseWorkflowJson(readEmbeddedState()!);
    expect(readBack.rpcUrl).toBe("https://mainnet.example.com/");
    expect(readBack).toEqual(modified);
  });

  it("empty embedded state returns null", () => {
    expect(readEmbeddedState()).toBeNull();
  });
});

describe("text codec + embedded state interop", () => {
  it("exported text can be decoded and written to embedded state", () => {
    const { nodes, edges } = createSeedGraph();
    const text = encodeWorkflowText(nodes, edges, "https://testnet.ckbapp.dev/");
    const decoded = decodeWorkflowText(text);
    const json = JSON.stringify(decoded);
    writeEmbeddedState(json);
    const roundTrip = parseWorkflowJson(readEmbeddedState()!);
    expect(roundTrip.rpcUrl).toBe("https://testnet.ckbapp.dev/");
    expect(roundTrip.nodes).toHaveLength(4);
  });
});
