<script setup lang="ts">
import { computed } from 'vue'
import type { BasisPreset } from '@/lib/basisPresets'
import {
  scale,
  add,
  sub,
  projectOnto,
  norm,
  normSq,
  dot,
  midpoint,
  type Vec2,
} from '@/lib/linearAlgebra'

const props = defineProps<{
  preset: BasisPreset
  step: number
  showNaiveProjection?: boolean
}>()

// ── SVG coordinate mapping ──────────────────────────────────────
const SVG_W = 500
const SVG_H = 400
const X_MIN = -1.0
const X_MAX = 4.0
const Y_MIN = -0.8
const Y_MAX = 3.2
const SCALE = 100 // SVG units per math unit

function sx(x: number): number {
  return (x - X_MIN) * SCALE
}
function sy(y: number): number {
  return SVG_H - (y - Y_MIN) * SCALE
}

const ox = sx(0)
const oy = sy(0)

// ── Arrow geometry helper ───────────────────────────────────────
interface ArrowGeo {
  x1: number
  y1: number
  x2: number
  y2: number
  head: string
}

function arrowGeo(from: Vec2, to: Vec2, headSize = 12): ArrowGeo {
  const fx = sx(from[0]),
    fy = sy(from[1])
  const tx = sx(to[0]),
    ty = sy(to[1])
  const dx = tx - fx,
    dy = ty - fy
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return { x1: fx, y1: fy, x2: tx, y2: ty, head: '' }
  const nx = dx / len,
    ny = dy / len
  const px = -ny,
    py = nx
  const bx = tx - nx * headSize,
    by = ty - ny * headSize
  const w = headSize * 0.42
  return {
    x1: fx,
    y1: fy,
    x2: bx,
    y2: by,
    head: `${tx},${ty} ${bx + px * w},${by + py * w} ${bx - px * w},${by - py * w}`,
  }
}

// ── Grid ────────────────────────────────────────────────────────
const gridXs = [0, 1, 2, 3]
const gridYs = [0, 1, 2, 3]

// ── Basis & target arrows ───────────────────────────────────────
const w1Arrow = computed(() => arrowGeo([0, 0], props.preset.w1, 11))
const w2Arrow = computed(() => arrowGeo([0, 0], props.preset.w2, 11))
const targetArrow = computed(() => arrowGeo([0, 0], props.preset.target, 13))

// ── Component vectors ───────────────────────────────────────────
const comp1 = computed<Vec2>(() => scale(props.preset.w1, props.preset.c1))
const comp2 = computed<Vec2>(() => scale(props.preset.w2, props.preset.c2))

// ── Decomposition arrows (parallelogram path) ──────────────────
const decompA1 = computed(() => arrowGeo([0, 0], comp1.value, 9))
const decompA2 = computed(() => arrowGeo(comp1.value, props.preset.target, 9))

// ── Projection points ──────────────────────────────────────────
const proj1 = computed<Vec2>(() => projectOnto(props.preset.target, props.preset.w1))
const proj2 = computed<Vec2>(() => projectOnto(props.preset.target, props.preset.w2))

// ── Naive projection (for arbitrary basis) ─────────────────────
const naiveCoeff1 = computed(() => dot(props.preset.target, props.preset.w1) / normSq(props.preset.w1))
const naiveCoeff2 = computed(() => dot(props.preset.target, props.preset.w2) / normSq(props.preset.w2))

// ── Axis extension lines ────────────────────────────────────────
function axisLine(w: Vec2) {
  const tVals: number[] = []
  if (w[0] !== 0) {
    tVals.push(X_MIN / w[0], X_MAX / w[0])
  }
  if (w[1] !== 0) {
    tVals.push(Y_MIN / w[1], Y_MAX / w[1])
  }
  if (tVals.length === 0) return { x1: ox, y1: oy, x2: ox, y2: oy }
  // Filter to values that keep point inside viewport
  const inside = (t: number) => {
    const px = t * w[0],
      py = t * w[1]
    return px >= X_MIN - 0.1 && px <= X_MAX + 0.1 && py >= Y_MIN - 0.1 && py <= Y_MAX + 0.1
  }
  const candidates = tVals.filter(inside)
  if (candidates.length < 2) {
    // Fallback: extend a reasonable range
    return {
      x1: sx(-2 * w[0]),
      y1: sy(-2 * w[1]),
      x2: sx(5 * w[0]),
      y2: sy(5 * w[1]),
    }
  }
  const tMin = Math.min(...candidates)
  const tMax = Math.max(...candidates)
  return {
    x1: sx(tMin * w[0]),
    y1: sy(tMin * w[1]),
    x2: sx(tMax * w[0]),
    y2: sy(tMax * w[1]),
  }
}

