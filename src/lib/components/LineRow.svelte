<script lang="ts">
  import { headway, spoken } from '$lib/format';
  import type { LineSummary } from '$lib/types';
  import GapStrip from './GapStrip.svelte';
  import OfficialStatus from './OfficialStatus.svelte';
  import StatusPill from './StatusPill.svelte';

  const { line }: { line: LineSummary } = $props();

  const strip = $derived(
    `Train spacing on the ${line.name} line: ${line.trains} running, ${spoken(line.observed, line.expected)}`
  );
</script>

<article class="row" style:--line={line.colour} style:--ink={line.ink}>
  <h3 class="name">
    <a href="/{line.slug}">
      <span class="badge">{line.name}</span><span class="visually-hidden"> line</span>
    </a>
  </h3>

  <div class="official">
    <OfficialStatus status={line.official} />
  </div>

  <div class="health">
    <StatusPill status={line.status} />
  </div>

  <dl class="figures numeric">
    <div>
      <dt>Now</dt>
      <dd>{headway(line.observed)}</dd>
    </div>
    <div>
      <dt>Timetable</dt>
      <dd class="muted">{headway(line.expected)}</dd>
    </div>
    <div>
      <dt>Worst gap</dt>
      <dd>
        {headway(line.worstGap?.seconds ?? null)}
        {#if line.worstGap}
          <small>{line.worstGap.from} → {line.worstGap.to}<br />{line.worstGap.towards}</small>
        {/if}
      </dd>
    </div>
  </dl>

  <div class="strip">
    <GapStrip spark={line.spark} rows={line.sparkRows} colour={line.colour} label={strip} />
  </div>
</article>

<style>
  .row {
    position: relative;
    display: grid;
    grid-template-columns: minmax(9rem, 1.1fr) minmax(8rem, 1fr) auto minmax(14rem, 1.2fr) minmax(
        7rem,
        1fr
      );
    align-items: center;
    gap: var(--space-3) var(--space-5);
    padding: var(--space-4);
    border-block-end: 1px solid var(--rule);
    background: var(--surface);

    &:hover {
      background: color-mix(in oklab, var(--line) 6%, var(--surface));
    }
  }

  .name {
    font-size: 1.5rem;

    .badge {
      display: inline-block;
      padding: 0.15em 0.6em;
      background: var(--line);
      color: var(--ink);
      white-space: nowrap;
    }

    a {
      color: var(--text);
      text-decoration: none;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
      }

      &:hover .badge {
        outline: 2px solid var(--text);
        outline-offset: 2px;
      }
    }
  }

  .figures {
    display: flex;
    gap: var(--space-5);
    margin: 0;

    dt {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    dd {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
    }

    .muted {
      color: var(--text-muted);
      font-weight: 500;
    }

    small {
      display: block;
      font-size: 0.7rem;
      font-weight: 400;
      color: var(--text-muted);
      max-width: 16ch;
      line-height: 1.3;
    }
  }

  @media (max-width: 1100px) {
    .row {
      grid-template-columns: 1fr auto;
      row-gap: var(--space-3);
    }

    .figures {
      grid-column: 1 / -1;
      flex-wrap: wrap;
    }

    .strip {
      grid-column: 1 / -1;
    }
  }
</style>
