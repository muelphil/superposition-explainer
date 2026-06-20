<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import data from '../../data/sphericalCodesData.json'
import DimLegend from './DimLegend.vue'
import HoverTooltip from './HoverTooltip.vue'
import { featureColor } from '../../utils/featureColor'

// ── Chart bounds ──────────────────────────────────────────────────────────────────
const SVG_W = 680
const SVG_H = 380
const X_START = 90
const X_END = 63
const Y_MAX = 1100
const Y_STEP = 250
const YAXIS_LABEL_X = 10
const MARGIN_LEFT = 44
const MARGIN_LEFT_MOBILE = 64
const YAXIS_LABEL_X_MOBILE = 10
const MARGIN_RIGHT = 8
const MARGIN_TOP = 0
const MARGIN_BOTTOM = 46
const MARGIN_TICK = 4
const marginLeft = computed(() => isMobile.value ? MARGIN_LEFT_MOBILE : MARGIN_LEFT)
const yAxisLabelX = computed(() => isMobile.value ? YAXIS_LABEL_X_MOBILE : YAXIS_LABEL_X)
const plotW = computed(() => SVG_W - marginLeft.value - MARGIN_RIGHT)
const HOVER_OVERFLOW = 32
const PLOT_H = SVG_H - MARGIN_TOP - MARGIN_BOTTOM

// ── Legend geometry ───────────────────────────────────────────────────────────────
const LEGEND_BAR_H = 60
const LEGEND_CIRCLE_R = 4
const LEGEND_W = 90
const LEGEND_H = LEGEND_BAR_H + 2 * LEGEND_CIRCLE_R + 12
const LEGEND_POS_Y = MARGIN_TOP + 10
const legendPosX = computed(() => marginLeft.value + 10)

// ── Dimension colors (uses the project feature gradient) ───────────────────────
// d=3 (lowest) → blue (t=1), d=15 (highest) → orange (t=0).
// The gradient is orange→pink→blue, so we reverse the mapping.
const DIMENSIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
const NUM_DIMENSIONS = DIMENSIONS.length

function dimColor(d: number): string {
  const idx = DIMENSIONS.indexOf(d)
  const reversedIdx = NUM_DIMENSIONS - 1 - idx
  return featureColor(reversedIdx, NUM_DIMENSIONS)
}

// ── Scales ────────────────────────────────────────────────────────────────────────
function xScale(angle: number): number {
  return marginLeft.value + ((X_START - angle) / (X_START - X_END)) * plotW.value
}

function yScale(v: number): number {
  return MARGIN_TOP + PLOT_H - (Math.max(1, v) / Y_MAX) * PLOT_H
}

function cosToDeg(cos: number): number {
  return Math.acos(Math.min(1, Math.max(-1, cos))) * 180 / Math.PI
}

// ── Step-function path ───────────────────────────────────────────────────────────
function buildStepPath(transitions: { cos: number; n: number }[]): string {
  if (!transitions.length) return ''
  const k = transitions.length
  const angles = transitions.map(t => cosToDeg(t.cos))

  let startIdx = -1
  for (let i = 0; i < k; i++) {
    if (transitions[i].cos <= 0) { startIdx = i } else break
  }
  if (startIdx < 0) startIdx = 0

  let currentN = transitions[startIdx].n
  const parts: string[] = [
    `M ${xScale(X_START).toFixed(1)} ${yScale(currentN).toFixed(1)}`
  ]

  for (let i = startIdx + 1; i < k; i++) {
    const angle = angles[i]
    if (angle < X_END) break
    const x = xScale(angle)
    const nextN = transitions[i].n
    parts.push(`L ${x.toFixed(1)} ${yScale(currentN).toFixed(1)}`)
    parts.push(`L ${x.toFixed(1)} ${yScale(nextN).toFixed(1)}`)
    currentN = nextN
  }

  parts.push(`L ${xScale(X_END).toFixed(1)} ${yScale(currentN).toFixed(1)}`)
  return parts.join(' ')
}