const w1Axis = computed(() => axisLine(props.preset.w1))
const w2Axis = computed(() => axisLine(props.preset.w2))

// ── Right-angle mark at projection foot ─────────────────────────
function rightAnglePath(foot: Vec2, axisDir: Vec2): string {
  const n = norm(axisDir)
  const dx = axisDir[0] / n,
    dy = axisDir[1] / n
  const px = -dy,
    py = dx
  const sz = 0.12
  const a: Vec2 = [foot[0] + dx * sz, foot[1] + dy * sz]
  const b: Vec2 = [a[0] + px * sz, a[1] + py * sz]
  const c: Vec2 = [foot[0] + px * sz, foot[1] + py * sz]
  return `M${sx(a[0])},${sy(a[1])} L${sx(b[0])},${sy(b[1])} L${sx(c[0])},${sy(c[1])}`
}

// ── Unit circle (orthonormal only) ──────────────────────────────
const unitCirclePath = computed(() => {
  const steps = 64
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps
    const cx = sx(Math.cos(angle))
    const cy = sy(Math.sin(angle))
    pts.push(`${i === 0 ? 'M' : 'L'}${cx},${cy}`)
  }
  return pts.join(' ') + ' Z'
})

// ── Label offsets ───────────────────────────────────────────────
function labelOffset(v: Vec2, base: number = 12): { dx: number; dy: number } {
  const angle = Math.atan2(v[1], v[0])
  return { dx: Math.cos(angle) * base + 4, dy: -Math.sin(angle) * base - 4 }
}

const w1Label = computed(() => labelOffset(props.preset.w1, 14))
const w2Label = computed(() => labelOffset(props.preset.w2, 14))

// ── Opacity helper ──────────────────────────────────────────────
function op(requiredStep: number): number {
  return props.step >= requiredStep ? 1 : 0
}

// ── Whether to show projections (orthogonal / orthonormal) ──────
const showProjections = computed(() => props.preset.type !== 'arbitrary')

// ── Decomposition label positions ───────────────────────────────
const comp1Mid = computed<Vec2>(() => midpoint([0, 0], comp1.value))
const comp2Mid = computed<Vec2>(() => midpoint(comp1.value, props.preset.target))
</script>

