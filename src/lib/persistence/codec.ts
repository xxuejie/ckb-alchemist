import { gzip, ungzip } from "pako";
import { parseWorkflowJson, toWorkflowJson, type WorkflowJson } from "./schema";
import type { AlchemistEdge, AlchemistNode } from "$lib/engine";

/** URL-safe base64 (no padding). */
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encodes a workflow into a compact URL-safe text (gzip + base64url). */
export function encodeWorkflowText(
  nodes: AlchemistNode[],
  edges: AlchemistEdge[],
  rpcUrl: string,
): string {
  const wf = toWorkflowJson(nodes, edges, rpcUrl);
  const json = JSON.stringify(wf);
  const compressed = gzip(new TextEncoder().encode(json));
  return toBase64Url(compressed);
}

/**
 * Decodes a workflow from text. Accepts either:
 *  - The gzip+base64url format produced by `encodeWorkflowText`
 *  - Raw JSON (for human-edited workflows)
 */
export function decodeWorkflowText(text: string): WorkflowJson {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return parseWorkflowJson(trimmed);
  }
  const bytes = fromBase64Url(trimmed);
  const json = new TextDecoder().decode(ungzip(bytes));
  return parseWorkflowJson(json);
}
