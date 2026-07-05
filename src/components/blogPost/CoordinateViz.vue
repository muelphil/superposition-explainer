<script setup lang="ts">
import { inject, computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { BasesServiceType } from '../../services/BasesService'
import { BASIS_CONFIGS, type CoordinateStage } from '../../services/BasesService'
import {
  scale, add, dot, norm, normSq, normalize, projectOnto, solve2x2,
  type Vec2,
} from '../../utils/linearAlgebra2d'
import { featureColor, EMBEDDING_POINT_COLOR } from '../../utils/featureColor'
import { TaskEventBus, TASK_EVENT_BUS_KEY } from './taskSystem'

const svc = inject<BasesServiceType>('basesService')!
// Optional — only provided when a task list is active in this section
const eventBus = inject<TaskEventBus>(TASK_EVENT_BUS_KEY, new TaskEventBus())

// ── SVG coordinate mapping ──────────────────────────────────────────────────

const X_MIN = -0.8
const X_MAX = 3.2
const Y_MIN = -1.05
const Y_MAX = 2.35
const SVG_W = 500
const SCALE = SVG_W / (X_MAX - X_MIN)  // uniform scale — equal axis lengths
const SVG_H = (Y_MAX - Y_MIN) * SCALE

function sx(x: number): number { return (x - X_MIN) * SCALE }
function sy(y: number): number { return SVG_H - (y - Y_MIN) * SCALE }

const ox = sx(0)
const oy = sy(0)

// ── Style constants (matching EmbeddingView) ────────────────────────────────

const AXIS_COLOR = '#d1d5db'

const W1_COLOR = featureColor(0, 2)
const W2_COLOR = featureColor(1, 2)

const LABEL_COLOR = '#374151'
const NAIVE_COLOR = '#ef4444'
const AXIS_OPACITY = 0.55
const GRID_OPACITY = 0.4

// ── Vec2 tweening ───────────────────────────────────────────────────────────

const tweenFrames = new Map<Ref<Vec2>, number>()

function tweenVec2(target: Ref<Vec2>, to: Vec2, dur = 600) {
  const prev = tweenFrames.get(target)
  if (prev) cancelAnimationFrame(prev)

  const from: Vec2 = [...target.value] as Vec2
  const start = performance.now()

  function tick(now: number) {
    const t = Math.min(1, (now - start) / dur)
    const e = 1 - (1 - t) ** 3  // ease-out cubic
    target.value = [
      from[0] + (to[0] - from[0]) * e,
      from[1] + (to[1] - from[1]) * e,
    ]
    if (t < 1) {
      tweenFrames.set(target, requestAnimationFrame(tick))
    } else {
      tweenFrames.delete(target)
    }
  }
  tweenFrames.set(target, requestAnimationFrame(tick))
}

// ── Reactive basis config ───────────────────────────────────────────────────

const stage = computed<CoordinateStage>(() => svc.coordinateStage.value)
const cfg = computed(() => BASIS_CONFIGS[stage.value])

// Animated vector refs — initialize from current stage (component may mount mid-scroll)
const animW1 = ref<Vec2>([...cfg.value.w1] as Vec2)
const animW2 = ref<Vec2>([...cfg.value.w2] as Vec2)

watch(stage, (s) => {
  const c = BASIS_CONFIGS[s]
  tweenVec2(animW1, c.w1)
  tweenVec2(animW2, c.w2)
})

// Drag offset for interactive embedding movement
const dragOffset = ref<Vec2 | null>(null)
const isDragging = ref(false)

const target = computed<Vec2>(() => {
  if (dragOffset.value && dragEnabled.value) {
    return add(cfg.value.target, dragOffset.value)
  }
  return cfg.value.target
})

const w1 = computed(() => animW1.value)
const w2 = computed(() => animW2.value)

// ── Derived values ──────────────────────────────────────────────────────────

const coeffs = computed<Vec2>(() => solve2x2(w1.value, w2.value, target.value))
const c1 = computed(() => coeffs.value[0])
const c2 = computed(() => coeffs.value[1])

const naiveC1 = computed(() => dot(target.value, w1.value) / normSq(w1.value))
const naiveC2 = computed(() => dot(target.value, w2.value) / normSq(w2.value))

const proj1 = computed<Vec2>(() => projectOnto(target.value, w1.value))
const proj2 = computed<Vec2>(() => projectOnto(target.value, w2.value))

// ── Arrow geometry ──────────────────────────────────────────────────────────

interface ArrowGeo {
  x1: number; y1: number; x2: number; y2: number; head: string
}

function arrowGeo(from: Vec2, to: Vec2, headSize = 10): ArrowGeo {
  const fx = sx(from[0]), fy = sy(from[1])
  const tx = sx(to[0]), ty = sy(to[1])
  const dx = tx - fx, dy = ty - fy
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return { x1: fx, y1: fy, x2: tx, y2: ty, head: '' }
  const nx = dx / len, ny = dy / len
  const px = -ny, py = nx
  const bx = tx - nx * headSize, by = ty - ny * headSize
  const hw = headSize * 0.42
  return {
    x1: fx, y1: fy, x2: bx, y2: by,
    head: `${tx},${ty} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}`,
  }
}

const w1Arrow = computed(() => arrowGeo([0, 0], w1.value))
const w2Arrow = computed(() => arrowGeo([0, 0], w2.value))

// ── Skewed grid lines ───────────────────────────────────────────────────────

function gridLines(parallel: Vec2, step: Vec2, range: number[]) {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  const n = normalize(parallel)
  for (const k of range) {
    const origin: Vec2 = scale(step, k)
    const tVals: number[] = []
    if (n[0] !== 0) tVals.push((X_MIN - origin[0]) / n[0], (X_MAX - origin[0]) / n[0])
    if (n[1] !== 0) tVals.push((Y_MIN - origin[1]) / n[1], (Y_MAX - origin[1]) / n[1])
    if (tVals.length < 2) continue
    const tMin = Math.min(...tVals), tMax = Math.max(...tVals)
    const p1: Vec2 = add(origin, scale(n, tMin))
    const p2: Vec2 = add(origin, scale(n, tMax))
    lines.push({ x1: sx(p1[0]), y1: sy(p1[1]), x2: sx(p2[0]), y2: sy(p2[1]) })
  }
  return lines
}

const gridRange = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
const w1GridLines = computed(() => gridLines(w1.value, w2.value, gridRange))
const w2GridLines = computed(() => gridLines(w2.value, w1.value, gridRange))

// ── Axis extension lines ────────────────────────────────────────────────────

function axisLine(w: Vec2) {
  const n = normalize(w)
  const tVals: number[] = []
  if (n[0] !== 0) tVals.push(X_MIN / n[0], X_MAX / n[0])
  if (n[1] !== 0) tVals.push(Y_MIN / n[1], Y_MAX / n[1])
  if (tVals.length < 2) return { x1: ox, y1: oy, x2: ox, y2: oy }
  const cands = tVals.filter(t => {
    const px = t * n[0], py = t * n[1]
    return px >= X_MIN - 0.3 && px <= X_MAX + 0.3 && py >= Y_MIN - 0.3 && py <= Y_MAX + 0.3
  })
  if (cands.length < 2) return { x1: ox, y1: oy, x2: ox, y2: oy }
  const tMin = Math.min(...cands), tMax = Math.max(...cands)
  return { x1: sx(tMin * n[0]), y1: sy(tMin * n[1]), x2: sx(tMax * n[0]), y2: sy(tMax * n[1]) }
}

/** A full viewport-clipped line through an arbitrary origin point, parallel to dir. */
function lineThrough(origin: Vec2, dir: Vec2) {
  const n = normalize(dir)
  const tVals: number[] = []
  if (n[0] !== 0) tVals.push((X_MIN - origin[0]) / n[0], (X_MAX - origin[0]) / n[0])
  if (n[1] !== 0) tVals.push((Y_MIN - origin[1]) / n[1], (Y_MAX - origin[1]) / n[1])
  if (tVals.length < 2) return { x1: sx(origin[0]), y1: sy(origin[1]), x2: sx(origin[0]), y2: sy(origin[1]) }
  const tMin = Math.min(...tVals), tMax = Math.max(...tVals)
  const p1: Vec2 = add(origin, scale(n, tMin))
  const p2: Vec2 = add(origin, scale(n, tMax))
  return { x1: sx(p1[0]), y1: sy(p1[1]), x2: sx(p2[0]), y2: sy(p2[1]) }
}

const w1Axis = computed(() => axisLine(w1.value))
const w2Axis = computed(() => axisLine(w2.value))

// ── Right-angle mark ────────────────────────────────────────────────────────

/**
 * Draws a right-angle marker at `foot` between the axis line (direction `axisDir`)
 * and a perpendicular line. The `quadrant` parameter (0-3) controls the position:
 *   bit 0 (along axis):    0 = positive direction, 1 = negative direction
 *   bit 1 (perpendicular): 0 = CCW, 1 = CW
 *   quadrant 0: +axis, CCW perp
 *   quadrant 1: +axis, CW perp
 *   quadrant 2: -axis, CCW perp
 *   quadrant 3: -axis, CW perp
 */
function rightAnglePath(foot: Vec2, axisDir: Vec2, quadrant: number): string {
  const n = norm(axisDir)
  if (n < 0.001) return ''
  const ux = axisDir[0] / n, uy = axisDir[1] / n
  const axisSign = (quadrant & 2) ? -1 : 1
  const perpSign = (quadrant & 1) ? -1 : 1
  let dx = ux * axisSign
  const px = -uy * perpSign, py = ux * perpSign
  const sz = 0.12
  const a: Vec2 = [foot[0] + dx * sz, foot[1] + uy * axisSign * sz]
  const b: Vec2 = [a[0] + px * sz, a[1] + py * sz]
  const c: Vec2 = [foot[0] + px * sz, foot[1] + py * sz]
  return `M${sx(a[0])},${sy(a[1])} L${sx(b[0])},${sy(b[1])} L${sx(c[0])},${sy(c[1])}`
}

// Right angle at origin between w₁ and w₂ (visible when orthogonal/orthonormal)
const originRightAngle = computed(() => {
  if (isArbitrary.value) return ''
  const w1n = normalize(w1.value)
  const w2n = normalize(w2.value)
  const sz = 0.15
  const a: Vec2 = [w1n[0] * sz, w1n[1] * sz]
  const b: Vec2 = [a[0] + w2n[0] * sz, a[1] + w2n[1] * sz]
  const c: Vec2 = [w2n[0] * sz, w2n[1] * sz]
  return `M${sx(a[0])},${sy(a[1])} L${sx(b[0])},${sy(b[1])} L${sx(c[0])},${sy(c[1])}`
})

// ── Unit circle (orthonormal) ───────────────────────────────────────────────

const unitCirclePath = computed(() => {
  const steps = 64
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps
    pts.push(`${i === 0 ? 'M' : 'L'}${sx(Math.cos(angle))},${sy(Math.sin(angle))}`)
  }
  return pts.join(' ') + ' Z'
})

