<script lang="ts">
  import { HEALTH_STATUSES, STATUS_META } from '$lib/config/health';
  import StatusMark from './StatusMark.svelte';
</script>

<dl class="legend">
  {#each HEALTH_STATUSES as status (status)}
    <div data-status={status}>
      <dt><StatusMark {status} /> {STATUS_META[status].label}</dt>
      <dd>{STATUS_META[status].hint}</dd>
    </div>
  {/each}
</dl>

<style>
  .legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--space-4);
    margin: 0;
  }

  div {
    padding-block-start: var(--space-3);
    border-block-start: 3px solid var(--status);
  }

  dt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--status);
    font-weight: 600;
  }

  dd {
    margin: var(--space-1) 0 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
