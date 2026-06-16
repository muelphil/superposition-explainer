<script setup lang="ts">
import {computed} from 'vue'
import data from '../../data/sphericalCodesData.json'

// ── Constants ────────────────────────────────────────────────────────────────────
const X_START = 90
const X_END = 63
const DIMENSIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
const Y_MAX = 1100
const Y_STEP = 250

const SVG_W = 680
const SVG_H = 380
const YAXIS_LABEL_X = 8 // position of rotated y-axis label center (higher = closer to plot)
const MARGIN_LEFT = 44   // space for y-axis tick labels; plot starts here
const MARGIN_RIGHT = 8
const MARGIN_TOP = 40
const MARGIN_BOTTOM = 46
const MARGIN_TICK = 4

const PLOT_W = SVG_W - MARGIN_LEFT - MARGIN_RIGHT
const PLOT_H = SVG_H - MARGIN_TOP - MARGIN_BOTTOM

// ── Color gradient (green → yellow, matching Python script) ─────────────────────
function dimColor(d: number, n: number): string {
  const t = n <= 1 ? 0 : (d - DIMENSIONS[0]) / (DIMENSIONS[n - 1] - DIMENSIONS[0])
  const r = Math.round(33 + (237 - 33) * t)
  const g = Math.round(138 + (221 - 138) * t)
  const b = Math.round(33 + (48 - 33) * t)
  return `rgb(${r},${g},${b})`
}

// ── Scale helpers ────────────────────────────────────────────────────────────────
function xScale(angle: number): number {
  return MARGIN_LEFT + ((X_START - angle) / (X_START - X_END)) * PLOT_W
}

function yScale(v: number): number {
  return MARGIN_TOP + PLOT_H - (Math.max(1, v) / Y_MAX) * PLOT_H
}

function cosToDeg(cos: number): number {
  return Math.acos(Math.min(1, Math.max(-1, cos))) * 180 / Math.PI
}

// ── Step-function path per dimension ─────────────────────────────────────────────
// Port of Python step_coords(transitions, 50, 90).
// SVG coordinate space: xScale(90)=left, xScale(50)=right.
// We draw left-to-right (90° → 50°).
//
// At 90° (cos=0): n = cross-polytope (2d). As angle decreases toward 50°, n rises.
// Transitions are sorted by cos ascending (n ascending), so angle descending.
//
// Walk logic (left to right):
//   Start at 90° at the n-level where cos ≤ 0.
//   For each subsequent transition (higher cos → lower angle → rightward on plot),
//   step up to the next n.
function buildStepPath(transitions: { cos: number; n: number }[]): string {
  if (!transitions.length) return ''
  const k = transitions.length
  const angles = transitions.map(t => cosToDeg(t.cos))

  // Find the n at 90° (cos=0): highest transition where cos ≤ 0
  let startIdx = -1
  for (let i = 0; i < k; i++) {
    if (transitions[i].cos <= 0) {
      startIdx = i
    } else {
      break
    }
  }

  // If no transition at cos ≤ 0, the value at 90° is 1 (shouldn't happen for d≥3)
  if (startIdx < 0) {
    startIdx = 0
    // All transitions are above 90°, start at n=1
  }

  let currentN = transitions[startIdx].n
  const parts: string[] = [
    `M ${xScale(X_START).toFixed(1)} ${yScale(currentN).toFixed(1)}`
  ]

  // Walk transitions from startIdx+1 upward (increasing cos, decreasing angle)
  for (let i = startIdx + 1; i < k; i++) {
    const angle = angles[i]
    if (angle < X_END) break

    const x = xScale(angle)
    const nextN = transitions[i].n

    // Horizontal at current level to this angle
    parts.push(`L ${x.toFixed(1)} ${yScale(currentN).toFixed(1)}`)
    // Vertical step up
    parts.push(`L ${x.toFixed(1)} ${yScale(nextN).toFixed(1)}`)
    currentN = nextN
  }

  // Extend horizontal to right edge (X_END)
  parts.push(`L ${xScale(X_END).toFixed(1)} ${yScale(currentN).toFixed(1)}`)

  return parts.join(' ')
}

// ── Series ────────────────────────────────────────────────────────────────────────
const chartData = computed(() => {
  return DIMENSIONS.map((d) => {
    const key = String(d)
    const transitions = (data as Record<string, { cos: number; n: number }[]>)[key] || []
    return {
      d,
      color: dimColor(d, DIMENSIONS.length),
      path: buildStepPath(transitions),
    }
  })
})

