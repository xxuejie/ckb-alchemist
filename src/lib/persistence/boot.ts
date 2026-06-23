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
 *   2. localStorage → seed
 *   3. default seed
 *
 * `file://`:
 *   1. `#alchemist-state` (populated by prior Save HTML) → seed
 *   2. default seed
 *
 * Query params on `file://` are unreliable and ignored.
 */
export interface BootResult {
  source: "url" | "embedded" | "localStorage" | "seed";
  workflow: WorkflowJson;
}

export function boot(): BootResult {
  let workflow: WorkflowJson | null = null;
  let source: BootResult["source"] = "seed";

  if (isFileProtocol()) {
    const embedded = readEmbeddedState();
    if (embedded) {
      workflow = safeParse(embedded, "saved HTML");
      if (workflow) source = "embedded";
    }
  } else {
    // Check ?data= query param first (shareable URL)
    const params = new URLSearchParams(location.search);
    const dataParam = params.get("data");
    if (dataParam) {
      try {
        workflow = decodeWorkflowText(dataParam);
        source = "url";
      } catch (e) {
        banner.show(
          `Failed to load workflow from URL: ${(e as Error).message}. Loaded from fallback instead.`,
        );
      }
      // Strip the query param so refresh doesn't re-trigger
      history.replaceState(null, "", location.pathname);
    }

    // Fall back to localStorage
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

  // Capture clean snapshot BEFORE starting the mirror effect so the first
  // effect run doesn't flag the boot state as dirty.
  session.markClean(JSON.stringify(toWorkflowJson(graph.nodes, graph.edges, rpc.url)));
  session.markBooted();

  // Start the live mirror now that boot state is captured.
  startPersistenceMirror();

  // beforeunload dirty-state protection (file:// + session-only).
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
