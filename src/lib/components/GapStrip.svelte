<script lang="ts">
  interface Props {
    spark: { x: number; row: number }[];
    rows: number;
    colour: string;
    label: string;
  }

  const { spark, rows, colour, label }: Props = $props();
  const lanes = $derived(Array.from({ length: Math.max(1, rows) }, (_, row) => row));
</script>

<div class="strip" style:--line={colour} role="img" aria-label={label}>
  {#each lanes as lane (lane)}
    <div class="lane">
      {#each spark.filter((train) => train.row === lane) as train, i (`${lane}-${i}`)}
        <span class="train" style:left="{Math.min(100, Math.max(0, train.x * 100))}%"></span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .strip {
    display: grid;
    gap: 6px;
    min-width: 120px;
  }

  .lane {
    position: relative;
    height: 9px;
    border-block-start: 2px solid color-mix(in oklab, var(--line) 40%, transparent);
  }

  .train {
    position: absolute;
    inset-block-start: -4px;
    width: 8px;
    height: 8px;
    margin-inline-start: -4px;
    border-radius: 50%;
    background: var(--line);
    box-shadow: 0 0 0 1.5px var(--surface);
    transition: left var(--swap) var(--ease);
  }
</style>
