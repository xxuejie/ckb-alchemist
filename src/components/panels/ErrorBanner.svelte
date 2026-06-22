<script lang="ts">
  import { banner } from "$lib/store/banner.svelte";
</script>

{#if banner.messages.length > 0}
  <div class="al-banner">
    {#each banner.messages as msg (msg.id)}
      <div class="al-banner__item">
        <span class="al-banner__text">{msg.text}</span>
        <button class="al-banner__close" onclick={() => banner.dismiss(msg.id)}>✕</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .al-banner {
    position: absolute;
    top: 48px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 600px;
    width: 90%;
  }
  .al-banner__item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: color-mix(in srgb, var(--c-err) 95%, transparent);
    border: 1px solid var(--c-err);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--c-text);
    box-shadow: 0 2px 8px var(--c-shadow);
  }
  .al-banner__text {
    flex: 1;
  }
  .al-banner__close {
    background: none;
    border: none;
    color: color-mix(in srgb, var(--c-text) 70%, transparent);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
  }
  .al-banner__close:hover {
    color: var(--c-text);
  }
</style>
