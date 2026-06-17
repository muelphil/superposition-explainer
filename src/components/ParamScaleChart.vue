<script setup lang="ts">
import { computed } from 'vue'
import { featureColor } from '../utils/featureColor'

const props = withDefaults(defineProps<{
  dimensions?: number[]
}>(), {
  dimensions: () => [1024, 2048, 4096, 8192, 12288, 16384],
})

const L = 96
const V = 50257
const N_CTX = 2048

function paramCount(d: number): number {
  return 12 * L * d * d + (V + N_CTX) * d
}

function formatParams(p: number): string {
  if (p >= 1e12) return `${(p / 1e12).toFixed(1)}T`
  if (p >= 1e9) return `${(p / 1e9).toFixed(1)}B`
  if (p >= 1e6) return `${(p / 1e6).toFixed(1)}M`
  return String(p)
}

const rows = computed(() => {
  const maxP = paramCount(Math.max(...props.dimensions))
  const n = props.dimensions.length
  return props.dimensions.map((d, i) => {
    const p = paramCount(d)
    const barRatio = p / maxP
    return { d, formatted: formatParams(p), barRatio, colorIdx: i }
  })
})

function barColor(idx: number): string {
  return featureColor(idx, props.dimensions.length)
}
</script>

<template>
  <div class="param-scale-chart" role="img" aria-label="Parameter count scales quadratically with embedding dimension">
    <!-- Header row (col-start/end span into the shared grid) -->
    <span class="param-dim-header"><katex-element expression="d_{\text{model}}" /></span>
    <span class="param-bar-header" />
    <span class="param-param-header">Parameters</span>

    <!-- Data rows -->
    <template v-for="row in rows" :key="row.d">
      <span class="param-dim">{{ row.d.toLocaleString() }}</span>
      <span class="param-bar-wrapper">
        <span
          class="param-bar"
          :style="{
            width: `${row.barRatio * 100}%`,
            backgroundColor: barColor(row.colorIdx),
          }"
        />
      </span>
      <span class="param-value">{{ row.formatted }}</span>
    </template>
  </div>
</template>

<style scoped>
.param-scale-chart {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-auto-rows: auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 6px;
  padding: 16px 0;
}

/* ── Header ──────────────────────────────── */

.param-dim-header,
.param-param-header {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  user-select: none;
}

.param-dim-header {
  justify-self: center;
}

.param-param-header {
  text-align: right;
  overflow: visible;
  white-space: nowrap;
}

/* ── Data rows ───────────────────────────── */

.param-dim {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--color-text-primary);
  text-align: right;
  user-select: none;
}

.param-bar-wrapper {
  display: flex;
  align-items: center;
}

.param-bar {
  height: 18px;
  border-radius: 4px;
  opacity: 0.7;
}

.param-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
  user-select: none;
}

/* ── Responsive ──────────────────────────── */

@media (max-width: 480px) {
  .param-scale-chart {
    column-gap: 8px;
    row-gap: 4px;
  }

  .param-dim,
  .param-value {
    font-size: 11px;
  }

  .param-bar {
    height: 14px;
  }
}
</style>
