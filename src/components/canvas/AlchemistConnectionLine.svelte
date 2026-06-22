<script lang="ts">
  import { useConnection, getBezierPath, Position } from "@xyflow/svelte";

  const conn = useConnection();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const geometry = $derived.by(() => {
    const c = conn.current as any;
    if (!c?.inProgress) return null;
    return getBezierPath({
      sourceX: c.from?.x ?? 0,
      sourceY: c.from?.y ?? 0,
      sourcePosition: c.fromPosition ?? Position.Right,
      targetX: c.to?.x ?? 0,
      targetY: c.to?.y ?? 0,
      targetPosition: c.toPosition ?? Position.Left,
    });
  });

  const isInvalid = $derived.by(() => {
    const c = conn.current as any;
    return c?.inProgress === true && c.isValid === false;
  });

  const mid = $derived.by(() => {
    const c = conn.current as any;
    if (!c?.inProgress) return { x: 0, y: 0 };
    return {
      x: ((c.from?.x ?? 0) + (c.to?.x ?? 0)) / 2,
      y: ((c.from?.y ?? 0) + (c.to?.y ?? 0)) / 2 - 12,
    };
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
</script>

{#if geometry}
  <path
    d={geometry[0]}
    fill="none"
    stroke={isInvalid ? "#a3715f" : "#7c5cff"}
    stroke-width={2}
    stroke-dasharray={isInvalid ? "6 4" : undefined}
    class="svelte-flow__connection-path"
  />
  {#if isInvalid}
    <g transform="translate({mid.x}, {mid.y})">
      <rect
        x={-52}
        y={-10}
        width={104}
        height={18}
        rx={4}
        fill="#1a1d24"
        stroke="#a3715f"
        stroke-width={1}
      />
      <text
        x={0}
        y={3}
        text-anchor="middle"
        fill="#a3715f"
        font-size={10}
        font-family="ui-sans-serif, system-ui, sans-serif"
      >
        type mismatch
      </text>
    </g>
  {/if}
{/if}
