<script lang="ts">
  import { ui } from "$lib/store";
  import { graph } from "$lib/store/graph.svelte";
  import { rpc } from "$lib/store/rpc.svelte";
  import { encodeWorkflowText, toWorkflowJson } from "$lib/persistence";

  const URL_LIMIT = 2000;

  const encoded = $derived(encodeWorkflowText(graph.nodes, graph.edges, rpc.url));
  const shareUrl = $derived(`${location.origin}${location.pathname}?data=${encoded}`);
  const tooLong = $derived(shareUrl.length > URL_LIMIT);

  function downloadJson() {
    const json = JSON.stringify(
      toWorkflowJson(graph.nodes, graph.edges, rpc.url),
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ckb-alchemist-workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // clipboard may be unavailable
    }
  }

  const ghCommands = `# Publish as a secret gist:
gh gist create ckb-alchemist-workflow.json --secret

# Then use this URL to share:
# ${location.origin}${location.pathname}?gist=<gist-id>`;
</script>

{#if ui.shareUrl}
  <div class="al-share-overlay">
    <div class="al-share-dialog">
      <div class="al-share-dialog__header">
        <h3>Share Workflow</h3>
        <button class="al-share-dialog__close" onclick={() => ui.closeSharePanel()}
          >✕</button
        >
      </div>

      {#if !tooLong}
        <p class="al-share-dialog__label">Shareable URL ({shareUrl.length} chars):</p>
        <input class="al-share-dialog__url" readonly value={shareUrl} />
        <button class="al-btn al-btn--sm" onclick={copyUrl}>📋 Copy URL</button>
      {:else}
        <div class="al-share-dialog__warning">
          ⚠ Workflow is too large for a URL ({shareUrl.length} chars, limit ~{URL_LIMIT}).
          Use one of the alternatives below:
        </div>

        <h4>Option 1: Download & share as gist</h4>
        <p class="al-share-dialog__text">
          Download the workflow file, publish it as a GitHub gist, then share with
          <code>?gist=&lt;gist-id&gt;</code>:
        </p>
        <button class="al-btn al-btn--sm" onclick={downloadJson}
          >📥 Download workflow.json</button
        >
        <pre class="al-share-dialog__code">{ghCommands}</pre>
      {/if}

      <div class="al-share-dialog__footer">
        <span class="al-share-dialog__hint">
          URL data is compressed (gzip+base64url). Gist loading fetches from GitHub at
          boot.
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  .al-share-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
  }
  .al-share-dialog {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 16px;
    width: 90%;
    max-width: 560px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }
  .al-share-dialog__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .al-share-dialog__header h3 {
    margin: 0;
    font-size: 14px;
  }
  .al-share-dialog__close {
    background: none;
    border: none;
    color: var(--c-text-mute);
    cursor: pointer;
    font-size: 16px;
  }
  .al-share-dialog__label {
    font-size: 11px;
    color: var(--c-text-mute);
    margin: 8px 0 4px;
  }
  .al-share-dialog__url {
    width: 100%;
    background: var(--c-input-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-text);
    padding: 6px 8px;
    font-size: 11px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    margin-bottom: 8px;
  }
  .al-share-dialog__warning {
    background: color-mix(in srgb, var(--c-warn) 15%, transparent);
    border: 1px solid var(--c-warn);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    margin-bottom: 12px;
  }
  .al-share-dialog__text {
    font-size: 12px;
    color: var(--c-text-dim);
    margin: 4px 0 8px;
  }
  .al-share-dialog h4 {
    font-size: 12px;
    margin: 12px 0 4px;
  }
  .al-share-dialog__code {
    background: var(--c-input-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    padding: 8px;
    font-size: 11px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    color: var(--c-ok);
    overflow-x: auto;
    margin: 8px 0;
    white-space: pre;
  }
  .al-share-dialog__footer {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--c-border);
  }
  .al-share-dialog__hint {
    font-size: 10px;
    color: var(--c-text-mute);
  }
  .al-btn {
    background: var(--c-border-strong);
    border: 1px solid var(--c-border-strong);
    border-radius: 4px;
    color: var(--c-text);
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .al-btn:hover {
    background: var(--c-accent);
    border-color: var(--c-accent);
  }
  .al-btn--sm {
    padding: 3px 8px;
    font-size: 11px;
  }
</style>
