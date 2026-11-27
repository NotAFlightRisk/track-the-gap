<script lang="ts">
  import { ago, clock } from '#lib/format.js';
  import type { Meta } from '#lib/types.js';

  const { meta, offline }: { meta: Meta; offline: boolean } = $props();

  let now = $state(Date.now());

  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });

  const age = $derived(now - meta.fetchedAt);
  const late = $derived(offline || meta.stale || age > meta.pollSeconds * 4000);
</script>

<p class="freshness" class:late>
  <span class="dot" aria-hidden="true"></span>
  {#if offline}
    Data is from {clock(meta.fetchedAt)}, check your connection
  {:else if late}
    Data is from {clock(meta.fetchedAt)} and TfL is not answering
  {:else}
    Updated {ago(age)}, {clock(meta.fetchedAt)}
  {/if}
</p>
<span class="visually-hidden" role="status">
  {#if offline}
    Can't reach the live feed, check your connection.
  {:else if late}
    Live updates have stalled.
  {:else}
    Live updates are running.
  {/if}
</span>

<style>
  .freshness {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    color: inherit;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--normal);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--normal) 25%, transparent);
  }

  .late .dot {
    background: var(--degraded);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--degraded) 25%, transparent);
  }
</style>