// ── Data lookup: n for given d and angle ─────────────────────────────────────────
function nAtAngle(d: number, angle: number): number | null {
  const key = String(d)
  const transitions = (data as Record<string, { cos: number; n: number }[]>)[key]
  if (!transitions) return null
  const threshold = Math.cos(angle * Math.PI / 180)
  let n = 1
  for (const t of transitions) {
    if (t.cos <= threshold) n = t.n
    else break
  }
  return n
}

// ── Series ────────────────────────────────────────────────────────────────────────
const chartData = computed(() => DIMENSIONS.map(d => ({
  d,
  color: dimColor(d),
  path: buildStepPath((data as Record<string, { cos: number; n: number }[]>)[String(d)] || []),
})))

// ── Tick arrays ──────────────────────────────────────────────────────────────────
const xTicks = computed(() => {
  const ticks: { angle: number; label: string }[] = []
  for (let a = X_START; a >= X_END; a -= 5) {
    ticks.push({ angle: a, label: `${a}°` })
  }
  return ticks
})

const yTicks = computed(() => {
  const ticks: { value: number; label: string }[] = []
  for (let i = 0; i * Y_STEP <= Y_MAX; i++) {
    const v = i * Y_STEP
    const label = v >= 1000 && v % 1000 === 0 ? `${(v / 1000).toFixed(0)}k` : String(v)
    ticks.push({ value: v, label })
  }
  return ticks
})

// ── Hover state ───────────────────────────────────────────────────────────────────
const svgRef = ref<SVGSVGElement | null>(null)
const hoveredAngle = ref<number | null>(null)
const isMobile = ref(false)

