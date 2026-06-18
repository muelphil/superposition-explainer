<script setup lang="ts">
import { computed } from 'vue'
import { featureColor } from '../utils/featureColor'

const props = withDefaults(
    defineProps<{
      dimensions?: number[]
    }>(),
    {
      dimensions: () => [1024, 2048, 4096, 8192, 12288, 16384],
    }
)

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

  return props.dimensions.map((d, i) => {
    const p = paramCount(d)

    return {
      d,
      formatted: formatParams(p),
      barRatio: p / maxP,
      colorIdx: i,
      inline: i >= 3,
    }
  })
})

function barColor(idx: number): string {
  return featureColor(idx, props.dimensions.length)
}
</script>

<template>
  <div
      class="param-scale-chart"
      role="img"
      aria-label="Parameter count scales quadratically with embedding dimension"
  >
    <div class="param-header-row">
      <span class="param-dim-header">
        <katex-element expression="d_{\text{model}}" />
      </span>

      <span class="param-bar-header">Parameters</span>
    </div>

    <div
        v-for="row in rows"
        :key="row.d"
        class="param-row"
    >
      <span class="param-dim">
        {{ row.d.toLocaleString() }}
      </span>

      <div class="param-bar-area">
        <div
            class="param-bar"
            :style="{
            width: `${row.barRatio * 100}%`,
            backgroundColor: barColor(row.colorIdx),
          }"
        >
          <span
              v-if="row.inline"
              class="param-value param-value-inline"
          >
            {{ row.formatted }}
          </span>
        </div>

        <span
            v-if="!row.inline"
            class="param-value param-value-outside"
        >
          {{ row.formatted }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.param-scale-chart {
  padding-bottom: 16px;
  width: 100%;
}

/* ────────────────────────────────────────── */
/* Layout                                     */
/* ────────────────────────────────────────── */

.param-header-row,
.param-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  column-gap: 16px;
  align-items: center;
}

.param-row + .param-row {
  margin-top: 10px;
}

/* ────────────────────────────────────────── */
/* Header                                     */
/* ────────────────────────────────────────── */

.param-dim-header,
.param-bar-header {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  user-select: none;
}

.param-dim-header {
  text-align: right;
}

.param-bar-header {
  text-align: left;
}

/* ────────────────────────────────────────── */
/* Dimension column                           */
/* ────────────────────────────────────────── */

.param-dim {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--color-text-primary);
  text-align: right;
  white-space: nowrap;
  user-select: none;
}

/* ────────────────────────────────────────── */
/* Bar area                                   */
/* ────────────────────────────────────────── */

.param-bar-area {
  display: flex;
  align-items: center;
  min-width: 0;
}

.param-bar {
  position: relative;
  height: 22px;
  border-radius: 4px;
  opacity: 0.8;

  display: flex;
  align-items: center;
  justify-content: flex-end;

  transition: width 0.2s ease;
}

.param-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
}

/* rows 1-3 */

.param-value-outside {
  margin-left: 10px;
  color: var(--color-text-primary);
}

/* rows 4-6 */

.param-value-inline {
  padding-right: 8px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

/* ────────────────────────────────────────── */
/* Responsive                                 */
/* ────────────────────────────────────────── */

@media (max-width: 480px) {
  .param-header-row,
  .param-row {
    grid-template-columns: 90px minmax(0, 1fr);
    column-gap: 12px;
  }

  .param-dim,
  .param-value {
    font-size: 11px;
  }

  .param-bar {
    height: 18px;
  }

  .param-row + .param-row {
    margin-top: 8px;
  }
}

.param-header-row{
  padding-bottom: 8px;
}
</style>