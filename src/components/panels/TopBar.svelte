<script lang="ts">
  import { graph } from "$lib/store/graph.svelte";
  import { rpc } from "$lib/store/rpc.svelte";
  import { session, ui } from "$lib/store";
  import { saveHtml } from "$lib/persistence";
  import { encodeWorkflowText } from "$lib/persistence";

  let rpcInput = $state(rpc.url);

  function onRpcChange() {
    rpc.setUrl(rpcInput);
  }

  function doSaveHtml() {
    saveHtml();
  }

  function doExportText() {
    ui.openTextPanel(encodeWorkflowText(graph.nodes, graph.edges, rpc.url));
  }

  function onResetSeed() {
    if (
      session.dirty &&
      !confirm("Discard current graph and reset to the default seed?")
    ) {
      return;
    }
    graph.resetToSeed();
  }
</script>

<header class="al-topbar">
  <div class="al-topbar__brand">
    <span class="al-topbar__logo">⚗</span>
    <span class="al-topbar__name">CKB Alchemist</span>
  </div>

  <div class="al-topbar__rpc">
    <label for="rpc-url">RPC</label>
    <input
      id="rpc-url"
      type="url"
      bind:value={rpcInput}
      onchange={onRpcChange}
      placeholder="https://testnet.ckbapp.dev/"
      spellcheck="false"
    />
    {#if rpc.error}
      <span class="al-topbar__rpc-error" title={rpc.error}>⚠</span>
    {/if}
  </div>

  <div class="al-topbar__actions">
    <button
      class="al-btn"
      onclick={doSaveHtml}
      title="Save as a self-contained HTML file"
    >
      💾 Save HTML
    </button>
    <button
      class="al-btn"
      onclick={doExportText}
      title="Export workflow as URL-encoded text"
    >
      📤 Export Text
    </button>
    <button class="al-btn" onclick={onResetSeed} title="Reset to default seed graph">
      ♻ Reset
    </button>
  </div>

  {#if session.dirty}
    <span class="al-topbar__dirty" title="Unsaved changes">●</span>
  {/if}
  {#if session.sessionOnly}
    <span class="al-topbar__session" title="This session won't persist to localStorage">
      session-only
    </span>
  {/if}
</header>

<style>
  .al-topbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 12px;
    background: #1a1d24;
    border-bottom: 1px solid #2a2e37;
    height: 44px;
    flex-shrink: 0;
    z-index: 100;
  }
  .al-topbar__brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    white-space: nowrap;
  }
  .al-topbar__logo {
    font-size: 18px;
  }
  .al-topbar__rpc {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    max-width: 420px;
  }
  .al-topbar__rpc label {
    font-size: 11px;
    color: #6a6e77;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .al-topbar__rpc input {
    flex: 1;
    background: #0f1115;
    border: 1px solid #2a2e37;
    border-radius: 4px;
    color: #e6e6e6;
    padding: 3px 8px;
    font-size: 12px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .al-topbar__rpc input:focus {
    outline: none;
    border-color: #7c5cff;
  }
  .al-topbar__rpc-error {
    color: #d29922;
  }
  .al-topbar__actions {
    display: flex;
    gap: 6px;
  }
  .al-topbar__dirty {
    color: #d29922;
    font-size: 14px;
  }
  .al-topbar__session {
    font-size: 10px;
    color: #d29922;
    background: rgba(210, 153, 34, 0.1);
    border: 1px solid #d29922;
    border-radius: 3px;
    padding: 1px 6px;
    text-transform: uppercase;
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
</style>