// ── Standard grid ticks ─────────────────────────────────────────────────────

const stdGridXs = computed(() => {
  const xs: number[] = []
  for (let x = Math.ceil(X_MIN); x <= Math.floor(X_MAX); x++) xs.push(x)
  return xs
})
const stdGridYs = computed(() => {
  const ys: number[] = []
  for (let y = Math.ceil(Y_MIN); y <= Math.floor(Y_MAX); y++) ys.push(y)
  return ys
})

// ── Sub-stage & visibility ───────────────────────────────────────────────────

const subStage = computed(() => svc.coordinateSubStage.value)

const isArbitrary = computed(() => stage.value === 'arbitrary')
const isOrthogonal = computed(() => stage.value === 'orthogonal')
const isOrthonormal = computed(() => stage.value === 'orthonormal')

// Naive projection lines: only in arbitrary mode, sub-stage ≥ 1
const showNaiveProjection = computed(() => isArbitrary.value && subStage.value >= 1)

// Drag: only in arbitrary mode, sub-stage ≥ 1 (projection visible so user sees interference)
const dragEnabled = computed(() => isArbitrary.value && subStage.value >= 1)

// ── Label positions (in SVG px) ─────────────────────────────────────────────

function labelPct(v: Vec2, offX = 8, offY = -10) {
  const lx = ((sx(v[0]) + offX) / SVG_W) * 100
  const ly = ((sy(v[1]) + offY) / SVG_H) * 100
  return { left: `${lx}%`, top: `${ly}%` }
}