// ── Axis ticks ───────────────────────────────────────────────────────────────────
const xTicks = computed(() => {
  const ticks: { angle: number; label: string }[] = []

  for (let a = X_START; a >= X_END; a -= 5) {
    ticks.push({
      angle: a,
      label: `${a}°`,
    })
  }

  return ticks
})

const yTicks = computed(() => {
  const ticks: { value: number; label: string }[] = []
  for (let i = 0; i * Y_STEP <= Y_MAX; i++) {
    const v = i * Y_STEP
    let label = String(v)
    if (v >= 1000) {
      label = v % 1000 === 0 ? `${(v / 1000).toFixed(0)}k` : v.toString()
    }
    ticks.push({value: v, label})
  }
  return ticks
})

// ── Legend ───────────────────────────────────────────────────────────────────────
// Gradient bar in top-left of plot area, offset from y-axis.
const LEGEND_X = MARGIN_LEFT + 10
const LEGEND_Y = MARGIN_TOP + 10

const LEGEND_BAR_H = 60
const LEGEND_CIRCLE_R = 4
const LEGEND_INNER_PAD = 6

const LEGEND_BAR_X = LEGEND_INNER_PAD + LEGEND_CIRCLE_R
const LEGEND_TEXT_X = LEGEND_BAR_X + 12

const LEGEND_D3_COLOR = dimColor(3, DIMENSIONS.length)
const LEGEND_D15_COLOR = dimColor(15, DIMENSIONS.length)

const LEGEND_W = 57
const LEGEND_H = LEGEND_BAR_H + 2 * LEGEND_CIRCLE_R + 2 * LEGEND_INNER_PAD
</script>

