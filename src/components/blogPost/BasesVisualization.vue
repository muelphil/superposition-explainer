<script setup lang="ts">
import { computed, inject } from 'vue'
import { renderLatexHtml } from '../../utils/latex'
import type { BasesServiceType } from '../../services/BasesService'

const svc = inject<BasesServiceType>('basesService')!

const x = computed(() => svc.x.value)

const katexHtml = computed(() => renderLatexHtml(`x = ${x.value}`))

// SVG coordinate system constants
const svgSize = 280
const margin = 36
const axisLen = svgSize - 2 * margin
const origin = { x: margin, y: svgSize - margin }
const tickCount = 5
const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i)
const tickSpacing = axisLen / tickCount
</script>

<template>
  <div class="bases-viz">
    <!-- 2D coordinate system -->
    <svg
      :width="svgSize"
      :height="svgSize"
      class="coord-svg"
      viewBox="0 0 280 280"
    >
      <!-- Grid lines -->
      <g class="grid-lines">
        <line
          v-for="i in ticks"
          :key="'gx-' + i"
          :x1="origin.x + i * tickSpacing"
          :y1="margin"
          :x2="origin.x + i * tickSpacing"
          :y2="origin.y"
          class="grid-line"
        />
        <line
          v-for="i in ticks"
          :key="'gy-' + i"
          :x1="origin.x"
          :y1="origin.y - i * tickSpacing"
          :x2="origin.x + axisLen"
          :y2="origin.y - i * tickSpacing"
          class="grid-line"
        />
      </g>

      <!-- X axis -->
      <line
        :x1="origin.x" :y1="origin.y"
        :x2="origin.x + axisLen" :y2="origin.y"
        class="axis-line"
      />
      <!-- Y axis -->
      <line
        :x1="origin.x" :y1="origin.y"
        :x2="origin.x" :y2="margin"
        class="axis-line"
      />

      <!-- X axis arrow -->
      <polygon
        :points="`${origin.x + axisLen},${origin.y} ${origin.x + axisLen - 6},${origin.y - 4} ${origin.x + axisLen - 6},${origin.y + 4}`"
        class="axis-arrow"
      />
      <!-- Y axis arrow -->
      <polygon
        :points="`${origin.x},${margin} ${origin.x - 4},${margin + 6} ${origin.x + 4},${margin + 6}`"
        class="axis-arrow"
      />

      <!-- X axis ticks & labels -->
      <g v-for="i in tickCount" :key="'xt-' + i">
        <line
          :x1="origin.x + i * tickSpacing"
          :y1="origin.y"
          :x2="origin.x + i * tickSpacing"
          :y2="origin.y + 5"
          class="tick-line"
        />
        <text
          :x="origin.x + i * tickSpacing"
          :y="origin.y + 18"
          class="tick-label"
        >{{ i }}</text>
      </g>

      <!-- Y axis ticks & labels -->
      <g v-for="i in tickCount" :key="'yt-' + i">
        <line
          :x1="origin.x"
          :y1="origin.y - i * tickSpacing"
          :x2="origin.x - 5"
          :y2="origin.y - i * tickSpacing"
          class="tick-line"
        />
        <text
          :x="origin.x - 10"
          :y="origin.y - i * tickSpacing + 4"
          class="tick-label tick-label-y"
        >{{ i }}</text>
      </g>

      <!-- Axis labels -->
      <text
        :x="origin.x + axisLen / 2"
        :y="origin.y + 32"
        class="axis-label"
      >x₁</text>
      <text
        :x="origin.x - 28"
        :y="margin + axisLen / 2"
        class="axis-label"
        transform="rotate(-90, 8, 158)"
      >x₂</text>

      <!-- Origin label -->
      <text
        :x="origin.x - 12"
        :y="origin.y + 14"
        class="tick-label"
      >0</text>
    </svg>

    <!-- KaTeX math display -->
    <div class="math-display" v-html="katexHtml" />
  </div>
</template>

<style scoped>
.bases-viz {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.coord-svg {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.grid-line {
  stroke: var(--color-border);
  stroke-width: 0.5;
}

.axis-line {
  stroke: var(--color-text-primary);
  stroke-width: 1.5;
}

.axis-arrow {
  fill: var(--color-text-primary);
}

.tick-line {
  stroke: var(--color-text-primary);
  stroke-width: 1;
}

.tick-label {
  font-size: 11px;
  fill: var(--color-text-secondary);
  text-anchor: middle;
  font-family: system-ui, sans-serif;
}

.tick-label-y {
  text-anchor: end;
}

.axis-label {
  font-size: 13px;
  fill: var(--color-text-label);
  text-anchor: middle;
  font-family: system-ui, sans-serif;
  font-style: italic;
}

.math-display {
  font-size: 1.25rem;
  color: var(--color-text-primary);
  padding: 0.75rem 1rem;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}
</style>
