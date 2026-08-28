<script lang="ts">
  import { STATUS_META, type HealthStatus } from '$lib/config/health';
  import StatusMark from './StatusMark.svelte';

  interface Props {
    status: HealthStatus;
    short?: boolean;
    title?: boolean;
  }

  const { status, short = false, title = true }: Props = $props();
  const meta = $derived(STATUS_META[status]);
</script>

<span class="pill" data-status={status} title={title ? meta.hint : undefined}>
  <StatusMark {status} size={20} />
  {short ? meta.short : meta.label}
</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.2em var(--space-3) 0.2em var(--space-2);
    border: 1px solid currentcolor;
    border-radius: var(--radius-pill);
    background: color-mix(in oklab, currentcolor 10%, var(--surface));
    color: var(--status);
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }
</style>