let mql: MediaQueryList | null = null
onMounted(() => {
  mql = window.matchMedia('(max-width: 768px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
})
onUnmounted(() => { mql?.removeEventListener('change', () => {}) })

const HIGHLIGHT_DIMS = [3, 15]

const hoverMarkers = computed(() => {
  if (hoveredAngle.value == null) return []
  const angle = hoveredAngle.value
  return HIGHLIGHT_DIMS
    .map(d => {
      const n = nAtAngle(d, angle)
      return { d, n, color: dimColor(d), y: n != null ? yScale(n) : null }
    })
    .filter((m): m is typeof m & { y: number; n: number } => m.y != null && m.n != null)
})

const TOOLTIP_W = 115
const TOOLTIP_H = 56
const TOOLTIP_GAP = 8

const hoverTooltip = computed(() => {
  if (hoveredAngle.value == null || hoverMarkers.value.length < 2) return null
  const cx = xScale(hoveredAngle.value)
  const d15 = hoverMarkers.value.find(m => m.d === 15)!
  const d3 = hoverMarkers.value.find(m => m.d === 3)!
  const w = isMobile.value ? 195 : TOOLTIP_W
  const right = xScale(X_END) - 2
  const placedRight = cx + TOOLTIP_GAP + w <= right
  const placedLeft = cx - TOOLTIP_GAP - w >= marginLeft.value
  const tx = placedRight ? cx + TOOLTIP_GAP : (placedLeft ? cx - TOOLTIP_GAP - w : cx + TOOLTIP_GAP)
  const ty = isMobile.value
    ? MARGIN_TOP + PLOT_H / 2 - TOOLTIP_H / 2
    : (d15.y + d3.y) / 2 - TOOLTIP_H / 2
  return { angle: hoveredAngle.value, tx, ty, d15n: d15.n, d3n: d3.n }
})

function onPlotMousemove(e: MouseEvent) {
  const svg = svgRef.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const svgW = rect.width / SVG_W
  const mouseX = (e.clientX - rect.left) / svgW
    if (mouseX >= marginLeft.value && mouseX <= xScale(X_END) + HOVER_OVERFLOW) {
      const t = Math.max(0, Math.min(1, (mouseX - marginLeft.value) / plotW.value))
      const angle = Math.round(X_START - t * (X_START - X_END))
      const newAngle: number | null = (angle >= X_END && angle <= X_START) ? angle : null
      if (hoveredAngle.value !== newAngle) {
        hoveredAngle.value = newAngle
      }
    } else if (hoveredAngle.value !== null) {
      hoveredAngle.value = null
    }
}
</script>

<template>
  <div class="spherical-codes-chart">
    <svg
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
      class="chart-svg"
      ref="svgRef"
    >
      <!-- ── Y grid lines ─────────────────────────────────── -->
      <line
        v-for="tick in yTicks" :key="`yg-${tick.value}`"
        :x1="marginLeft" :y1="yScale(tick.value).toFixed(1)"
        :x2="xScale(X_END).toFixed(1)" :y2="yScale(tick.value).toFixed(1)"
        stroke="var(--color-chart-grid)" stroke-width="0.6"
      />

      <!-- ── X grid lines (major only) ─────────────────────── -->
      <line
        v-for="tick in xTicks" :key="`xg-${tick.angle}`"
        :x1="xScale(tick.angle)" :y1="MARGIN_TOP"
        :x2="xScale(tick.angle)" :y2="MARGIN_TOP + PLOT_H"
        stroke="var(--color-chart-grid)" stroke-width="0.4" opacity="0.5"
      />

      <!-- ── Series lines ─────────────────────────────────── -->
      <path
        v-for="s in chartData" :key="`line-${s.d}`"
        :d="s.path" fill="none" :stroke="s.color"
        stroke-width="1.8" stroke-linejoin="miter" stroke-linecap="butt"
        opacity="0.9"
      />




      <!-- ── X axis ticks + labels ────────────────────────── -->
      <g v-for="tick in xTicks" :key="`xt-${tick.angle}`">
        <line
          :x1="xScale(tick.angle).toFixed(1)" :y1="MARGIN_TOP + PLOT_H"
          :x2="xScale(tick.angle).toFixed(1)"
          :y2="(MARGIN_TOP + PLOT_H + MARGIN_TICK + 2).toFixed(1)"
          stroke="var(--color-border)" stroke-width="0.6"
        />
        <text
          :x="xScale(tick.angle).toFixed(1)"
          :y="(MARGIN_TOP + PLOT_H + MARGIN_TICK + 14).toFixed(1)"
          text-anchor="middle" font-size="12"
          :style="{ fill: 'var(--color-text-secondary)' }"
        >{{ tick.label }}</text>
      </g>

      <!-- ── Y axis tick labels ───────────────────────────── -->
      <text
        v-for="tick in yTicks" :key="`yl-${tick.value}`"
        :x="(marginLeft - MARGIN_TICK - 2).toFixed(1)"
        :y="(yScale(tick.value) + 3.5).toFixed(1)"
        text-anchor="end" font-size="12"
        :style="{ fill: 'var(--color-text-secondary)' }"
      >{{ tick.label }}</text>

      <!-- ── Axes ─────────────────────────────────────────── -->
      <line :x1="marginLeft" :y1="MARGIN_TOP" :x2="marginLeft" :y2="(MARGIN_TOP + PLOT_H).toFixed(1)" stroke="var(--color-border)" stroke-width="0.8" />
      <line :x1="marginLeft" :y1="MARGIN_TOP + PLOT_H" :x2="xScale(X_END).toFixed(1)" :y2="MARGIN_TOP + PLOT_H" stroke="var(--color-border)" stroke-width="0.8" />

      <!-- ── Hover: vertical cursor + circles (above axes) ── -->
      <g v-if="hoveredAngle != null">
        <line
          :x1="xScale(hoveredAngle).toFixed(1)" :y1="MARGIN_TOP"
          :x2="xScale(hoveredAngle).toFixed(1)" :y2="(MARGIN_TOP + PLOT_H).toFixed(1)"
          stroke="var(--color-text-primary)" stroke-width="0.8"
          stroke-dasharray="4,3" opacity="0.5"
        />
        <g v-for="m in hoverMarkers" :key="`hc-${m.d}`">
          <circle
            :cx="xScale(hoveredAngle).toFixed(1)" :cy="m.y.toFixed(1)"
            r="5" :fill="m.color" stroke="rgba(0,0,0,0.35)" stroke-width="1"
          />
        </g>
      </g>

      <!-- ── Tooltip ──────────────────────────────────────── -->
      <foreignObject
        v-if="hoverTooltip"
        :x="hoverTooltip.tx.toFixed(1)"
        :y="hoverTooltip.ty.toFixed(1)"
        width="130" height="90"
        style="pointer-events: none"
        class="tooltip-fo"
      >
        <HoverTooltip
          :angle="hoverTooltip.angle"
          :value-d-15="hoverTooltip.d15n"
          :value-d-3="hoverTooltip.d3n"
          :color-d-15="dimColor(15)"
          :color-d-3="dimColor(3)"
        />
      </foreignObject>

      <!-- ── X axis label ─────────────────────────────────── -->
      <text
        :x="((marginLeft + xScale(X_END)) / 2).toFixed(1)" :y="(SVG_H - 6).toFixed(1)"
        text-anchor="middle" font-size="13" font-weight="500"
        :style="{ fill: 'var(--color-text-primary)' }"
        class="axis-label"
      >Minimum pairwise angle α (degrees)</text>

      <!-- ── Y axis label ─────────────────────────────────── -->
      <text
        :x="yAxisLabelX" :y="(MARGIN_TOP + PLOT_H / 2).toFixed(1)"
        text-anchor="middle" font-size="13" font-weight="500"
        :style="{ fill: 'var(--color-text-primary)' }"
        :transform="`rotate(-90, ${yAxisLabelX}, ${MARGIN_TOP + PLOT_H / 2})`"
        class="axis-label"
      >Maximum number of vectors</text>

      <!-- ── Dimension legend ─────────────────────────────── -->
      <foreignObject
        :x="legendPosX" :y="LEGEND_POS_Y"
        :width="LEGEND_W" :height="LEGEND_H"
        style="pointer-events: none"
        class="legend-fo"
      >
        <DimLegend
          :width="LEGEND_W"
          :height="LEGEND_H"
          :bar-h="LEGEND_BAR_H"
          :circle-r="LEGEND_CIRCLE_R"
          :color-top="dimColor(15)"
          :color-bottom="dimColor(3)"
        />
       </foreignObject>

      <!-- ── Hover capture area (must be last for z-order) ── -->
      <rect
        :x="marginLeft" :y="MARGIN_TOP"
        :width="plotW + HOVER_OVERFLOW" :height="PLOT_H"
        fill="transparent"
        @mousemove="onPlotMousemove"
        @mouseleave="() => (hoveredAngle = null)"
        style="pointer-events: all"
      />
    </svg>
  </div>
</template>

<style scoped>
.spherical-codes-chart {
  width: 100%;
  max-width: var(--blog-prose-width);
}

.chart-svg {
  display: block;
  width: 100%;
  height: auto;
}

.axis-label {
  font-size: 13px;
}

@media (max-width: 768px) {
  .chart-svg text[font-size="12"] {
    font-size: 18px !important;
  }

  .axis-label {
    font-size: 20px !important;
  }

  .legend-fo {
    width: 135px !important;
    height: 129px !important;
  }

  .legend-fo :deep(.dim-legend) {
    position: relative;
    transform-origin: top left;
    transform: scale(1.5);
  }

  .tooltip-fo {
    width: 195px !important;
    height: 145px !important;
  }

  .tooltip-fo :deep(.chart-tooltip) {
    position: relative;
    transform-origin: top left;
    transform: scale(1.35);
  }
}
</style>
