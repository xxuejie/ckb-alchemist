import { graph } from "$lib/store/graph.svelte";
import { rpc, DEFAULT_RPC_URL } from "$lib/store/rpc.svelte";
import { session, type BootSource } from "$lib/store/session.svelte";
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
 * Collects all available workflow sources. If 2+ exist, shows a selection
 * dialog so the user can choose (and download any source before overwriting).
 * Otherwise loads the single source or the default seed.
 */
export async function boot(): Promise<void> {
  const sources = await collectSources();

  let chosen: WorkflowJson;

  if (sources.length >= 2) {
    session.setPendingSources(sources);
    const picked = await session.waitForSourceChoice();
    chosen = picked.workflow;
    stripQueryParams();
  } else if (sources.length === 1) {
    chosen = sources[0]!.workflow;
    stripQueryParams();
  } else {
    const seed = createSeedGraph();
    chosen = toWorkflowJson(seed.nodes, seed.edges, DEFAULT_RPC_URL);
  }

  // Load into stores
  const { nodes, edges, rpcUrl } = fromWorkflowJson(chosen);
  graph.loadGraph(nodes, edges);
  rpc.setUrl(rpcUrl);

  session.markClean(JSON.stringify(toWorkflowJson(graph.nodes, graph.edges, rpc.url)));
  session.markBooted();
  startPersistenceMirror();
  installBeforeUnloadGuard();
}

/** Collect all available workflow sources. */
async function collectSources(): Promise<BootSource[]> {
  const sources: BootSource[] = [];

  if (isFileProtocol()) {
    // file:// — only embedded state matters
    const embedded = readEmbeddedState();
    if (embedded) {
      try {
        sources.push({
          id: "embedded",
          label: "Saved HTML",
          workflow: parseWorkflowJson(embedded),
        });
      } catch {
        // corrupt — skip
      }
    }
    return sources;
  }

  // Web URLs — check all 4 sources
  const params = new URLSearchParams(location.search);

  // 1. ?data=
  const dataParam = params.get("data");
  if (dataParam) {
    try {
      sources.push({
        id: "data",
        label: "Shared Link (?data=)",
        workflow: decodeWorkflowText(dataParam),
      });
    } catch (e) {
      banner.show(`Could not parse ?data=: ${(e as Error).message}`);
    }
  }

  // 2. ?gist=
  const gistParam = params.get("gist");
  if (gistParam) {
    try {
      const wf = await fetchGist(extractGistId(gistParam));
      sources.push({ id: "gist", label: "GitHub Gist (?gist=)", workflow: wf });
    } catch (e) {
      banner.show(`Could not fetch ?gist=: ${(e as Error).message}`);
    }
  }

  // 3. localStorage
  const ls = readLocalStorage();
  if (ls) {
    try {
      sources.push({
        id: "localStorage",
        label: "Saved Work (Browser)",
        workflow: parseWorkflowJson(ls),
      });
    } catch {
      // corrupt — skip
    }
  }

  // 4. Embedded HTML state
  const embedded = readEmbeddedState();
  if (embedded) {
    try {
      sources.push({
        id: "embedded",
        label: "Embedded in HTML",
        workflow: parseWorkflowJson(embedded),
      });
    } catch {
      // corrupt — skip
    }
  }

  return sources;
}

function extractGistId(raw: string): string {
  const m = raw.match(/([a-f0-9]{7,})/i);
  return m ? m[1]! : raw;
}

async function fetchGist(gistId: string): Promise<WorkflowJson> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`);
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const data = (await res.json()) as { files: Record<string, { content: string }> };
  const files = Object.values(data.files);
  if (files.length === 0) throw new Error("Gist has no files");
  return parseWorkflowJson(files[0]!.content);
}

function stripQueryParams(): void {
  if (!isFileProtocol() && location.search) {
    history.replaceState(null, "", location.pathname);
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