<template>
  <svg
    :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
    class="coord-viz"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- ═══ Grid ═══ -->
    <g class="grid-layer">
      <line
        v-for="x in gridXs"
        :key="'gx' + x"
        :x1="sx(x)"
        :y1="sy(Y_MIN)"
        :x2="sx(x)"
        :y2="sy(Y_MAX)"
        stroke="#e8e8e8"
        stroke-width="0.8"
      />
      <line
        v-for="y in gridYs"
        :key="'gy' + y"
        :x1="sx(X_MIN)"
        :y1="sy(y)"
        :x2="sx(X_MAX)"
        :y2="sy(y)"
        stroke="#e8e8e8"
        stroke-width="0.8"
      />
      <!-- Tick labels -->
      <template v-for="x in gridXs" :key="'tx' + x">
        <text
          v-if="x > 0"
          :x="sx(x)"
          :y="oy + 16"
          text-anchor="middle"
          fill="#aaa"
          font-size="11"
        >
          {{ x }}
        </text>
      </template>
      <template v-for="y in gridYs" :key="'ty' + y">
        <text
          v-if="y > 0"
          :x="ox - 12"
          :y="sy(y) + 4"
          text-anchor="end"
          fill="#aaa"
          font-size="11"
        >
          {{ y }}
        </text>
      </template>
    </g>

    <!-- ═══ Standard axes ═══ -->
    <g class="std-axes">
      <line
        :x1="sx(X_MIN)"
        :y1="oy"
        :x2="sx(X_MAX)"
        :y2="oy"
        stroke="#c0c0c0"
        stroke-width="1.2"
      />
      <line
        :x1="ox"
        :y1="sy(Y_MIN)"
        :x2="ox"
        :y2="sy(Y_MAX)"
        stroke="#c0c0c0"
        stroke-width="1.2"
      />
      <!-- Origin label -->
      <text :x="ox - 12" :y="oy + 16" fill="#aaa" font-size="11">0</text>
    </g>

    <!-- ═══ Basis axis extension lines (step ≥ 1) ═══ -->
    <g :style="{ opacity: op(1) }" class="fade">
      <line v-bind="w1Axis" stroke="var(--color-w1)" stroke-width="1" opacity="0.25" />
      <line v-bind="w2Axis" stroke="var(--color-w2)" stroke-width="1" opacity="0.25" />
    </g>

    <!-- ═══ Unit circle (orthonormal only, step ≥ 1) ═══ -->
    <path
      v-if="preset.type === 'orthonormal'"
      :d="unitCirclePath"
      fill="none"
      stroke="#94a3b8"
      stroke-width="1"
      stroke-dasharray="4 3"
      :style="{ opacity: op(1) * 0.4 }"
      class="fade"
    />

    <!-- ═══ Decomposition: parallelogram (arbitrary, step ≥ 3) ═══ -->
    <g v-if="preset.type === 'arbitrary'" :style="{ opacity: op(3) }" class="fade">
      <!-- Primary path: O → c1·w1 → x -->
      <line
        :x1="decompA1.x1"
        :y1="decompA1.y1"
        :x2="decompA1.x2"
        :y2="decompA1.y2"
        stroke="var(--color-w1)"
        stroke-width="2.2"
        stroke-dasharray="7 4"
        opacity="0.7"
      />
      <polygon :points="decompA1.head" fill="var(--color-w1)" opacity="0.7" />

      <line
        :x1="decompA2.x1"
        :y1="decompA2.y1"
        :x2="decompA2.x2"
        :y2="decompA2.y2"
        stroke="var(--color-w2)"
        stroke-width="2.2"
        stroke-dasharray="7 4"
        opacity="0.7"
      />
      <polygon :points="decompA2.head" fill="var(--color-w2)" opacity="0.7" />

      <!-- Ghost sides: O → c2·w2, c2·w2 → x -->
      <line
        :x1="sx(0)"
        :y1="sy(0)"
        :x2="sx(comp2[0])"
        :y2="sy(comp2[1])"
        stroke="var(--color-w2)"
        stroke-width="1"
        stroke-dasharray="3 3"
        opacity="0.2"
      />
      <line
        :x1="sx(comp2[0])"
        :y1="sy(comp2[1])"
        :x2="sx(preset.target[0])"
        :y2="sy(preset.target[1])"
        stroke="var(--color-w1)"
        stroke-width="1"
        stroke-dasharray="3 3"
        opacity="0.2"
      />

      <!-- Component labels -->
      <text
        :x="sx(comp1Mid[0]) - 6"
        :y="sy(comp1Mid[1]) - 10"
        fill="var(--color-w1)"
        font-size="12"
        font-weight="600"
      >
        c₁w₁
      </text>
      <text
        :x="sx(comp2Mid[0]) + 8"
        :y="sy(comp2Mid[1]) + 4"
        fill="var(--color-w2)"
        font-size="12"
        font-weight="600"
      >
        c₂w₂
      </text>
    </g>

    <!-- ═══ Naive projection (arbitrary, toggled, step ≥ 3) ═══ -->
    <g
      v-if="preset.type === 'arbitrary' && showNaiveProjection"
      :style="{ opacity: op(3) }"
      class="fade"
    >
      <!-- Perpendicular from x to w1 axis -->
      <line
        :x1="sx(preset.target[0])"
        :y1="sy(preset.target[1])"
        :x2="sx(proj1[0])"
        :y2="sy(proj1[1])"
        stroke="var(--color-naive)"
        stroke-width="1.5"
        stroke-dasharray="5 3"
        opacity="0.7"
      />
      <circle :cx="sx(proj1[0])" :cy="sy(proj1[1])" r="3.5" fill="var(--color-naive)" />
      <text
        :x="sx(proj1[0]) + 8"
        :y="sy(proj1[1]) + 18"
        fill="var(--color-naive)"
        font-size="11"
        font-weight="600"
      >
        ✗ {{ naiveCoeff1.toFixed(2) }} ≠ {{ preset.c1.toFixed(2) }}
      </text>

      <!-- Perpendicular from x to w2 axis -->
      <line
        :x1="sx(preset.target[0])"
        :y1="sy(preset.target[1])"
        :x2="sx(proj2[0])"
        :y2="sy(proj2[1])"
        stroke="var(--color-naive)"
        stroke-width="1.5"
        stroke-dasharray="5 3"
        opacity="0.7"
      />
      <circle :cx="sx(proj2[0])" :cy="sy(proj2[1])" r="3.5" fill="var(--color-naive)" />
      <text
        :x="sx(proj2[0]) - 8"
        :y="sy(proj2[1]) - 10"
        fill="var(--color-naive)"
        font-size="11"
        font-weight="600"
        text-anchor="end"
      >
        ✗ {{ naiveCoeff2.toFixed(2) }} ≠ {{ preset.c2.toFixed(2) }}
      </text>
    </g>

    <!-- ═══ Projections (orthogonal / orthonormal, step ≥ 3) ═══ -->
    <g v-if="showProjections" :style="{ opacity: op(3) }" class="fade">
      <!-- Projection onto w1 -->
      <!-- Perpendicular dashed line from x to P1 -->
      <line
        :x1="sx(preset.target[0])"
        :y1="sy(preset.target[1])"
        :x2="sx(proj1[0])"
        :y2="sy(proj1[1])"
        stroke="var(--color-w1)"
        stroke-width="1.3"
        stroke-dasharray="5 3"
        opacity="0.5"
      />
      <!-- Projected segment O → P1 -->
      <line
        :x1="ox"
        :y1="oy"
        :x2="sx(proj1[0])"
        :y2="sy(proj1[1])"
        stroke="var(--color-w1)"
        stroke-width="3.5"
        opacity="0.55"
        stroke-linecap="round"
      />
      <!-- Right angle mark -->
      <path
        :d="rightAnglePath(proj1, preset.w1)"
        fill="none"
        stroke="var(--color-w1)"
        stroke-width="1"
        opacity="0.5"
      />
      <!-- P1 dot -->
      <circle :cx="sx(proj1[0])" :cy="sy(proj1[1])" r="3" fill="var(--color-w1)" />

      <!-- Projection onto w2 -->
      <line
        :x1="sx(preset.target[0])"
        :y1="sy(preset.target[1])"
        :x2="sx(proj2[0])"
        :y2="sy(proj2[1])"
        stroke="var(--color-w2)"
        stroke-width="1.3"
        stroke-dasharray="5 3"
        opacity="0.5"
      />
      <line
        :x1="ox"
        :y1="oy"
        :x2="sx(proj2[0])"
        :y2="sy(proj2[1])"
        stroke="var(--color-w2)"
        stroke-width="3.5"
        opacity="0.55"
        stroke-linecap="round"
      />
      <path
        :d="rightAnglePath(proj2, preset.w2)"
        fill="none"
        stroke="var(--color-w2)"
        stroke-width="1"
        opacity="0.5"
      />
      <circle :cx="sx(proj2[0])" :cy="sy(proj2[1])" r="3" fill="var(--color-w2)" />

      <!-- Coefficient labels near projections -->
      <text
        :x="sx(proj1[0]) + 6"
        :y="sy(proj1[1]) + 18"
        fill="var(--color-w1)"
        font-size="12"
        font-weight="600"
      >
        c₁ = {{ preset.c1.toFixed(2) }}
      </text>
      <text
        :x="sx(proj2[0]) - 8"
        :y="sy(proj2[1]) - 8"
        fill="var(--color-w2)"
        font-size="12"
        font-weight="600"
        text-anchor="end"
      >
        c₂ = {{ preset.c2.toFixed(2) }}
      </text>
    </g>

    <!-- ═══ Basis vectors (step ≥ 1) ═══ -->
    <g :style="{ opacity: op(1) }" class="fade">
      <!-- w1 -->
      <line
        :x1="w1Arrow.x1"
        :y1="w1Arrow.y1"
        :x2="w1Arrow.x2"
        :y2="w1Arrow.y2"
        stroke="var(--color-w1)"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <polygon :points="w1Arrow.head" fill="var(--color-w1)" />
      <text
        :x="sx(preset.w1[0]) + w1Label.dx"
        :y="sy(preset.w1[1]) + w1Label.dy"
        fill="var(--color-w1)"
        font-size="14"
        font-weight="700"
      >
        w₁
      </text>

      <!-- w2 -->
      <line
        :x1="w2Arrow.x1"
        :y1="w2Arrow.y1"
        :x2="w2Arrow.x2"
        :y2="w2Arrow.y2"
        stroke="var(--color-w2)"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <polygon :points="w2Arrow.head" fill="var(--color-w2)" />
      <text
        :x="sx(preset.w2[0]) + w2Label.dx"
        :y="sy(preset.w2[1]) + w2Label.dy"
        fill="var(--color-w2)"
        font-size="14"
        font-weight="700"
      >
        w₂
      </text>
    </g>

    <!-- ═══ Target vector (step ≥ 2) ═══ -->
    <g :style="{ opacity: op(2) }" class="fade">
      <line
        :x1="targetArrow.x1"
        :y1="targetArrow.y1"
        :x2="targetArrow.x2"
        :y2="targetArrow.y2"
        stroke="var(--color-target)"
        stroke-width="3"
        stroke-linecap="round"
      />
      <polygon :points="targetArrow.head" fill="var(--color-target)" />
      <text
        :x="sx(preset.target[0]) + 10"
        :y="sy(preset.target[1]) - 10"
        fill="var(--color-target)"
        font-size="15"
        font-weight="700"
      >
        x
      </text>
    </g>
  </svg>
</template>

<style scoped>
.coord-viz {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  background: #fdfdfd;
}

text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  pointer-events: none;
}
</style>
