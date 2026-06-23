<script lang="ts">
  import Canvas from "$components/canvas/Canvas.svelte";
  import TopBar from "$components/panels/TopBar.svelte";
  import ErrorBanner from "$components/panels/ErrorBanner.svelte";
  import SharePanel from "$components/panels/SharePanel.svelte";
  import { boot } from "$lib/persistence";
  import { session } from "$lib/store/session.svelte";

  let booted = $state(false);

  // Boot once on mount. Svelte 5 `$effect` would re-run; we use a one-shot.
  $effect(() => {
    if (booted) return;
    booted = true;
    boot().catch((e) => console.error("Boot failed:", e));
  });
</script>

<div class="al-app">
  <TopBar />
  <ErrorBanner />
  <SharePanel />
  {#if booted && session.booted}
    <main class="al-canvas">
      <Canvas />
    </main>
  {:else}
    <main class="al-canvas al-canvas--loading">
      <span>Loading…</span>
    </main>
  {/if}
</div>

<style>
  .al-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .al-canvas {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  .al-canvas--loading {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6a6e77;
  }
</style>
