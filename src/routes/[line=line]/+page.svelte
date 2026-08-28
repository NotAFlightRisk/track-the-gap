<script lang="ts">
  import { page } from '$app/state';
  import Freshness from '$lib/components/Freshness.svelte';
  import Legend from '$lib/components/Legend.svelte';
  import LineMap from '$lib/components/LineMap.svelte';
  import OfficialStatus from '$lib/components/OfficialStatus.svelte';
  import SegmentPanel from '$lib/components/SegmentPanel.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { headway, ratio } from '$lib/format';
  import { jsonLd, lineDescription, lineTitle, SITE } from '$lib/meta';
  import { createLive } from '$lib/state/live.svelte';
  import type { LinePayload } from '$lib/types';

  const { data } = $props();

  const live = createLive<LinePayload>(() => ({
    url: `/api/lines/${data.line.slug}`,
    initial: data,
    seconds: data.meta.pollSeconds
  }));

  $effect(() => live.start());

  const line = $derived(live.data.line);
  const meta = $derived(live.data.meta);
  const description = $derived(lineDescription(line.name));

  let picked = $state<{ direction: string; key: string } | null>(null);

  const selected = $derived(
    line.directions
      .find((d) => d.direction === picked?.direction)
      ?.segments.find((s) => s.key === picked?.key) ?? null
  );

  const selectedLabel = $derived(
    line.directions.find((d) => d.direction === picked?.direction)?.label ?? ''
  );

  const worst = $derived(
    line.directions
      .flatMap((d) => d.segments.map((segment) => ({ segment, label: d.label })))
      .filter(({ segment }) => segment.headway.worst !== null)
      .sort((a, b) => (b.segment.headway.worstRatio ?? 0) - (a.segment.headway.worstRatio ?? 0))
      .slice(0, 12)
  );
</script>

