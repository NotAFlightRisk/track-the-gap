<script lang="ts">
  const { generated }: { generated: string } = $props();

  const built = $derived(
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(Date.parse(generated))
  );
</script>

<footer>
  <div class="shell">
    <p>
      Powered by TfL Open Data. Headways, gaps and bunching are worked out here from live arrival
      predictions, and are not official TfL figures. Contains OS data © Crown copyright and database
      rights 2016 and Geomni UK Map data © and database rights 2019.
    </p>
    <p class="meta">
      Network model built {built} ·
      <a href="https://github.com/NotAFlightRisk/track-the-gap">Source on GitHub</a>
    </p>
  </div>
</footer>

<style>
  footer {
    margin-block-start: var(--space-8);
    padding-block: var(--space-5);
    border-block-start: 1px solid var(--rule);
    background: var(--surface-sunk);
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  p {
    max-width: 80ch;
  }

  .meta {
    margin: 0;
  }
</style>
