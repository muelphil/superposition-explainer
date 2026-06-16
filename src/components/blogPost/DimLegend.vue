<script setup lang="ts">
/**
 * SVG dimension legend: gradient bar with two labeled circles.
 * All coordinates are relative to the translated group's (0,0) origin.
 * The gradient gradient id must be defined in the parent's <defs>.
 */
const props = defineProps<{
  barH: number
  barX: number
  circleR: number
  innerPad: number
  textX: number
  width: number
  height: number
  colorTop: string
  colorBottom: string
}>()
</script>

<template>
  <g>
    <rect
      :width="width"
      :height="height"
      fill="var(--color-bg)"
      fill-opacity="0.92"
      stroke="var(--color-border)"
      stroke-width="0.6"
      rx="4"
    />
    <rect
      :x="(barX - circleR).toFixed(1)"
      :y="(innerPad + circleR).toFixed(1)"
      :width="(circleR * 2).toFixed(1)"
      :height="barH"
      fill="url(#dim-legend-grad)"
      :rx="circleR"
    />
    <circle
      :cx="barX"
      :cy="(innerPad + circleR + barH * 0.35).toFixed(1)"
      r="1" fill="var(--color-text-secondary)" opacity="0.45"
    />
    <circle
      :cx="barX"
      :cy="(innerPad + circleR + barH * 0.5).toFixed(1)"
      r="1" fill="var(--color-text-secondary)" opacity="0.45"
    />
    <circle
      :cx="barX"
      :cy="(innerPad + circleR + barH * 0.65).toFixed(1)"
      r="1" fill="var(--color-text-secondary)" opacity="0.45"
    />
    <!-- Top and bottom circles on top of gradient -->
    <circle
      :cx="barX"
      :cy="innerPad + circleR"
      :r="circleR"
      :fill="colorTop"
      stroke="#000" stroke-width="0.5"
    />
    <circle
      :cx="barX"
      :cy="(innerPad + circleR + barH).toFixed(1)"
      :r="circleR"
      :fill="colorBottom"
      stroke="#000" stroke-width="0.5"
    />
    <text
      :x="textX"
      :y="(innerPad + circleR).toFixed(1)"
      font-size="10.5" font-weight="500" dominant-baseline="middle"
      :style="{ fill: 'var(--color-text-primary)' }"
    >d = 15</text>
    <text
      :x="textX"
      :y="(innerPad + circleR + barH).toFixed(1)"
      font-size="10.5" font-weight="500" dominant-baseline="middle"
      :style="{ fill: 'var(--color-text-primary)' }"
    >d = 3</text>
  </g>
</template>
