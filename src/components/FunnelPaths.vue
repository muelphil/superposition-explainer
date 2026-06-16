<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const vectorElRef = ref<HTMLDivElement | null>(null)
const featuresElRef = ref<HTMLDivElement | null>(null)

const arrowPaths = ref<{ d: string; startX: number; endX: number; isAccent: boolean }[]>([])
const funnelFillPath = ref('')

// How many pixels the line stays horizontal on the outgoing (feature) side
// and the ingoing (vector) side before/after curving.
const HORIZONTAL_OUT_PIXELS = 100
const HORIZONTAL_IN_PIXELS = 100

function makeCubicBezierPath(startX: number, startY: number, endX: number, endY: number): {
  d: string;
  c1x: number; c1y: number; c2x: number; c2y: number
} {
  const c1x = startX - HORIZONTAL_OUT_PIXELS
  const c2x = endX + HORIZONTAL_IN_PIXELS
  const c1y = startY
  const c2y = endY
  const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`
  return { d, c1x, c1y, c2x, c2y }
}

function computePaths() {
  const container = containerRef.value
  const svg = svgRef.value
  if (!container || !svg) return

  const containerRect = container.getBoundingClientRect()

  // Vector position
  const katex = vectorElRef.value?.querySelector('.katex') as HTMLElement | null
  if (!katex) return

  const vRect = katex.getBoundingClientRect()
  const vecRight = vRect.right - containerRect.left + 15
  const vecCenterY = (vRect.top + vRect.bottom) / 2 - containerRect.top
  const vecHalfH = vRect.height / 2
  const targetHalfH = vecHalfH * 0.33

  // Feature row positions
  const rows = featuresElRef.value?.querySelectorAll<HTMLElement>('.feature-row')
  if (!rows || rows.length === 0) return

  interface RowData {
    startX: number
    startY: number
  }

  const rowPositions: RowData[] = []
  rows.forEach((row) => {
    const r = row.getBoundingClientRect()
    rowPositions.push({
      startX: r.left - containerRect.left,
      startY: (r.top + r.bottom) / 2 - containerRect.top,
    })
  })

  const count = Math.min(rowPositions.length, 22)

  // Compute accent indices: 0, n-1, floor(n/3), floor(2n/3) — use Set for uniqueness
  const accentIndices = new Set<number>()
  accentIndices.add(0)
  accentIndices.add(count - 1)
  accentIndices.add(Math.floor(count / 3))
  accentIndices.add(Math.floor((2 * count) / 3))

  // Map row Y spread to target Y spread
  const targetTop = vecCenterY - targetHalfH
  const targetBot = vecCenterY + targetHalfH

  const segs: { d: string; c1x: number; c1y: number; c2x: number; c2y: number; startY: number; endY: number }[] = []

  rowPositions.slice(0, count).forEach((rp, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5
    const endY = targetTop + t * (targetBot - targetTop)
    const { d, c1x, c1y, c2x, c2y } = makeCubicBezierPath(rp.startX, rp.startY, vecRight, endY)
    segs.push({ d, c1x, c1y, c2x, c2y, startY: rp.startY, endY })
  })

  // SVG viewBox: auto-fit container pixel dimensions
  const w = Math.ceil(containerRect.width)
  const h = Math.ceil(containerRect.height)
  if (w > 0 && h > 0) {
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }

  arrowPaths.value = segs.map((s, i) => ({
    d: s.d,
    startX: s.startX || (segs[0]?.c1x ? segs[0].c1x : 0),
    endX: vecRight,
    isAccent: accentIndices.has(i),
  }))

  // Funnel fill
  if (segs.length >= 2) {
    const top = segs[0]
    const bot = segs[segs.length - 1]
    funnelFillPath.value = [
      `M ${top.startX.toFixed(1)} ${top.startY.toFixed(1)}`,
      `C ${top.c1x.toFixed(1)} ${top.c1y.toFixed(1)}, ${top.c2x.toFixed(1)} ${top.c2y.toFixed(1)}, ${vecRight.toFixed(1)} ${top.endY.toFixed(1)}`,
      `C ${bot.c2x.toFixed(1)} ${bot.endY.toFixed(1)}, ${bot.c1x.toFixed(1)} ${bot.startY.toFixed(1)}, ${bot.startX.toFixed(1)} ${bot.startY.toFixed(1)}`,
      'Z',
    ].join(' ')
  } else {
    funnelFillPath.value = ''
  }
}

let observer: ResizeObserver | null = null

onMounted(() => {
  // Wait for KaTeX to render, then measure
  requestAnimationFrame(() => requestAnimationFrame(computePaths))

  observer = new ResizeObserver(() => requestAnimationFrame(computePaths))
  if (containerRef.value) observer!.observe(containerRef.value)
  observer!.observe(document.documentElement)
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div ref="containerRef" class="funnel-container">
    <!-- Vector (left, z-indexed above SVG) -->
    <div ref="vectorElRef" class="funnel-vector">
      <slot name="vector" />
    </div>

    <!-- Funnel SVG overlay (absolute, behind z-indexed children) -->
    <svg ref="svgRef" class="funnel-svg">
      <defs>
        <linearGradient id="funnelGrad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="40%" stop-color="#d9d9d9" stop-opacity="0.2" />
          <stop offset="60%" stop-color="#d9d9d9" stop-opacity="0.2" />
          <stop offset="100%" stop-color="transparent" />
        </linearGradient>

        <!-- Big arrowhead for accent lines -->
        <marker
          id="funnelArrowAccent"
          viewBox="0 0 12 8"
          refX="11"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L12,4 L0,8 Z" fill="#888" />
        </marker>

        <!-- Small arrowhead for non-accent lines -->
        <marker
          id="funnelArrow"
          viewBox="0 0 8 6"
          refX="7"
          refY="3"
          markerWidth="5"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill="#b0b0b0" />
        </marker>

        <!-- Per-path gradient for accent lines: fade from light right to dark left -->
        <linearGradient id="accentGrad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ccc" stop-opacity="0.5" />
          <stop offset="60%" stop-color="#888" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#555" stop-opacity="1" />
        </linearGradient>

        <!-- Non-accent lines: fade to transparent in last 5% near vector -->
        <linearGradient id="dimFadeGrad" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#b0b0b0" stop-opacity="1" />
          <stop offset="95%" stop-color="#b0b0b0" stop-opacity="1" />
          <stop offset="100%" stop-color="#b0b0b0" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Funnel gradient fill -->
      <path v-if="funnelFillPath" :d="funnelFillPath" fill="url(#funnelGrad)" />

      <!-- Arrow paths -->
      <path
        v-for="(p, i) in arrowPaths"
        :key="i"
        :d="p.d"
        fill="none"
        :stroke="p.isAccent ? 'url(#accentGrad)' : 'url(#dimFadeGrad)'"
        :stroke-width="p.isAccent ? 1.5 : 1.0"
        :opacity="p.isAccent ? 0.9 : 0.25"
        :marker-end="p.isAccent ? 'url(#funnelArrowAccent)' : undefined"
      />
    </svg>

    <!-- Spacer between vector and features -->
    <div class="funnel-spacer" />

    <!-- Feature rows (right, z-indexed above SVG) -->
    <div ref="featuresElRef" class="funnel-features">
      <slot name="features" />
    </div>
  </div>
</template>

<style scoped>
.funnel-container {
  display: flex;
  align-items: center;
  position: relative;
  min-height: 320px;
  min-width: 600px;
}

.funnel-vector {
  flex: 0 0 auto;
  z-index: 2;
}

.funnel-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.funnel-spacer {
  flex: 0 0 200px;
}

.funnel-features {
  flex: 0 0 auto;
  z-index: 2;
}
</style>