const w1LabelStyle = computed(() => {
  const v = w1.value
  const angle = Math.atan2(v[1], v[0])
  const lx = (sx(v[0]) + Math.cos(angle) * 16) / SVG_W * 100
  const ly = (sy(v[1]) - Math.sin(angle) * 16 - 18) / SVG_H * 100
  return { left: `${lx}%`, top: `${ly}%` }
})
const w2LabelStyle = computed(() => {
  const v = w2.value
  const angle = Math.atan2(v[1], v[0])
  const lx = (sx(v[0]) + Math.cos(angle) * 16) / SVG_W * 100
  const ly = (sy(v[1]) - Math.sin(angle) * 16 - 18) / SVG_H * 100
  return { left: `${lx}%`, top: `${ly}%` }
})
const yLabelStyle = computed(() => labelPct(target.value, 14, -22))

// Guide line through the base target position along w₂ — visible while dragging
const dragGuideLine = computed(() => {
  if (!isDragging.value || !dragEnabled.value) return null
  return lineThrough(cfg.value.target, animW2.value)
})

const svgRef = ref<SVGSVGElement | null>(null)
let dragging = false
let dragStart: Vec2 = [0, 0]

function toMathCoords(clientX: number, clientY: number): Vec2 | null {
  if (!svgRef.value) return null
  const rect = svgRef.value.getBoundingClientRect()
  const svgX = (clientX - rect.left) / rect.width * SVG_W
  const svgY = (clientY - rect.top) / rect.height * SVG_H
  return [svgX / SCALE + X_MIN, (SVG_H - svgY) / SCALE + Y_MIN]
}

