<script lang="ts">
  import type { HealthStatus } from '$lib/config/health';

  interface Props {
    status: HealthStatus;
    size?: number;
  }

  const { status, size = 24 }: Props = $props();

  // Where the bars sit on a 24-unit rule: the spacing is the message.
  const BARS: Record<HealthStatus, number[]> = {
    normal: [3, 12, 21],
    degraded: [3, 9, 21],
    gap: [3, 21],
    bunching: [15, 19, 22],
    severe: [2, 5, 15, 22],
    'no-data': []
  };

  const bars = $derived(BARS[status]);
</script>

<svg
  class="mark"
  width={size}
  height={size / 2}
  viewBox="0 0 24 12"
  fill="none"
  aria-hidden="true"
  focusable="false"
>
  {#if bars.length}
    {#each bars as x (x)}
      <line x1={x} y1="1.5" x2={x} y2="10.5" />
    {/each}
  {:else}
    <line x1="1.5" y1="6" x2="22.5" y2="6" stroke-dasharray="2 3" />
  {/if}
</svg>

<style>
  .mark {
    display: block;
    stroke: currentcolor;
    stroke-width: 2.25;
    stroke-linecap: round;
  }
</style>
