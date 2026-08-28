<script lang="ts">
  import { HEALTH_STATUSES, STATUS_META } from '$lib/config/health';
  import type { Meta, StatusCounts } from '$lib/types';
  import Freshness from './Freshness.svelte';
  import StatusMark from './StatusMark.svelte';

  interface Props {
    counts: StatusCounts;
    trains: number;
    meta: Meta;
  }

  const { counts, trains, meta }: Props = $props();
  const judged = $derived(HEALTH_STATUSES.filter((status) => status !== 'no-data'));
  const total = $derived(judged.reduce((sum, status) => sum + counts[status], 0));
</script>

<section class="summary">
  <p class="lead">
    <strong class="numeric">{trains}</strong> trains running ·
    <strong class="numeric">{total}</strong> sections measured
  </p>

  <ul>
    {#each judged as status (status)}
      <li data-status={status}>
        <StatusMark {status} size={22} />
        <span class="numeric count">{counts[status]}</span>
        <span class="what">{STATUS_META[status].short}</span>
      </li>
    {/each}
  </ul>

  <Freshness {meta} />
</section>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3) var(--space-5);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  .lead {
    margin: 0;
    font-size: 0.9375rem;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--status);
    font-size: 0.875rem;
  }

  .count {
    font-weight: 700;
  }

  .what {
    color: var(--text-muted);
  }
</style>
