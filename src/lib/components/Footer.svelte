<script lang="ts">
  import { RELATED_APPS } from '#lib/meta.js';

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
    <div class="more">
      <span id="more-apps">More from us:</span>
      <ul aria-labelledby="more-apps">
        {#each RELATED_APPS as app (app.slug)}
          <li>
            <a href={app.url}>
              <img
                src="https://portfolio.peng.ly/logos/{app.slug}.svg"
                alt=""
                width="16"
                height="16"
                loading="lazy"
              />
              {app.name}
            </a>
          </li>
        {/each}
      </ul>
    </div>
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

  .more,
  ul {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-4);
  }

  .more {
    margin-block-start: var(--space-4);

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    a {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
  }
</style>
