<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'

const svc = inject<AutoencoderServiceType>('autoencoderService')!

// ─── Tab selection ────────────────────────────────────────────────────────────
type MetricKey = 'loss' | 'presence' | 'angle'
const selected = ref<MetricKey>('loss')

const tabs: { key: MetricKey; label: string; color: string; yLabel: string }[] = [
  { key: 'loss',     label: 'Loss',            color: 'var(--color-interactive)', yLabel: 'loss' },
  { key: 'presence', label: 'Feature Presence', color: 'var(--color-positive)',   yLabel: 'features' },
  { key: 'angle',    label: 'Min Angle',        color: '#22c55e',                 yLabel: '°' },
]
const activeTab = computed(() => tabs.find(t => t.key === selected.value)!)

const history = computed(() => {
  switch (selected.value) {
    case 'loss':     return svc.lossHistory.value
    case 'presence': return svc.featurePresenceHistory.value
    case 'angle':    return svc.minAngleHistory.value
  }
})

// ─── SVG chart geometry (viewBox units) ──────────────────────────────────────
const VW = 400, VH = 110
const PL = 36, PR = 6, PT = 8, PB = 22
const PW = VW - PL - PR
const PH = VH - PT - PB

const niceMax = computed(() => {
  const pts = history.value
  if (!pts.length) return 1
  const raw = Math.max(...pts.map(p => p.v))
  if (raw <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(raw)))
  const frac = raw / exp
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10
  return niceFrac * exp
})

function xOf(s: number): number {
  const pts = history.value
  if (pts.length < 2) return PL
  const s0 = pts[0].s, s1 = pts[pts.length - 1].s
  return PL + ((s - s0) / (s1 - s0 || 1)) * PW
}
function yOf(v: number): number {
  return PT + PH - (Math.max(0, v) / niceMax.value) * PH
}

const linePath = computed(() => {
  const pts = history.value
  if (pts.length < 2) return ''
  return pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xOf(p.s).toFixed(1)} ${yOf(p.v).toFixed(1)}`
  ).join(' ')
})

const areaPath = computed(() => {
  if (!linePath.value) return ''
  const pts = history.value
  const base = PT + PH
  const x0 = xOf(pts[0].s).toFixed(1)
  const x1 = xOf(pts[pts.length - 1].s).toFixed(1)
  return `${linePath.value} L ${x1} ${base} L ${x0} ${base} Z`
})

const yTicks = computed(() => {
  const max = niceMax.value
  return [0, 1, 2, 3, 4].map(i => {
    const v = (i / 4) * max
    const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k`
      : v >= 10 ? v.toFixed(1)
      : v >= 1  ? v.toFixed(2)
      : v.toFixed(3)
    return { y: yOf(v), label }
  })
})

const xTicks = computed(() => {
  const pts = history.value
  if (pts.length < 2) return []
  const s0 = pts[0].s, s1 = pts[pts.length - 1].s
  return [0, 0.25, 0.5, 0.75, 1].map(f => {
    const s = Math.round(s0 + f * (s1 - s0))
    const label = s >= 1000 ? `${(s / 1000).toFixed(1)}k` : String(s)
    return { x: xOf(s), label }
  })
})

const latestValue = computed(() => {
  const pts = history.value
  if (!pts.length) return null
  const v = pts[pts.length - 1].v
  return v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3)
})
</script>

<template>
  <div class="stats-panel">

    <!-- ── Tab bar ──────────────────────────────────────────── -->
    <div class="tab-bar" role="radiogroup" aria-label="Statistic">
      <label
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-label"
        :class="{ active: selected === tab.key }"
        :style="selected === tab.key ? { '--tab-color': tab.color } : {}"
      >
        <input type="radio" v-model="selected" :value="tab.key" class="sr-only" />
        {{ tab.label }}
      </label>
    </div>

    <!-- ── Chart ────────────────────────────────────────────── -->
    <div class="chart-wrap">
      <template v-if="history.length >= 2">
        <div class="chart-badge" v-if="latestValue !== null">
          <span class="badge-val" :style="{ color: activeTab.color }">{{ latestValue }}</span>
          <span class="badge-unit">{{ activeTab.yLabel }}</span>
        </div>

        <svg
          :viewBox="`0 0 ${VW} ${VH}`"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          class="chart-svg"
          aria-hidden="true"
        >
          <!-- Y grid lines -->
          <line
            v-for="tick in yTicks" :key="`yg-${tick.y}`"
            :x1="PL" :y1="tick.y.toFixed(1)"
            :x2="PL + PW" :y2="tick.y.toFixed(1)"
            stroke="#f0f0f0" stroke-width="0.8"
          />

          <!-- Area fill with gradient -->
          <defs>
            <linearGradient :id="`ag-${selected}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   :stop-color="activeTab.color" stop-opacity="0.18" />
              <stop offset="100%" :stop-color="activeTab.color" stop-opacity="0.02" />
            </linearGradient>
          </defs>
          <path :d="areaPath" :fill="`url(#ag-${selected})`" />

          <!-- Line -->
          <path
            :d="linePath" fill="none"
            :stroke="activeTab.color"
            stroke-width="1.3"
            stroke-linejoin="round" stroke-linecap="round"
          />

          <!-- Y axis labels -->
          <text
            v-for="tick in yTicks" :key="`yl-${tick.y}`"
            :x="PL - 3" :y="(tick.y + 1.8).toFixed(1)"
            text-anchor="end" font-size="7" fill="#9ca3af"
          >{{ tick.label }}</text>

          <!-- X axis ticks + labels -->
          <g v-for="tick in xTicks" :key="`xt-${tick.x}`">
            <line
              :x1="tick.x.toFixed(1)" :y1="PT + PH"
              :x2="tick.x.toFixed(1)" :y2="PT + PH + 2.5"
              stroke="#d1d5db" stroke-width="0.6"
            />
            <text
              :x="tick.x.toFixed(1)" :y="PT + PH + 9"
              text-anchor="middle" font-size="7" fill="#9ca3af"
            >{{ tick.label }}</text>
          </g>

          <!-- Axes -->
          <line :x1="PL" :y1="PT" :x2="PL" :y2="PT + PH" stroke="#e5e7eb" stroke-width="0.6" />
          <line :x1="PL" :y1="PT + PH" :x2="PL + PW" :y2="PT + PH" stroke="#e5e7eb" stroke-width="0.6" />
        </svg>
      </template>

      <div v-else class="empty-state">
        Start training to see statistics
      </div>
    </div>

  </div>
</template>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.tab-bar {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-label);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  background: var(--color-bg-secondary);
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.tab-label:hover {
  border-color: #d1d5db;
  background: var(--color-bg);
}
.tab-label.active {
  background: var(--color-bg);
  border-color: var(--tab-color, var(--color-interactive));
  color: var(--tab-color, var(--color-interactive));
}

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

.chart-wrap {
  position: relative;
  min-height: 80px;
}

.chart-svg { display: block; }

.chart-badge {
  position: absolute;
  top: 4px; right: 4px;
  display: flex;
  align-items: baseline;
  gap: 3px;
  pointer-events: none;
  z-index: 1;
}
.badge-val {
  font-size: 0.9rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.badge-unit {
  font-size: 0.68rem;
  color: var(--color-text-secondary);
}

.empty-state {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
}
</style>

