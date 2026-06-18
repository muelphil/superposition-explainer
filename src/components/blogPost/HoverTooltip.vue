<script setup lang="ts">
defineProps<{
  angle: number
  valueD15: number
  valueD3: number
  colorD15: string
  colorD3: string
}>()
</script>

<template>
  <div
      xmlns="http://www.w3.org/1999/xhtml"
      class="chart-tooltip"
      :style="{
      '--circle-size': '10px',
    }"
      style="position:absolute;left:0;top:0;"
  >
    <!-- Angle header -->
    <div class="chart-tooltip-header">
      <span v-katex="`\\alpha_{\\text{min}} = ${angle}^{\\circ}`" />
    </div>

    <!-- d=15 row -->
    <div class="chart-tooltip-row row-d15">
      <div
          class="chart-tooltip-circle"
          :style="{ backgroundColor: colorD15 }"
      />
      <span v-katex="`d=15 \\;\\rightarrow\\; ${valueD15}`" />
    </div>

    <!-- d=3 row -->
    <div class="chart-tooltip-row row-d3">
      <div
          class="chart-tooltip-circle"
          :style="{ backgroundColor: colorD3 }"
      />
      <span v-katex="`d=3 \\;\\rightarrow\\; ${valueD3}`" />
    </div>
  </div>
</template>

<style scoped>
.chart-tooltip {
  font-size: 0.8em;
  line-height: 1;

  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;

  padding: 6px 8px;

  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  box-sizing: border-box;
  width: fit-content;
  pointer-events: none;
  z-index:10000000;
}

/* ---------- Header ---------- */

.chart-tooltip-header {
  grid-column: 1;
  grid-row: 1;

  display: flex;
  align-items: center;

  padding-bottom: 5px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

/* ---------- Rows ---------- */

.chart-tooltip-row {
  grid-column: 1;

  display: flex;
  align-items: center;

  gap: 8px;
}

.row-d15 {
  grid-row: 2;
}

.row-d3 {
  grid-row: 3;
  padding-top: 4px;
}

/* ---------- Circle ---------- */

.chart-tooltip-circle {
  flex-shrink: 0;

  width: var(--circle-size);
  height: var(--circle-size);

  border-radius: 50%;

  border: 1px solid rgba(0, 0, 0, 0.35);

  box-sizing: border-box;
}

/* ---------- KaTeX ---------- */

.chart-tooltip-header :deep(.katex),
.chart-tooltip-row :deep(.katex) {
  font-size: inherit;
  line-height: 1;
  margin: 0;
}
</style>
