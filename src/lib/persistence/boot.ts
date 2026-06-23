import { graph } from "$lib/store/graph.svelte";
import { rpc, DEFAULT_RPC_URL } from "$lib/store/rpc.svelte";
import { session } from "$lib/store/session.svelte";
import { banner } from "$lib/store/banner.svelte";
import { createSeedGraph } from "$lib/nodes";
import {
  fromWorkflowJson,
  parseWorkflowJson,
  toWorkflowJson,
  type WorkflowJson,
} from "./schema";
import { decodeWorkflowText } from "./codec";
import { isFileProtocol, readEmbeddedState, readLocalStorage } from "./storage";
import { startPersistenceMirror } from "./mirror.svelte";

/**
 * Boot sequence (PLAN §7.6).
 *
 * Web URLs (`https://`):
 *   1. `?data=` query param → decode → seed
 *   2. `?gist=` query param → fetch from GitHub gist → seed
 *   3. localStorage → seed
 *   4. default seed
 *
 * `file://`:
 *   1. `#alchemist-state` (populated by prior Save HTML) → seed
 *   2. default seed
 *
 * Query params on `file://` are unreliable and ignored.
 */
export interface BootResult {
  source: "url" | "gist" | "embedded" | "localStorage" | "seed";
  workflow: WorkflowJson;
}

/** Extracts a gist ID from a bare ID or full gist URL. */
function extractGistId(raw: string): string {
  const m = raw.match(/([a-f0-9]{7,})/i);
  return m ? m[1]! : raw;
}

/** Fetches workflow JSON from a GitHub gist by ID. */
async function fetchGist(gistId: string): Promise<WorkflowJson> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`);
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }
  const data = (await res.json()) as { files: Record<string, { content: string }> };
  const files = Object.values(data.files);
  if (files.length === 0) throw new Error("Gist has no files");
  return parseWorkflowJson(files[0]!.content);
}

export async function boot(): Promise<BootResult> {
  let workflow: WorkflowJson | null = null;
  let source: BootResult["source"] = "seed";

  if (isFileProtocol()) {
    const embedded = readEmbeddedState();
    if (embedded) {
      workflow = safeParse(embedded, "saved HTML");
      if (workflow) source = "embedded";
    }
  } else {
    const params = new URLSearchParams(location.search);
    const dataParam = params.get("data");
    const gistParam = params.get("gist");

    // 1. ?data= (synchronous)
    if (dataParam) {
      try {
        workflow = decodeWorkflowText(dataParam);
        source = "url";
      } catch (e) {
        banner.show(
          `Failed to load workflow from URL: ${(e as Error).message}. Loaded from fallback instead.`,
        );
      }
      history.replaceState(null, "", location.pathname);
    }

    // 2. ?gist= (async fetch)
    if (!workflow && gistParam) {
      const gistId = extractGistId(gistParam);
      try {
        workflow = await fetchGist(gistId);
        source = "gist";
      } catch (e) {
        banner.show(
          `Failed to load workflow from gist: ${(e as Error).message}. Loaded from fallback instead.`,
        );
      }
      history.replaceState(null, "", location.pathname);
    }

    // 3. localStorage
    if (!workflow) {
      const ls = readLocalStorage();
      if (ls) {
        workflow = safeParse(ls, "browser storage");
        if (workflow) source = "localStorage";
      }
    }
  }

  if (!workflow) {
    const seed = createSeedGraph();
    workflow = toWorkflowJson(seed.nodes, seed.edges, DEFAULT_RPC_URL);
    source = "seed";
  }

  // Load into stores.
  const { nodes, edges, rpcUrl } = fromWorkflowJson(workflow);
  graph.loadGraph(nodes, edges);
  rpc.setUrl(rpcUrl);

  // Capture clean snapshot BEFORE starting the mirror effect.
  session.markClean(JSON.stringify(toWorkflowJson(graph.nodes, graph.edges, rpc.url)));
  session.markBooted();

  startPersistenceMirror();
  installBeforeUnloadGuard();

  return { source, workflow };
}

function safeParse(text: string, sourceLabel: string): WorkflowJson | null {
  try {
    return parseWorkflowJson(text);
  } catch (e) {
    banner.show(
      `Failed to load workflow from ${sourceLabel}: ${(e as Error).message}. Loaded default seed instead.`,
    );
    return null;
  }
}

function installBeforeUnloadGuard(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeunload", (event: BeforeUnloadEvent) => {
    if (session.shouldWarnOnUnload) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}
