<script lang="ts">
  import { session } from "$lib/store/session.svelte";
  import type { BootSource } from "$lib/store/session.svelte";

  function load(source: BootSource, sessionOnly = false) {
    session.chooseSource(source, sessionOnly);
  }

  function download(source: BootSource) {
    const json = JSON.stringify(source.workflow, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ckb-alchemist-${source.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function describe(source: BootSource): string {
    const wf = source.workflow;
    const nodeCount = wf.nodes?.length ?? 0;
    const edgeCount = wf.edges?.length ?? 0;
    return `${nodeCount} node(s), ${edgeCount} edge(s)`;
  }

  /** Session-only only makes sense for URL sources, not localStorage/embedded. */
  function canSessionOnly(source: BootSource): boolean {
    return source.id === "data" || source.id === "gist";
  }
</script>

<div class="al-boot-overlay">
  <div class="al-boot-dialog">
    <h2>Choose a workflow to load</h2>
    <p class="al-boot-dialog__hint">
      Multiple workflows were found. Choose one to load — download any you want to keep
      first.
    </p>

    <div class="al-boot-dialog__list">
      {#each session.pendingSources ?? [] as source (source.id)}
        <div class="al-boot-dialog__source">
          <div class="al-boot-dialog__source-info">
            <span class="al-boot-dialog__source-label">{source.label}</span>
            <span class="al-boot-dialog__source-desc">{describe(source)}</span>
          </div>
          <div class="al-boot-dialog__source-actions">
            <button
              class="al-boot-dialog__download"
              onclick={() => download(source)}
              title="Download as JSON file"
            >
              📥
            </button>
            <button class="al-boot-dialog__load" onclick={() => load(source)}>
              Load
            </button>
            {#if canSessionOnly(source)}
              <button
                class="al-boot-dialog__session-only"
                onclick={() => load(source, true)}
                title="Load without overwriting your saved work in this browser"
              >
                Session-only
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="al-boot-dialog__footer">
      <p>
        <strong>Load</strong> replaces your current browser storage after loading.
        <strong>Session-only</strong> loads the workflow without touching your saved work —
        useful for previewing shared links.
      </p>
    </div>
  </div>
</div>

<style>
  .al-boot-overlay {
    position: fixed;
    inset: 0;
    background: var(--c-bg);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .al-boot-dialog {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 560px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  .al-boot-dialog h2 {
    margin: 0 0 8px;
    font-size: 16px;
  }
  .al-boot-dialog__hint {
    font-size: 12px;
    color: var(--c-text-mute);
    margin: 0 0 16px;
  }
  .al-boot-dialog__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .al-boot-dialog__source {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--c-input-bg);
    border: 1px solid var(--c-border);
    border-radius: 8px;
  }
  .al-boot-dialog__source-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .al-boot-dialog__source-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--c-text);
  }
  .al-boot-dialog__source-desc {
    font-size: 11px;
    color: var(--c-text-mute);
  }
  .al-boot-dialog__source-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .al-boot-dialog__download {
    background: none;
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-text-dim);
    padding: 4px 8px;
    font-size: 14px;
    cursor: pointer;
  }
  .al-boot-dialog__download:hover {
    border-color: var(--c-accent);
    color: var(--c-text);
  }
  .al-boot-dialog__load {
    background: var(--c-accent);
    border: 1px solid var(--c-accent);
    border-radius: 4px;
    color: #fff;
    padding: 4px 16px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .al-boot-dialog__load:hover {
    opacity: 0.85;
  }
  .al-boot-dialog__session-only {
    background: none;
    border: 1px solid var(--c-warn);
    border-radius: 4px;
    color: var(--c-warn);
    padding: 3px 10px;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
  }
  .al-boot-dialog__session-only:hover {
    background: color-mix(in srgb, var(--c-warn) 15%, transparent);
  }
  .al-boot-dialog__footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--c-border);
    font-size: 11px;
    color: var(--c-text-mute);
    line-height: 1.5;
  }
  .al-boot-dialog__footer strong {
    color: var(--c-text-dim);
  }
</style>
