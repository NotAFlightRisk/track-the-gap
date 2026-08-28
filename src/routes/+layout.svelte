<script lang="ts">
  import '../app.css';
  import Footer from '$lib/components/Footer.svelte';
  import Header from '$lib/components/Header.svelte';

  const { data, children } = $props();
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
