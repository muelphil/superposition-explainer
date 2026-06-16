<script setup lang="ts">
defineProps<{
  x: number
  y: number
  angle: number
  valueD15: number
  valueD3: number
  colorD15: string
  colorD3: string
}>()
</script>

<template>
  <foreignObject :x="x.toFixed(1)" :y="y.toFixed(1)" width="110" height="56">
    <div xmlns="http://www.w3.org/1999/xhtml" class="chart-tooltip">
      <div class="chart-tooltip-row">
        <span
          :style="{ '--katex-color': 'var(--color-text-primary)' }"
          v-katex="`\\alpha_{\\min} = ${angle}^{\\circ}`"
        />
      </div>
      <div class="chart-tooltip-row">
        <span class="chart-tooltip-dot" :style="{ background: colorD15 }" />
        <span v-katex="`d=15 \\;\\rightarrow\\; ${valueD15}`" />
      </div>
      <div class="chart-tooltip-row">
        <span class="chart-tooltip-dot" :style="{ background: colorD3 }" />
        <span v-katex="`d=3 \\;\\rightarrow\\; ${valueD3}`" />
      </div>
    </div>
  </foreignObject>
</template>

<style scoped>
.chart-tooltip {
  font-size: 11px;
  line-height: 1.4;
  padding: 5px 7px 5px 6px;
  border: 0.6px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-bg);
  display: inline-block;
  white-space: nowrap;
}

.chart-tooltip-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.chart-tooltip-row .katex {
  font-size: 11px !important;
}

.chart-tooltip-row:first-child .katex {
  font-size: 11.5px !important;
}

.chart-tooltip-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 0.8px solid #000;
  flex-shrink: 0;
}

.chart-tooltip :deep(.katex) {
  font-size: 11px !important;
}
</style>
