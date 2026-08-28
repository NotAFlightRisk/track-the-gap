<script lang="ts">
  import type { OfficialStatus } from '$lib/types';

  const { status, detail = false }: { status: OfficialStatus; detail?: boolean } = $props();

  // TfL grades severity 0-20, worst first. Ten is a good service.
  const tone = $derived(status.severity >= 10 ? 'good' : status.severity >= 6 ? 'minor' : 'major');
</script>

<div class="official">
  <span class="tag" data-tone={tone}>
    <span class="visually-hidden">TfL says</span>
    {status.description}
  </span>
  {#if detail && status.reason}
    <p>{status.reason}</p>
  {/if}
</div>

<style>
  .tag {
    display: inline-block;
    padding: 0.2em var(--space-3);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;

    &[data-tone='good'] {
      background: color-mix(in oklab, var(--normal) 14%, var(--surface));
      color: var(--normal);
    }

    &[data-tone='minor'] {
      background: color-mix(in oklab, var(--degraded) 16%, var(--surface));
      color: var(--degraded);
    }

    &[data-tone='major'] {
      background: color-mix(in oklab, var(--gap) 14%, var(--surface));
      color: var(--gap);
    }
  }

  p {
    margin: var(--space-2) 0 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
