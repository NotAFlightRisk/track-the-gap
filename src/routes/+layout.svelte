<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import Footer from '$lib/components/Footer.svelte';
  import Header from '$lib/components/Header.svelte';
  import { loadPlausible } from '$lib/plausible';

  const { data, children } = $props();

  onMount(() => loadPlausible());
</script>

<a class="skip" href="#main">Skip to the service board</a>
<Header />
<main id="main" tabindex="-1">
  {@render children()}
</main>
<Footer generated={data.generated} />

<style>
  main {
    display: block;
    padding-block: var(--space-6);
  }

  main:focus {
    outline: none;
  }
</style>
