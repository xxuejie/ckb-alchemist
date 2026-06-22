<script lang="ts">
  import { graph } from "$lib/store/graph.svelte";
  import { rpc, ui } from "$lib/store";
  import { decodeWorkflowText, fromWorkflowJson } from "$lib/persistence";

  function doImportText() {
    try {
      const wf = decodeWorkflowText(ui.textImport);
      const { nodes, edges, rpcUrl } = fromWorkflowJson(wf);
      graph.loadGraph(nodes, edges);
      rpc.setUrl(rpcUrl);
      ui.closeTextPanel();
    } catch (e) {
      alert(`Failed to load workflow: ${(e as Error).message}`);
    }
  }

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(ui.textExport);
    } catch {
      // clipboard may be unavailable on file:// — user can select manually
    }
  }
</script>

<div class="al-text-panel">
  <h3>Export</h3>
  <textarea readonly rows="3" value={ui.textExport}></textarea>
  <button class="al-btn al-btn--sm" onclick={copyExport}>📋 Copy</button>

  <h3>Import</h3>
  <textarea
    rows="3"
    value={ui.textImport}
    oninput={(e) => ui.setTextImport(e.currentTarget.value)}
    placeholder="Paste a workflow string (gzip+base64url or raw JSON)…"
  ></textarea>
  <div class="al-text-panel__actions">
    <button class="al-btn al-btn--sm" onclick={doImportText}>Load</button>
    <button class="al-btn al-btn--sm" onclick={() => ui.closeTextPanel()}>Close</button>
  </div>
</div>

<style>
  .al-text-panel {
    width: 380px;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 16px var(--c-shadow);
  }
  .al-text-panel h3 {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--c-text-mute);
    margin: 8px 0 4px;
    letter-spacing: 0.05em;
  }
  .al-text-panel h3:first-child {
    margin-top: 0;
  }
  .al-text-panel textarea {
    width: 100%;
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-text);
    padding: 6px;
    font-size: 11px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    margin-bottom: 6px;
    resize: vertical;
    word-break: break-all;
  }
  .al-text-panel__actions {
    display: flex;
    gap: 6px;
  }
  .al-btn {
    background: var(--c-border);
    border: 1px solid var(--c-border-strong);
    border-radius: 4px;
    color: var(--c-text);
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .al-btn:hover {
    background: var(--c-border-strong);
  }
  .al-btn--sm {
    padding: 2px 8px;
    font-size: 11px;
  }
</style>
