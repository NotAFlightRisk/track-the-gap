<script lang="ts">
  import { page } from '$app/state';
  import { LINES } from '$lib/config/lines';
</script>

<svelte:head>
  <title>{page.status} · Track the Gap</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="shell">
  <h1>{page.status === 404 ? 'No such line' : 'That did not work'}</h1>
  <p>{page.error?.message ?? 'Something went wrong reading the live data.'}</p>
  <ul>
    {#each LINES as line (line.id)}
      <li><a href="/{line.slug}">{line.name} line</a></li>
    {/each}
  </ul>
</div>

<style>
  ul {
    columns: 2;
    max-width: 32rem;
    margin-block-start: var(--space-5);
    padding-inline-start: var(--space-5);
  }
</style>
