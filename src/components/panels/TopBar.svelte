<script lang="ts">
  import { graph } from "$lib/store/graph.svelte";
  import { rpc } from "$lib/store/rpc.svelte";
  import { session, ui, theme } from "$lib/store";
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

  async function doShare() {
    const encoded = encodeWorkflowText(graph.nodes, graph.edges, rpc.url);
    const url = `${location.origin}${location.pathname}?data=${encoded}`;
    ui.openSharePanel(url);
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
      onclick={() => ui.togglePalette()}
      title="Show/hide widget palette"
    >
      {ui.showPalette ? "⊟" : "⊞"}
    </button>
    <button
      class="al-btn"
      onclick={() => graph.undo()}
      disabled={!graph.canUndo}
      title="Undo (Ctrl+Z)">↶</button
    >
    <button
      class="al-btn"
      onclick={() => graph.redo()}
      disabled={!graph.canRedo}
      title="Redo (Ctrl+Shift+Z)">↷</button
    >
    <button class="al-btn" onclick={() => graph.autoLayout()} title="Auto-layout"
      >⇲</button
    >
    <button class="al-btn" onclick={() => theme.toggle()} title="Toggle dark/light theme">
      {theme.current === "dark" ? "☀" : "🌙"}
    </button>
    <button
      class="al-btn"
      onclick={doSaveHtml}
      title="Save as a self-contained HTML file"
    >
      💾 Save HTML
    </button>
    <button class="al-btn" onclick={doShare} title="Generate shareable URL">
      🔗 Share
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
    background: var(--c-panel);
    border-bottom: 1px solid var(--c-border);
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
    color: var(--c-text-mute);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .al-topbar__rpc input {
    flex: 1;
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-text);
    padding: 3px 8px;
    font-size: 12px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .al-topbar__rpc input:focus {
    outline: none;
    border-color: var(--c-accent);
  }
  .al-topbar__rpc-error {
    color: var(--c-warn);
  }
  .al-topbar__actions {
    display: flex;
    gap: 6px;
  }
  .al-topbar__dirty {
    color: var(--c-warn);
    font-size: 14px;
  }
  .al-topbar__session {
    font-size: 10px;
    color: var(--c-warn);
    background: color-mix(in srgb, var(--c-warn) 10%, transparent);
    border: 1px solid var(--c-warn);
    border-radius: 3px;
    padding: 1px 6px;
    text-transform: uppercase;
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
  .al-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
