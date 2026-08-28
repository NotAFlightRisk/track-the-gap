<script lang="ts">
  import { page } from '$app/state';
  import { LINES } from '$lib/config/lines';
  import Roundel from './Roundel.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
</script>

<header>
  <div class="bar shell">
    <a class="wordmark" href="/">
      <Roundel size={38} label="Track the Gap" />
      <span>
        <strong>Track the Gap</strong>
        <small>Live Underground headways</small>
      </span>
    </a>
    <ThemeToggle />
  </div>

  <nav class="rail" aria-label="Underground lines">
    <ul class="shell">
      {#each LINES as line (line.id)}
        <li>
          <a
            href="/{line.slug}"
            style:--line={line.colour}
            aria-current={page.url.pathname === `/${line.slug}` ? 'page' : undefined}
          >
            {line.name}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</header>

<style>
  header {
    background: var(--brand);
    color: var(--brand-ink);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding-block: var(--space-3);
  }

  .wordmark {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: inherit;
    text-decoration: none;

    strong {
      display: block;
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 400;
      letter-spacing: 0.01em;
    }

    small {
      display: block;
      font-size: 0.75rem;
      opacity: 0.75;
    }

    &:hover strong {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }

  .rail {
    background: color-mix(in oklab, black 18%, var(--brand));

    ul {
      display: flex;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    a {
      display: block;
      padding: var(--space-2) var(--space-3);
      border-block-end: 4px solid var(--line);
      color: var(--brand-ink);
      font-size: 0.8125rem;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        background: color-mix(in oklab, white 12%, transparent);
      }

      &[aria-current='page'] {
        background: color-mix(in oklab, white 18%, transparent);
        font-weight: 700;
      }
    }
  }
</style>