function onPointerDown(e: PointerEvent) {
  if (!dragEnabled.value) return
  const m = toMathCoords(e.clientX, e.clientY)
  if (!m) return
  const t = target.value
  if (Math.sqrt((m[0] - t[0]) ** 2 + (m[1] - t[1]) ** 2) > 0.5) return
  dragging = true
  isDragging.value = true
  dragStart = m
  eventBus.emit('drag-embedding')
  ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  const m = toMathCoords(e.clientX, e.clientY)
  if (!m) return
  // Project displacement onto w2 direction
  const delta: Vec2 = [m[0] - dragStart[0], m[1] - dragStart[1]]
  const w = animW2.value
  const t = dot(delta, w) / normSq(w)
  dragOffset.value = scale(w, t)
}

function onPointerUp() {
  if (!dragging) return
  dragging = false
  isDragging.value = false
  dragOffset.value = null
}

onMounted(() => { window.addEventListener('pointerup', onPointerUp) })
onUnmounted(() => {
  window.removeEventListener('pointerup', onPointerUp)
  tweenFrames.forEach(id => cancelAnimationFrame(id))
  tweenFrames.clear()
})

// ── Math panel content (sub-stage aware) ────────────────────────────────────

const gramExpression = computed(() => {
  // For vectors-only sub-stage in arbitrary, show just the W matrix
  if (isArbitrary.value && subStage.value === 0) {
    const w1v = w1.value, w2v = w2.value
    const fmt = (v: number) => {
      if (Math.abs(v) < 0.0005) return '0'
      if (Number.isInteger(v)) return v.toString()
      return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
    }
    return `W = \\begin{bmatrix} ${fmt(w1v[0])} & ${fmt(w2v[0])} \\\\ ${fmt(w1v[1])} & ${fmt(w2v[1])} \\end{bmatrix}`
  }

  const w1v = w1.value, w2v = w2.value
  const a11 = dot(w1v, w1v), a12 = dot(w1v, w2v)
  const a21 = dot(w2v, w1v), a22 = dot(w2v, w2v)
  const fmt = (v: number) => {
    if (Math.abs(v) < 0.0005) return '0'
    if (Number.isInteger(v)) return v.toString()
    return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  }
  return `W^T W = \\begin{bmatrix} ${fmt(a11)} & ${fmt(a12)} \\\\ ${fmt(a21)} & ${fmt(a22)} \\end{bmatrix}`
})

