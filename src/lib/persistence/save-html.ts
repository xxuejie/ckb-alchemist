import { session } from "$lib/store/session.svelte";
import { flushPersistenceMirror } from "./mirror.svelte";
import { toWorkflowJson } from "./schema";
import { graph } from "$lib/store/graph.svelte";
import { rpc } from "$lib/store/rpc.svelte";

/**
 * Save HTML mechanic (PLAN §7.2). Because `#alchemist-state` is always live,
 * the captured file carries the user's work:
 *
 * 1. Flush any pending mirror write synchronously (no stale snapshots).
 * 2. Clone the document so Svelte's live DOM is never disturbed.
 * 3. Clear the clone's `#app` innerHTML (Svelte's rendered output re-hydrates
 *    on next open).
 * 4. Capture `<!DOCTYPE html>\n` + the clone's `outerHTML`.
 * 5. Wrap in a `Blob` and trigger a download.
 * 6. Reset the dirty flag (file on disk now matches memory).
 */
export function saveHtml(): void {
  if (import.meta.env.DEV) {
    alert(
      "Save HTML is not available in dev mode — the dev server's HTML references /@vite/client and /src/main.ts, which only work when the Vite dev server is running.\n\nTo get a portable single-file build, run: pnpm build\nThen open dist/index.html.",
    );
    return;
  }

  flushPersistenceMirror();

  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const cloneApp = clone.querySelector("#app");
  if (cloneApp) cloneApp.innerHTML = "";

  const html = "<!DOCTYPE html>\n" + clone.outerHTML;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  const snapshot = JSON.stringify(toWorkflowJson(graph.nodes, graph.edges, rpc.url));
  session.markClean(snapshot);
}

function suggestFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ckb-alchemist-${date}.html`;
}
