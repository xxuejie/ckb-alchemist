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
    background: rgba(163, 113, 95, 0.95);
    border: 1px solid #a3715f;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
  .al-banner__text {
    flex: 1;
  }
  .al-banner__close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
  }
  .al-banner__close:hover {
    color: #fff;
  }
</style>
