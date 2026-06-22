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
    background: #1a1d24;
    border: 1px solid #2a2e37;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }
  .al-text-panel h3 {
    font-size: 11px;
    text-transform: uppercase;
    color: #6a6e77;
    margin: 8px 0 4px;
    letter-spacing: 0.05em;
  }
  .al-text-panel h3:first-child {
    margin-top: 0;
  }
  .al-text-panel textarea {
    width: 100%;
    background: #0f1115;
    border: 1px solid #2a2e37;
    border-radius: 4px;
    color: #e6e6e6;
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
    background: #2a2e37;
    border: 1px solid #3a3e47;
    border-radius: 4px;
    color: #e6e6e6;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .al-btn:hover {
    background: #3a3e47;
  }
  .al-btn--sm {
    padding: 2px 8px;
    font-size: 11px;
  }
</style>