const recoveryExpression = computed(() => {
  if (isArbitrary.value && subStage.value === 0) {
    return `y = Wx = x_1 w_1 + x_2 w_2`
  }
  if (isOrthonormal.value) return `W^T y = x`
  if (isOrthogonal.value) return `x_i = \\frac{y \\cdot w_i}{\\|w_i\\|^2}`
  return `\\hat{x} = W^T y \\neq x \\quad (\\text{interference})`
})
</script>

<template>
  <div class="coord-viz-container">
    <!-- SVG + label overlay wrapper -->
    <div class="svg-wrapper">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
        class="coord-svg"
        @pointermove="onPointerMove"
      >
        <defs>
          <clipPath id="coord-clip">
            <rect x="0" y="0" :width="SVG_W" :height="SVG_H" />
          </clipPath>
        </defs>

        <!-- ═══ Standard grid ═══ -->
        <g :opacity="0.3">
          <line
            v-for="x in stdGridXs" :key="'gx' + x"
            :x1="sx(x)" :y1="0" :x2="sx(x)" :y2="SVG_H"
            :stroke="AXIS_COLOR" stroke-width="0.5"
          />
          <line
            v-for="y in stdGridYs" :key="'gy' + y"
            :x1="0" :y1="sy(y)" :x2="SVG_W" :y2="sy(y)"
            :stroke="AXIS_COLOR" stroke-width="0.5"
          />
        </g>

        <!-- ═══ Standard axes ═══ -->
        <g :opacity="AXIS_OPACITY">
          <line :x1="0" :y1="oy" :x2="SVG_W" :y2="oy" :stroke="AXIS_COLOR" stroke-width="1.2" />
          <line :x1="ox" :y1="0" :x2="ox" :y2="SVG_H" :stroke="AXIS_COLOR" stroke-width="1.2" />
          <template v-for="x in stdGridXs" :key="'tx' + x">
            <text v-if="x !== 0" :x="sx(x)" :y="oy + 14" text-anchor="middle" :fill="AXIS_COLOR" font-size="10">{{ x }}</text>
          </template>
          <template v-for="y in stdGridYs" :key="'ty' + y">
            <text v-if="y !== 0" :x="ox - 8" :y="sy(y) + 4" text-anchor="end" :fill="AXIS_COLOR" font-size="10">{{ y }}</text>
          </template>
        </g>

        <!-- ═══ Skewed grid (clipped) ═══ -->
        <g clip-path="url(#coord-clip)">
          <line
            v-for="(l, i) in w1GridLines" :key="'g1-' + i"
            :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
            :stroke="W1_COLOR" :opacity="GRID_OPACITY" stroke-width="0.8"
          />
          <line
            v-for="(l, i) in w2GridLines" :key="'g2-' + i"
            :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
            :stroke="W2_COLOR" :opacity="GRID_OPACITY" stroke-width="0.8"
          />
        </g>

        <!-- ═══ Axis extensions ═══ -->
        <line v-bind="w1Axis" :stroke="W1_COLOR" stroke-width="0.8" opacity="0.18" />
        <line v-bind="w2Axis" :stroke="W2_COLOR" stroke-width="0.8" opacity="0.18" />

        <!-- ═══ Unit circle (orthonormal) ═══ -->
        <path
          :d="unitCirclePath"
          fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"
          :opacity="isOrthonormal ? 0.4 : 0"
          class="fade-transition"
        />

        <!-- ═══ Right angle at origin (orthogonal/orthonormal) ═══ -->
        <path
          v-if="originRightAngle"
          :d="originRightAngle"
          fill="none" :stroke="LABEL_COLOR" stroke-width="1.2"
          :opacity="isArbitrary ? 0 : 0.6"
          class="fade-transition"
        />

        <!-- ═══ Drag guide line (visible while dragging) ═══ -->
        <line
          v-if="dragGuideLine"
          :x1="dragGuideLine.x1" :y1="dragGuideLine.y1"
          :x2="dragGuideLine.x2" :y2="dragGuideLine.y2"
          :stroke="W2_COLOR" stroke-width="2" stroke-dasharray="8 5" opacity="0.5"
        />

        <!-- ═══ Naive projection (arbitrary, sub-stage ≥ 1) ═══ -->
        <g :opacity="showNaiveProjection ? 0.65 : 0" class="fade-transition">
          <line
            :x1="sx(target[0])" :y1="sy(target[1])"
            :x2="sx(proj1[0])" :y2="sy(proj1[1])"
            :stroke="NAIVE_COLOR" stroke-width="1.2" stroke-dasharray="4 3"
          />
          <circle :cx="sx(proj1[0])" :cy="sy(proj1[1])" r="3" :fill="NAIVE_COLOR" />
          <line
            :x1="sx(target[0])" :y1="sy(target[1])"
            :x2="sx(proj2[0])" :y2="sy(proj2[1])"
            :stroke="NAIVE_COLOR" stroke-width="1.2" stroke-dasharray="4 3"
          />
          <circle :cx="sx(proj2[0])" :cy="sy(proj2[1])" r="3" :fill="NAIVE_COLOR" />
        </g>

        <!-- ═══ Clean projection (orthogonal/orthonormal) — always rendered ═══ -->
        <g :opacity="isArbitrary ? 0 : 0.55" class="fade-transition">
          <!-- Projection onto w1 -->
          <line
            :x1="sx(target[0])" :y1="sy(target[1])"
            :x2="sx(proj1[0])" :y2="sy(proj1[1])"
            :stroke="W1_COLOR" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"
          />
          <line
            :x1="ox" :y1="oy" :x2="sx(proj1[0])" :y2="sy(proj1[1])"
            :stroke="W1_COLOR" stroke-width="2.5" opacity="0.5" stroke-linecap="round"
          />
          <path :d="rightAnglePath(proj1, w1, 1)" fill="none" :stroke="W1_COLOR" stroke-width="1" />
          <circle :cx="sx(proj1[0])" :cy="sy(proj1[1])" r="2.5" :fill="W1_COLOR" />
          <!-- Projection onto w2 -->
          <line
            :x1="sx(target[0])" :y1="sy(target[1])"
            :x2="sx(proj2[0])" :y2="sy(proj2[1])"
            :stroke="W2_COLOR" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"
          />
          <line
            :x1="ox" :y1="oy" :x2="sx(proj2[0])" :y2="sy(proj2[1])"
            :stroke="W2_COLOR" stroke-width="2.5" opacity="0.5" stroke-linecap="round"
          />
          <path :d="rightAnglePath(proj2, w2, 2)" fill="none" :stroke="W2_COLOR" stroke-width="1" />
          <circle :cx="sx(proj2[0])" :cy="sy(proj2[1])" r="2.5" :fill="W2_COLOR" />
        </g>

        <!-- ═══ Basis vectors ═══ -->
        <g>
          <line
            :x1="w1Arrow.x1" :y1="w1Arrow.y1" :x2="w1Arrow.x2" :y2="w1Arrow.y2"
            :stroke="W1_COLOR" stroke-width="2.5" stroke-linecap="round"
          />
          <polygon v-if="w1Arrow.head" :points="w1Arrow.head" :fill="W1_COLOR" />

          <line
            :x1="w2Arrow.x1" :y1="w2Arrow.y1" :x2="w2Arrow.x2" :y2="w2Arrow.y2"
            :stroke="W2_COLOR" stroke-width="2.5" stroke-linecap="round"
          />
          <polygon v-if="w2Arrow.head" :points="w2Arrow.head" :fill="W2_COLOR" />
        </g>

        <!-- ═══ Embedding dot (+ invisible hit area for drag) ═══ -->
        <circle
          :cx="sx(target[0])" :cy="sy(target[1])" r="16"
          fill="transparent"
          :style="{ cursor: dragEnabled ? 'grab' : 'default' }"
          @pointerdown="onPointerDown"
        />
        <circle
          :cx="sx(target[0])" :cy="sy(target[1])" r="5.5"
          :fill="EMBEDDING_POINT_COLOR"
          :stroke="dragEnabled ? '#fff' : 'none'" :stroke-width="dragEnabled ? 1.5 : 0"
          class="embedding-dot"
          :class="{ 'embedding-dot--drag': dragEnabled }"
          style="pointer-events: none"
        />
      </svg>

      <!-- ═══ KaTeX label overlay ═══ -->
      <div class="label-overlay">
        <div class="svg-label" :style="w1LabelStyle">
          <katex-element expression="w_1" />
        </div>
        <div class="svg-label" :style="w2LabelStyle">
          <katex-element expression="w_2" />
        </div>
        <div class="svg-label" :style="yLabelStyle">
          <katex-element expression="y" />
        </div>
      </div>
    </div>

    <!-- ═══ Math panel ═══ -->
    <div class="math-panel">
      <div class="gram-display">
        <katex-element :display-mode="true" :expression="gramExpression" />
      </div>
      <div class="recovery-display">
        <katex-element :expression="recoveryExpression" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.coord-viz-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 80%;
}