<svelte:head>
  <title>{lineTitle(line.name)}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="{page.url.origin}/{line.slug}" />
  <meta property="og:title" content={lineTitle(line.name)} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{page.url.origin}/{line.slug}" />
  <meta property="og:image" content="{page.url.origin}/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  {@html `<script type="application/ld+json">${jsonLd(page.url.origin, [
    { name: SITE, path: '/' },
    { name: `${line.name} line`, path: `/${line.slug}` }
  ])}</script>`}
</svelte:head>

<article style:--line={line.colour} style:--ink={line.ink}>
  <header class="masthead">
    <div class="shell">
      <h1>{line.name} line</h1>
      <p class="lede">{line.blurb}</p>
    </div>
  </header>

  <div class="shell">
    <section class="readout">
      <div class="verdicts">
        <div>
          <h2>TfL says</h2>
          <OfficialStatus status={line.official} detail />
        </div>
        <div>
          <h2>We say</h2>
          <StatusPill status={line.status} />
          <p class="hint">
            The level reached by the unhappiest quarter of this line's {Object.values(
              line.counts
            ).reduce((a, b) => a + b, 0)} sections.
          </p>
        </div>
      </div>

      <dl class="figures numeric">
        <div>
          <dt>Headway now</dt>
          <dd>{headway(line.observed)}</dd>
        </div>
        <div>
          <dt>Timetabled</dt>
          <dd>{headway(line.expected)}</dd>
        </div>
        <div>
          <dt>Ratio</dt>
          <dd>{ratio(line.ratio)}</dd>
        </div>
        <div>
          <dt>Trains running</dt>
          <dd>{line.trains}</dd>
        </div>
      </dl>

      <Freshness {meta} />
    </section>

    {#each line.directions as direction (direction.direction)}
      <section class="direction">
        <header>
          <h2>{direction.label}</h2>
          <p>
            {direction.trains.length} trains ·
            <span class="numeric">{headway(direction.headway.observed)}</span> between them,
            timetable <span class="numeric">{headway(direction.headway.expected)}</span>
            {#if direction.worstGap}
              · largest gap
              <span class="numeric">{headway(direction.worstGap.seconds)}</span>
              at {direction.worstGap.from} → {direction.worstGap.to}
            {/if}
          </p>
        </header>

        <div class="split">
          <LineMap
            {direction}
            colour={line.colour}
            selected={picked?.direction === direction.direction ? picked.key : null}
            onselect={(key) => (picked = { direction: direction.direction, key })}
          />
          <SegmentPanel
            segment={picked?.direction === direction.direction ? selected : null}
            label={selectedLabel}
            {meta}
          />
        </div>
      </section>
    {/each}

    <section class="table">
      <h2>Where the gaps are</h2>
      <p>The twelve sections furthest from their timetabled headway right now.</p>
      <div class="scroller">
        <table>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Direction</th>
              <th scope="col">Reading</th>
              <th scope="col">Now</th>
              <th scope="col">Timetable</th>
              <th scope="col">Largest gap</th>
            </tr>
          </thead>
          <tbody>
            {#each worst as { segment, label } (label + segment.key)}
              <tr>
                <th scope="row">{segment.fromName} → {segment.toName}</th>
                <td>{label}</td>
                <td><StatusPill status={segment.headway.status} short title={false} /></td>
                <td class="numeric">{headway(segment.headway.observed)}</td>
                <td class="numeric">{headway(segment.headway.expected)}</td>
                <td class="numeric">{headway(segment.headway.worst)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="explain">
      <h2>Reading the {line.name} line</h2>
      <p>
        The map above is a time axis, not a geographic one. Distance across the page is timetabled
        running time, so two trains six minutes apart sit six minutes apart on screen, and a
        stretched gap is visible as a stretch. Branches are drawn as separate rows joined at their
        junctions.
      </p>
      <h3>Service patterns</h3>
      <ul class="patterns">
        {#each line.directions as direction (direction.direction)}
          {#each direction.patterns as pattern (pattern.id)}
            <li>{pattern.name}</li>
          {/each}
        {/each}
      </ul>
      <h3>What the readings mean</h3>
      <Legend />
    </section>
  </div>
</article>

<style>
  .masthead {
    padding-block: var(--space-6);
    border-block-end: 10px solid var(--line);
    background: var(--surface);
    margin-block-start: calc(var(--space-6) * -1);
    margin-block-end: var(--space-6);
  }

  .lede {
    margin-block-start: var(--space-3);
    max-width: 78ch;
    color: var(--text-muted);
  }

  .readout {
    display: grid;
    gap: var(--space-5);
    padding: var(--space-5);
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  .verdicts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-5);

    h2 {
      margin-block-end: var(--space-2);
      font-family: var(--font-text);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
  }

  .hint {
    margin-block: var(--space-2) 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .figures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--space-4);
    margin: 0;
    padding-block-start: var(--space-4);
    border-block-start: 1px solid var(--rule);

    dt {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    dd {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1.1;
    }
  }

  .direction {
    margin-block-start: var(--space-7);

    header p {
      margin-block: var(--space-2) var(--space-4);
      color: var(--text-muted);
    }
  }

  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 21rem;
    gap: var(--space-4);
    align-items: start;
  }

  .table {
    margin-block-start: var(--space-7);

    p {
      margin-block: var(--space-2) var(--space-4);
      color: var(--text-muted);
    }
  }

  .scroller {
    overflow-x: auto;
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;

    th,
    td {
      padding: var(--space-3) var(--space-4);
      text-align: left;
      white-space: nowrap;
    }

    thead th {
      border-block-end: 2px solid var(--rule-strong);
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    tbody tr + tr th,
    tbody tr + tr td {
      border-block-start: 1px solid var(--rule);
    }
  }

  .explain {
    margin-block-start: var(--space-7);
    max-width: 80ch;

    h3 {
      margin-block: var(--space-6) var(--space-3);
    }
  }

  .patterns {
    margin: 0;
    padding-inline-start: var(--space-5);
    color: var(--text-muted);
  }

  @media (max-width: 980px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
