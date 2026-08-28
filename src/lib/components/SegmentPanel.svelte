<script lang="ts">
  import { STATUS_META } from '$lib/config/health';
  import { lineById } from '$lib/config/lines';
  import { clock, eta, headway, ratio } from '$lib/format';
  import type { Meta, SegmentView } from '$lib/types';
  import StatusPill from './StatusPill.svelte';

  interface Props {
    segment: SegmentView | null;
    label: string;
    meta: Meta;
    id: string;
  }

  const { segment, label, meta, id }: Props = $props();
  const widest = $derived(Math.max(...(segment?.headway.gaps ?? [1]), 1));
</script>

<aside class="panel" {id} aria-label="Section detail">
  {#if !segment}
    <h3>Pick a section</h3>
    <p class="empty">
      Hover, tap or tab onto any section of the map to see its headways, the trains on it and how
      that compares with the timetable.
    </p>
  {:else}
    <h3>{segment.fromName} → {segment.toName}</h3>
    <p class="where">{label} · {Math.round(segment.runTime / 60)} min run</p>

    <StatusPill status={segment.headway.status} />
    <p class="hint">{STATUS_META[segment.headway.status].hint}</p>

    <dl class="numeric">
      <div>
        <dt>Headway now</dt>
        <dd>{headway(segment.headway.observed)}</dd>
      </div>
      <div>
        <dt>Timetabled</dt>
        <dd>{headway(segment.headway.expected)}</dd>
      </div>
      <div>
        <dt>Ratio</dt>
        <dd>{ratio(segment.headway.ratio)}</dd>
      </div>
      <div>
        <dt>Largest gap</dt>
        <dd>{headway(segment.headway.worst)}</dd>
      </div>
    </dl>

    {#if segment.headway.gaps.length}
      <h4>Gaps between the next trains</h4>
      <ul class="comb">
        {#each segment.headway.gaps as gap, i (i)}
          <li>
            <span class="bar" style:inline-size="{(gap / widest) * 100}%"></span>
            <span class="numeric">{headway(gap)}</span>
          </li>
        {/each}
      </ul>
    {/if}

    {#if segment.corridor}
      <h4>Shared with {segment.corridor.lines.map((id) => lineById(id)?.name ?? id).join(', ')}</h4>
      <p class="hint">
        Anything usable on this corridor arrives every
        <strong class="numeric">{headway(segment.corridor.headway.observed)}</strong>, against
        <strong class="numeric">{headway(segment.headway.observed)}</strong> on this line alone.
      </p>
    {/if}

    {#if segment.calls.length}
      <h4>Next trains</h4>
      <ol class="calls">
        {#each segment.calls as call, i (i)}
          <li>
            <span class="towards">{call.towards}</span>
            <span class="numeric">{eta(Math.max(0, call.eta))}</span>
          </li>
        {/each}
      </ol>
    {/if}

    <h4>Service patterns</h4>
    <ul class="patterns">
      {#each segment.patterns as pattern (pattern)}
        <li>{pattern}</li>
      {/each}
    </ul>

    <p class="stamp">Predictions read at {clock(meta.fetchedAt)}</p>
  {/if}
</aside>

<style>
  .panel {
    padding: var(--space-5);
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    background: var(--surface);
    font-size: 0.875rem;
  }

  h3 {
    margin-block-end: var(--space-1);
  }

  h4 {
    margin-block: var(--space-5) var(--space-2);
    font-family: var(--font-text);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .where,
  .hint,
  .stamp {
    color: var(--text-muted);
  }

  .where {
    margin-block-end: var(--space-4);
  }

  .hint {
    margin-block: var(--space-3) 0;
  }

  .empty {
    margin-block-start: var(--space-3);
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    margin-block: var(--space-5) 0;

    dt {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    dd {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 600;
      line-height: 1.2;
    }
  }

  .comb {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: var(--space-3);
    }

    .bar {
      display: block;
      block-size: 10px;
      border-radius: var(--radius-sm);
      background: var(--brand-bright);
      min-inline-size: 4px;
    }
  }

  .calls,
  .patterns {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .calls li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-2);
    border-block-end: 1px solid var(--rule);
  }

  .patterns li {
    padding-block: 2px;
    color: var(--text-muted);
  }

  .stamp {
    margin-block: var(--space-5) 0;
    font-size: 0.75rem;
  }
</style>