.svg-wrapper {
  position: relative;
  font-size: 1em;
}

.coord-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.fade-transition {
  transition: opacity 0.5s ease;
}

/* KaTeX label overlay — positioned over SVG */
.label-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.svg-label {
  position: absolute;
  color: var(--color-text-primary);
  font-size: 0.85em;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

/* Math panel */
.math-panel {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  text-align: center;
}

.gram-display {
  margin-bottom: 0.25rem;
}

.recovery-display {
  color: var(--color-text-secondary);
  font-size: 0.9em;
}

/* SVG text (tick labels only) */
svg text {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  pointer-events: none;
  user-select: none;
}

@keyframes embedding-dot-pulse {
  0%, 100% {
    r: 5.5;
    stroke-opacity: 1;
  }
  50% {
    r: 7;
    stroke-opacity: 0.4;
  }
}

.embedding-dot--drag {
  animation: embedding-dot-pulse 2s ease-in-out infinite;
  stroke: none;
}

@media (max-width: 768px) {
  .coord-viz-container {
    width: 100%;
  }

  .svg-wrapper {
    font-size: 1.2em;
  }

  .gram-display :deep(.katex) {
    font-size: 0.85em !important;
  }

  .recovery-display :deep(.katex) {
    font-size: 0.85em !important;
  }
}
</style>
