<script setup lang="ts">
import { inject, computed } from 'vue'
import type { BasesServiceType } from '../../services/BasesService'
import { MAPPING_STAGES } from '../../services/BasesService'

const svc = inject<BasesServiceType>('basesService')!

const stage = computed(() => svc.mappingStage.value)

/** Cumulative stage classes: all stages up to and including the current one */
const stageClasses = computed(() => {
  const idx = MAPPING_STAGES.indexOf(stage.value)
  const cls: Record<string, boolean> = {}
  for (let i = 0; i <= idx; i++) {
    cls[`stage-${MAPPING_STAGES[i]}`] = true
  }
  return cls
})

// ── SVG coordinate system ────────────────────────────────────────────────────

const VB_W = 580
const VB_H = 360

function pos(x: number, y: number) {
  return { left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` }
}

// Space circles (true circles — no ellipses)
const F = { cx: 155, cy: 180, r: 115 }
const H = { cx: 435, cy: 180, r: 75 }

// Dots
const DOT_R = 3.5
const xPt  = { x: 120, y: 140 }
const yPt  = { x: 450, y: 155 }
const xhPt = { x: 150, y: 265 }

// Arrow paths (endpoints stop before dot edge, leaving room for arrowheads)
const wPath  = 'M 124 136 C 245 25, 380 30, 444 144'
const wtPath = 'M 448 160 C 380 332, 245 328, 161 272'
</script>

<template>
  <div class="mapping-diagram" :class="stageClasses">
    <svg class="mapping-svg" :viewBox="`0 0 ${VB_W} ${VB_H}`"
         preserveAspectRatio="xMidYMid meet">

      <!-- Feature space circle -->
      <circle class="space-circle tgt-feature-space"
              :cx="F.cx" :cy="F.cy" :r="F.r" />

      <!-- Embedding space circle -->
      <circle class="space-circle tgt-both-spaces"
              :cx="H.cx" :cy="H.cy" :r="H.r" />

      <!-- Dot: x -->
      <circle class="dot tgt-feature-space"
              :cx="xPt.x" :cy="xPt.y" :r="DOT_R" />

      <!-- Dot: y -->
      <circle class="dot tgt-encoding"
              :cx="yPt.x" :cy="yPt.y" :r="DOT_R" />

      <!-- Dot: x̂ -->
      <circle class="dot tgt-decoding"
              :cx="xhPt.x" :cy="xhPt.y" :r="DOT_R" />

      <!-- W arrow stroke (draws from start to end) -->
      <path class="arrow-stroke arrow-w tgt-encoding" :d="wPath" />

      <!-- W arrowhead (appears after stroke reaches endpoint) -->
      <polygon class="arrowhead arrowhead-w tgt-encoding"
               points="0,0 -8,-3.2 -8,3.2"
               transform="translate(448,152) rotate(60)" />

      <!-- W^T arrow stroke -->
      <path class="arrow-stroke arrow-wt tgt-decoding" :d="wtPath" />

      <!-- W^T arrowhead -->
      <polygon class="arrowhead arrowhead-wt tgt-decoding"
               points="0,0 -8,-3.2 -8,3.2"
               transform="translate(153,267) rotate(212)" />
    </svg>

    <!-- HTML labels (positioned over SVG with percentage coordinates) -->
    <div class="label-layer">
      <!-- Space titles -->
      <div class="space-title tgt-feature-space" :style="pos(F.cx, 38)">
        Feature Space <katex-element expression="F" />
      </div>
      <div class="space-title tgt-both-spaces" :style="pos(H.cx, 80)">
        Embedding Space <katex-element expression="H" />
      </div>

      <!-- x label group (to upper-left of x dot) -->
      <div class="math-label tgt-feature-space x-group" :style="pos(72, 118)">
        <katex-element expression="x" />
        <div class="coord-expansion">
          <katex-element expression="= (x_1, \ldots, x_n)^T" />
        </div>
      </div>

      <!-- y = Wx (to right of y dot) -->
      <div class="math-label tgt-encoding" :style="pos(472, 136)">
        <katex-element expression="y = Wx" />
      </div>

      <!-- W label (above upper arc) -->
      <div class="math-label arrow-math tgt-encoding" :style="pos(300, 4)">
        <katex-element expression="W" />
      </div>

      <!-- W^T label (below lower arc) -->
      <div class="math-label arrow-math tgt-decoding" :style="pos(300, 342)">
        <katex-element expression="W^T" />
      </div>

      <!-- x̂ label group (to left of x̂ dot) -->
      <div class="math-label tgt-decoding xhat-group" :style="pos(38, 248)">
        <katex-element expression="\hat{x} = W^T y" />
        <div class="gram-line tgt-gram-matrix">
          <katex-element expression="\phantom{\hat{x}} = W^T W x" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mapping-diagram {
  position: relative;
  width: 100%;
  aspect-ratio: 580 / 360;
}

.mapping-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── SVG element styles ────────────────────────────────────────────────────── */

.space-circle {
  fill: var(--color-bg-secondary, #f3f4f6);
  stroke: var(--color-border, #d1d5db);
  stroke-width: 1;
}

.dot {
  fill: var(--color-text-primary, #1f2937);
}

.arrow-stroke {
  fill: none;
  stroke: var(--color-text-secondary, #4b5563);
  stroke-width: 2;
  stroke-linecap: round;
}

.arrowhead {
  fill: var(--color-text-secondary, #4b5563);
}

/* ── Label layer ───────────────────────────────────────────────────────────── */

.label-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.space-title {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--color-text-secondary, #4b5563);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25em;
}

.math-label {
  position: absolute;
  color: var(--color-text-primary, #1f2937);
  white-space: nowrap;
  font-size: 0.95rem;
}

.arrow-math {
  transform: translateX(-50%);
  font-size: 1rem;
}

.x-group {
  display: flex;
  flex-direction: column;
  gap: 0.15em;
}

.xhat-group {
  display: flex;
  flex-direction: column;
  gap: 0.1em;
}

/* ── Default: all revealable elements hidden ───────────────────────────────── */

.tgt-feature-space,
.tgt-both-spaces,
.tgt-encoding,
.tgt-decoding,
.tgt-gram-matrix {
  opacity: 0;
  transition: opacity 0.6s ease;
}

/* Arrow strokes: dashoffset animation (draws from start to end) */
.arrow-stroke {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  transition: opacity 0.6s ease, stroke-dashoffset 0.9s ease-out 0.15s;
}

/* Arrowheads: delayed appearance (timed to when stroke reaches endpoint) */
.arrowhead {
  transition: opacity 0.15s ease 0s;
}

/* ── Stage reveals (cumulative) ────────────────────────────────────────────── */

.stage-feature-space .tgt-feature-space { opacity: 1; }
.stage-both-spaces .tgt-both-spaces     { opacity: 1; }
.stage-encoding .tgt-encoding           { opacity: 1; }
.stage-decoding .tgt-decoding           { opacity: 1; }
.stage-gram-matrix .tgt-gram-matrix     { opacity: 1; }

/* Arrow stroke drawing */
.stage-encoding .arrow-w  { stroke-dashoffset: 0; }
.stage-decoding .arrow-wt { stroke-dashoffset: 0; }

/* Arrowhead delayed entrance (appears near end of stroke drawing) */
.stage-encoding .arrowhead-w  { transition: opacity 0.15s ease 0.75s; }
.stage-decoding .arrowhead-wt { transition: opacity 0.15s ease 0.75s; }

/* Coordinate expansion fades out from both-spaces onward */
.mapping-diagram.stage-both-spaces .coord-expansion { opacity: 0; }
</style>
