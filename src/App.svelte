<script lang="ts">
  import Canvas from "$components/canvas/Canvas.svelte";
  import TopBar from "$components/panels/TopBar.svelte";
  import ErrorBanner from "$components/panels/ErrorBanner.svelte";
  import SharePanel from "$components/panels/SharePanel.svelte";
  import BootDialog from "$components/panels/BootDialog.svelte";
  import { boot } from "$lib/persistence";
  import { session } from "$lib/store/session.svelte";

  let booted = $state(false);

  $effect(() => {
    if (booted) return;
    booted = true;
    boot().catch((e) => console.error("Boot failed:", e));
  });
</script>

{#if session.pendingSources}
  <BootDialog />
{:else}
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
{/if}

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
    color: var(--c-text-mute);
  }
</style>
