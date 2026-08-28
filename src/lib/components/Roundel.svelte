<script lang="ts">
  interface Props {
    size?: number;
    label?: string;
  }

  const { size = 32, label }: Props = $props();
</script>

<svg
  class="roundel"
  width={size}
  height={(size / 40) * 33}
  viewBox="0 0 40 33"
  role={label ? 'img' : 'presentation'}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <circle cx="20" cy="16.5" r="13" fill="none" stroke="currentcolor" stroke-width="6" />
  <rect x="0" y="13" width="40" height="7" fill="var(--roundel-bar, currentcolor)" />
</svg>

<style>
  .roundel {
    display: block;
  }
</style>
