import { graph } from "$lib/store/graph.svelte";
import { rpc } from "$lib/store/rpc.svelte";
import { session } from "$lib/store/session.svelte";
import { toWorkflowJson } from "./schema";
import { isWebProtocol, writeEmbeddedState, writeLocalStorage } from "./storage";

const DEBOUNCE_MS = 300;

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrite = false;

/** Serializes the live `$state` to a JSON string (deep read → tracked). */
function snapshot(): string {
  return JSON.stringify(toWorkflowJson(graph.nodes, graph.edges, rpc.url));
}

function writeNow(): void {
  const text = snapshot();
  writeEmbeddedState(text);
  if (isWebProtocol() && !session.sessionOnly) writeLocalStorage(text);
  pendingWrite = false;
}

function scheduleWrite(): void {
  pendingWrite = true;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeNow();
    writeTimer = null;
  }, DEBOUNCE_MS);
}

/**
 * Starts the one-way mirror: `$state` → `#alchemist-state` (debounced), with
 * a parallel `localStorage` write on web URLs. Also drives dirty-state
 * tracking by comparing each snapshot to the boot snapshot.
 *
 * Must be called AFTER `boot()` has seeded the graph and captured the clean
 * snapshot. The effect ignores runs that happen before `session.booted`.
 */
export function startPersistenceMirror(): void {
  $effect.root(() => {
    $effect(() => {
      // Deep read of all reactive state so the effect tracks every mutation.
      const current = snapshot();
      if (!session.booted) return;
      session.setDirty(current !== session.cleanSnapshot);
      scheduleWrite();
    });
  });
}

/**
 * Flushes any pending mirror write synchronously. Called by Save HTML so the
 * captured snapshot always reflects the latest `$state` regardless of
 * debounce timing. Implements the mirror-flush mechanism from PLAN §7.2.
 */
export function flushPersistenceMirror(): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (pendingWrite) writeNow();
}
