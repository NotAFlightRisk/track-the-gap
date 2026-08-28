<script lang="ts">
  import { STATUS_META } from '$lib/config/health';
  import { eta, headway } from '$lib/format';
  import type { DirectionView, SegmentView } from '$lib/types';

  interface Props {
    direction: DirectionView;
    colour: string;
    selected: string | null;
    onselect: (key: string) => void;
  }

  const { direction, colour, selected, onselect }: Props = $props();

  const PX_PER_MIN = 26;
  const ROW_HEIGHT = 124;
  const TOP = 54;
  const SIDE = 28;

  const width = $derived(direction.span * PX_PER_MIN + SIDE * 2);
  const height = $derived(TOP + direction.rows * ROW_HEIGHT);
  const at = (x: number) => SIDE + x * PX_PER_MIN;
  const lane = (row: number) => TOP + row * ROW_HEIGHT;

  const ticks = $derived(
    Array.from({ length: Math.floor(direction.span / 10) + 1 }, (_, i) => i * 10)
  );

  const describe = (segment: SegmentView) =>
    `${segment.fromName} to ${segment.toName}. ${STATUS_META[segment.headway.status].label}. ` +
    (segment.headway.observed === null
      ? 'No headway measured.'
      : `Trains every ${headway(segment.headway.observed)}, timetable ${headway(segment.headway.expected)}.`);

  function activate(event: KeyboardEvent, key: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onselect(key);
  }
</script>

<div class="frame">
  <svg
    viewBox="0 0 {width} {height}"
    style:width="{width}px"
    style:--line={colour}
    role="group"
    aria-label="Gap map, {direction.label}"
  >
    <g class="ruler" aria-hidden="true">
      {#each ticks as minute (minute)}
        <line x1={at(minute)} y1="30" x2={at(minute)} y2={height - 40} />
        <text x={at(minute)} y="20">{minute} min</text>
      {/each}
    </g>

    {#each direction.segments as segment (segment.key)}
      <g
        class="segment"
        class:selected={selected === segment.key}
        data-status={segment.headway.status}
        role="button"
        tabindex="0"
        aria-label={describe(segment)}
        onclick={() => onselect(segment.key)}
        onkeydown={(event) => activate(event, segment.key)}
        onmouseenter={() => onselect(segment.key)}
        onfocus={() => onselect(segment.key)}
      >
        <line
          class="hit"
          x1={at(segment.x1)}
          y1={lane(segment.row1)}
          x2={at(segment.x2)}
          y2={lane(segment.row2)}
        />
        <line
          class="track"
          x1={at(segment.x1)}
          y1={lane(segment.row1)}
          x2={at(segment.x2)}
          y2={lane(segment.row2)}
        />
        {#if segment.headway.status === 'gap' || segment.headway.status === 'severe'}
          <line
            class="hatch"
            x1={at(segment.x1)}
            y1={lane(segment.row1)}
            x2={at(segment.x2)}
            y2={lane(segment.row2)}
          />
        {/if}
      </g>
    {/each}

    <g class="stations" aria-hidden="true">
      {#each direction.stations as station (station.id)}
        <line
          class:interchange={station.interchange.length > 0}
          x1={at(station.x)}
          y1={lane(station.row) - 9}
          x2={at(station.x)}
          y2={lane(station.row) + 9}
        />
        <text
          x={at(station.x) - 7}
          y={lane(station.row) + 16}
          transform="rotate(-45, {at(station.x) - 7}, {lane(station.row) + 16})"
        >
          {station.name}
        </text>
      {/each}
    </g>

    <g class="trains">
      {#each direction.trains as train (train.id)}
        <g class="train" style:--x="{at(train.x)}px" style:--y="{lane(train.row)}px">
          <circle r="6.5" />
          <title>{train.towards} · {eta(train.eta)} to {train.nextName}</title>
        </g>
      {/each}
    </g>
  </svg>
</div>

<style>
  .frame {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding-block-end: var(--space-2);
    background: var(--surface);
  }

  svg {
    display: block;
    height: auto;
  }

  .ruler {
    line {
      stroke: var(--rule);
      stroke-width: 1;
      stroke-dasharray: 2 6;
    }

    text {
      fill: var(--text-faint);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      text-anchor: middle;
    }
  }

  .segment {
    cursor: pointer;

    .hit {
      stroke: transparent;
      stroke-width: 22;
      stroke-linecap: round;
    }

    .track {
      stroke: var(--status);
      stroke-width: 7;
      stroke-linecap: round;
    }

    .hatch {
      stroke: var(--surface);
      stroke-width: 7;
      stroke-linecap: butt;
      stroke-dasharray: 2 5;
    }

    &:hover .track,
    &.selected .track {
      stroke-width: 11;
    }

    &.selected .track {
      stroke: var(--text);
    }

    &:focus-visible {
      outline: none;
    }

    &:focus-visible .track {
      stroke-width: 11;
      stroke: var(--brand-bright);
    }
  }

  .stations {
    line {
      stroke: var(--text);
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0.55;
    }

    .interchange {
      stroke-width: 3.5;
      opacity: 1;
    }

    text {
      fill: var(--text-muted);
      font-size: 10.5px;
      text-anchor: end;
    }
  }

  .train {
    translate: var(--x) var(--y);
    transition: translate var(--swap) var(--ease);

    circle {
      fill: var(--line);
      stroke: var(--surface);
      stroke-width: 2.5;
    }
  }
</style>
