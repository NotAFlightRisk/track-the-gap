<script lang="ts">
  type Theme = 'auto' | 'light' | 'dark';

  const ORDER: Theme[] = ['auto', 'light', 'dark'];
  const LABEL: Record<Theme, string> = { auto: 'Match system', light: 'Light', dark: 'Dark' };

  let theme = $state<Theme>('auto');

  $effect(() => {
    theme = (localStorage.getItem('theme') as Theme) ?? 'auto';
  });

  function cycle() {
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    localStorage.setItem('theme', theme);
    document.documentElement.dataset.theme = theme;
  }
</script>

<button type="button" onclick={cycle} title="Change theme">
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="5.5" fill="none" stroke="currentcolor" stroke-width="1.6" />
    <path d="M10 4.5v11" stroke="currentcolor" stroke-width="1.6" />
    <path d="M10 4.5a5.5 5.5 0 0 1 0 11z" fill="currentcolor" />
  </svg>
  <span class="visually-hidden">Theme: {LABEL[theme]}</span>
  <span aria-hidden="true">{LABEL[theme]}</span>
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border: 1px solid color-mix(in oklab, currentcolor 35%, transparent);
    border-radius: var(--radius-pill);
    background: none;
    color: inherit;
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;

    &:hover {
      background: color-mix(in oklab, currentcolor 12%, transparent);
    }
  }
</style>