<template>
  <div class="spherical-codes-chart">
    <svg
        :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
        class="chart-svg"
        aria-hidden="true"
    >
      <!-- ── Y grid lines ─────────────────────────────────── -->
      <line
          v-for="tick in yTicks" :key="`yg-${tick.value}`"
          :x1="MARGIN_LEFT" :y1="yScale(tick.value).toFixed(1)"
          :x2="xScale(X_END).toFixed(1)" :y2="yScale(tick.value).toFixed(1)"
          stroke="var(--color-chart-grid)" stroke-width="0.6"
      />

      <!-- ── X grid lines at 10° ─────────────────────────── -->
      <line
        v-for="tick in xTicks.filter(t => t.label)" :key="`xg-${tick.angle}`"
        :x1="xScale(tick.angle)" :y1="MARGIN_TOP"
        :x2="xScale(tick.angle)" :y2="MARGIN_TOP + PLOT_H"
        stroke="var(--color-chart-grid)" stroke-width="0.4" opacity="0.5"
      />

      <!-- ── Series lines ─────────────────────────────────── -->
      <path
          v-for="s in chartData" :key="`line-${s.d}`"
          :d="s.path" fill="none"
          :stroke="s.color"
          stroke-width="1.8"
          stroke-linejoin="miter" stroke-linecap="butt"
          opacity="0.9"
      />

      <!-- ── X axis ticks + labels ────────────────────────── -->
      <g v-for="tick in xTicks" :key="`xt-${tick.angle}`">
        <line
            :x1="xScale(tick.angle).toFixed(1)"
            :y1="MARGIN_TOP + PLOT_H"
            :x2="xScale(tick.angle).toFixed(1)"
            :y2="(
              MARGIN_TOP +
              PLOT_H +
              MARGIN_TICK + 2
            ).toFixed(1)"
                      stroke="var(--color-border)"
                      stroke-width="0.6"
        />

        <text
            :x="xScale(tick.angle).toFixed(1)"
            :y="(MARGIN_TOP + PLOT_H + MARGIN_TICK + 14).toFixed(1)"
            text-anchor="middle"
            font-size="8"
            :style="{ fill: 'var(--color-text-secondary)' }"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- ── Y axis labels ────────────────────────────────── -->
      <text
          v-for="tick in yTicks" :key="`yl-${tick.value}`"
          :x="(MARGIN_LEFT - MARGIN_TICK - 2).toFixed(1)" :y="(yScale(tick.value) + 3.5).toFixed(1)"
          text-anchor="end"
          font-size="9"
          :style="{ fill: 'var(--color-text-secondary)' }"
      >{{ tick.label }}
      </text>

      <!-- ── Axes ─────────────────────────────────────────── -->
      <line :x1="MARGIN_LEFT" :y1="MARGIN_TOP" :x2="MARGIN_LEFT" :y2="MARGIN_TOP + PLOT_H" stroke="var(--color-border)"
            stroke-width="0.8"/>
      <line :x1="MARGIN_LEFT" :y1="MARGIN_TOP + PLOT_H" :x2="xScale(X_END).toFixed(1)" :y2="MARGIN_TOP + PLOT_H"
            stroke="var(--color-border)" stroke-width="0.8"/>

      <!-- ── X axis label ─────────────────────────────────── -->
      <text
          :x="((MARGIN_LEFT + xScale(X_END)) / 2).toFixed(1)"
          :y="(SVG_H - 6).toFixed(1)"
          text-anchor="middle"
          font-size="12"
          font-weight="500"
          :style="{ fill: 'var(--color-text-primary)' }"
      >Minimum pairwise angle α (degrees)
      </text>

      <!-- ── Y axis label ─────────────────────────────────── -->
      <text
          :x="YAXIS_LABEL_X"
          :y="(MARGIN_TOP + PLOT_H / 2).toFixed(1)"
          text-anchor="middle"
          font-size="12"
          font-weight="500"
          :style="{ fill: 'var(--color-text-primary)' }"
          :transform="`rotate(-90, ${YAXIS_LABEL_X}, ${MARGIN_TOP + PLOT_H / 2})`"
      >Maximum number of vectors
      </text>

      <!-- ── Gradient legend defs ─────────────────────────── -->
      <defs>
        <linearGradient id="dim-legend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="LEGEND_D15_COLOR"/>
          <stop offset="100%" :stop-color="LEGEND_D3_COLOR"/>
        </linearGradient>
      </defs>

      <!-- ── Dimension legend (top-left) ──────────────────── -->
      <g :transform="`translate(${LEGEND_X}, ${LEGEND_Y})`">
        <rect
          :width="LEGEND_W"
          :height="LEGEND_H"
          fill="var(--color-bg)"
          fill-opacity="0.92"
          stroke="var(--color-border)"
          stroke-width="0.6"
          rx="4"
        />
        <rect
          :x="(LEGEND_BAR_X - LEGEND_CIRCLE_R).toFixed(1)"
          :y="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R).toFixed(1)"
          :width="(LEGEND_CIRCLE_R * 2).toFixed(1)"
          :height="LEGEND_BAR_H"
          fill="url(#dim-legend-grad)"
          :rx="LEGEND_CIRCLE_R"
        />
        <circle
          :cx="LEGEND_BAR_X"
          :cy="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R + LEGEND_BAR_H * 0.35).toFixed(1)"
          r="1" fill="var(--color-text-secondary)" opacity="0.45"
        />
        <circle
          :cx="LEGEND_BAR_X"
          :cy="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R + LEGEND_BAR_H * 0.5).toFixed(1)"
          r="1" fill="var(--color-text-secondary)" opacity="0.45"
        />
        <circle
          :cx="LEGEND_BAR_X"
          :cy="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R + LEGEND_BAR_H * 0.65).toFixed(1)"
          r="1" fill="var(--color-text-secondary)" opacity="0.45"
        />
        <!-- Top circle (d=15) — drawn last so it's on top -->
        <circle
          :cx="LEGEND_BAR_X"
          :cy="LEGEND_INNER_PAD + LEGEND_CIRCLE_R"
          :r="LEGEND_CIRCLE_R"
          :fill="LEGEND_D15_COLOR"
          stroke="#000" stroke-width="0.5"
        />
        <!-- Bottom circle (d=3) — drawn last so it's on top -->
        <circle
          :cx="LEGEND_BAR_X"
          :cy="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R + LEGEND_BAR_H).toFixed(1)"
          :r="LEGEND_CIRCLE_R"
          :fill="LEGEND_D3_COLOR"
          stroke="#000" stroke-width="0.5"
        />
        <text
          :x="LEGEND_TEXT_X"
          :y="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R).toFixed(1)"
          font-size="10.5" font-weight="500" dominant-baseline="middle"
          :style="{ fill: 'var(--color-text-primary)' }"
        >d = 15</text>
        <text
          :x="LEGEND_TEXT_X"
          :y="(LEGEND_INNER_PAD + LEGEND_CIRCLE_R + LEGEND_BAR_H).toFixed(1)"
          font-size="10.5" font-weight="500" dominant-baseline="middle"
          :style="{ fill: 'var(--color-text-primary)' }"
        >d = 3</text>
      </g>
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
</style>
