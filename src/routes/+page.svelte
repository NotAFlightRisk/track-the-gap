<script lang="ts">
  import { page } from '$app/state';
  import { byUnhappiness } from '$lib/config/health';
  import Legend from '$lib/components/Legend.svelte';
  import LineRow from '$lib/components/LineRow.svelte';
  import NetworkSummary from '$lib/components/NetworkSummary.svelte';
  import { HOME_DESCRIPTION, homeTitle, jsonLd, SITE, TAGLINE } from '$lib/meta';
  import { createLive } from '$lib/state/live.svelte';
  import type { NetworkView } from '$lib/types';

  const { data } = $props();

  const live = createLive<NetworkView>(() => ({
    url: '/api/network',
    initial: data.view,
    seconds: data.view.meta.pollSeconds
  }));

  $effect(() => live.start());

  let order = $state<'health' | 'name'>('health');

  const view = $derived(live.data);
  const lines = $derived(
    [...view.lines].sort((a, b) =>
      order === 'name' ? a.name.localeCompare(b.name) : byUnhappiness(a, b)
    )
  );
</script>

<svelte:head>
  <title>{homeTitle}</title>
  <meta name="description" content={HOME_DESCRIPTION} />
  <link rel="canonical" href="{page.url.origin}/" />
  <meta property="og:title" content={homeTitle} />
  <meta property="og:description" content={HOME_DESCRIPTION} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{page.url.origin}/" />
  <meta property="og:image" content="{page.url.origin}/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  {@html `<script type="application/ld+json">${jsonLd(page.url.origin, [{ name: SITE, path: '/' }])}</script>`}
</svelte:head>

<div class="shell">
  <header class="intro">
    <h1>{TAGLINE}</h1>
    <p>
      TfL tells you whether a line is running. This tells you whether it is running
      <em>evenly</em>. Every figure below comes from live arrival predictions, turned into headways
      and compared with what the timetable expects for this section, this direction and this hour.
    </p>
  </header>

  <NetworkSummary counts={view.counts} trains={view.trains} meta={view.meta} />

  <div class="controls">
    <h2 id="board">The board</h2>
    <fieldset>
      <legend class="visually-hidden">Sort the board</legend>
      <label>
        <input type="radio" name="order" bind:group={order} value="health" />
        Worst first
      </label>
      <label>
        <input type="radio" name="order" bind:group={order} value="name" />
        A to Z
      </label>
    </fieldset>
  </div>
</div>

<section class="board" aria-labelledby="board">
  <div class="shell">
    <div class="head" aria-hidden="true">
      <span>Line</span>
      <span>TfL status</span>
      <span>Our reading</span>
      <span>Headway</span>
      <span>Train spacing</span>
    </div>
    {#each lines as line (line.id)}
      <LineRow {line} />
    {/each}
  </div>
</section>

<div class="shell">
  <section class="explain">
    <h2>How this is worked out</h2>
    <p>
      A <strong>headway</strong> is the time between one train and the next in the same direction over
      the same bit of route. It is the number that decides how long you actually wait, and it is not the
      same thing as whether a line is officially in service.
    </p>
    <p>
      For every directed section between two stations, Track the Gap takes the arrival predictions
      for the trains that will run over it, sorts them, and measures the gaps. That measured headway
      is divided by the timetabled headway for that stop, that day type and that hour, pulled from
      TfL's own published timetable. A ratio near one is an even service. A ratio of two means the
      wait has doubled.
    </p>
    <p>
      Branches are handled separately from trunks, because they are different railways. A train only
      counts towards a section's headway if its service pattern actually runs over that section, so
      a Central line train to Epping never props up the Hainault figures. Where several lines share
      the same track, the section shows both the combined corridor headway and the headway on each
      line on its own.
    </p>
    <h3>What the readings mean</h3>
    <Legend />
    <p class="caveat">
      Predictions are predictions. Where TfL does not publish a train identifier, trains are
      reconstructed from the shape of the predictions instead, and a section with only one train in
      sight cannot have a headway at all. Every reading carries the time it was taken.
    </p>
  </section>
</div>

<style>
  .intro {
    margin-block-end: var(--space-5);

    p {
      margin-block-start: var(--space-4);
      font-size: 1.0625rem;
      color: var(--text-muted);
    }
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    margin-block: var(--space-7) var(--space-3);
  }

  fieldset {
    display: flex;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 0.875rem;

    label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
    }

    input {
      accent-color: var(--brand-bright);
    }
  }

  .board {
    border-block: 1px solid var(--rule);
    background: var(--surface);
  }

  .head {
    display: grid;
    grid-template-columns: minmax(9rem, 1.1fr) minmax(8rem, 1fr) auto minmax(14rem, 1.2fr) minmax(
        7rem,
        1fr
      );
    gap: var(--space-5);
    padding: var(--space-2) var(--space-4);
    border-block-end: 2px solid var(--rule-strong);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .explain {
    margin-block-start: var(--space-7);
    max-width: 80ch;

    h3 {
      margin-block: var(--space-6) var(--space-3);
    }
  }

  .caveat {
    margin-block-start: var(--space-5);
    padding-inline-start: var(--space-4);
    border-inline-start: 1px solid var(--rule-strong);
    font-size: 0.9375rem;
    color: var(--text-muted);
  }

  @media (max-width: 1100px) {
    .head {
      display: none;
    }
  }
</style>
