<script setup lang="ts">
import { inject, computed } from 'vue'
import type { BasesServiceType } from '../../services/BasesService'
import { MAPPING_STAGES } from '../../services/BasesService'
import svgRaw from '../../assets/mapping-diagram.svg?raw'

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

// ── Label positions (percentage of 580×360 viewBox) ─────────────────────────
// These correspond to the guide text positions in mapping-diagram.svg.
// If you move elements in the SVG, update the matching pos() calls here.

function pos(x: number, y: number) {
  return { left: `${(x / 580) * 100}%`, top: `${(y / 360) * 100}%` }
}
</script>

<template>
  <div class="mapping-diagram" :class="stageClasses">
    <!-- Inline SVG from src/assets/mapping-diagram.svg -->
    <div class="svg-wrapper" v-html="svgRaw" />

    <!-- KaTeX label overlay (replaces .guide SVG text; always hidden in SVG editor) -->
    <div class="label-layer">

      <!-- Space titles -->
      <div class="space-title tgt-feature-space" :style="pos(155, 36)">
        Feature Space <katex-element expression="F" />
      </div>
      <div class="space-title tgt-both-spaces" :style="pos(435, 78)">
        Embedding Space <katex-element expression="H" />
      </div>

      <!-- x label + coordinate expansion (fades out at both-spaces) -->
      <div class="math-label tgt-feature-space x-group" :style="pos(72, 116)">
        <katex-element expression="x" />
        <div class="coord-expansion">
          <katex-element expression="= (x_1, \ldots, x_n)^T" />
        </div>
      </div>

      <!-- y = Wx -->
      <div class="math-label tgt-encoding" :style="pos(467, 136)">
        <katex-element expression="y = Wx" />
      </div>

      <!-- W on encoder arc (centered) -->
      <div class="math-label arrow-math tgt-encoding" :style="pos(300, 4)">
        <katex-element expression="W" />
      </div>

      <!-- W^T on decoder arc (centered) -->
      <div class="math-label arrow-math tgt-decoding" :style="pos(300, 340)">
        <katex-element expression="W^T" />
      </div>

      <!-- x̂ + gram-matrix second line -->
      <div class="math-label tgt-decoding xhat-group" :style="pos(34, 246)">
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

/* ── SVG wrapper fills the container ──────────────────────────────────────── */

.svg-wrapper {
  position: absolute;
  inset: 0;
}

/* Make the injected <svg> element fill its wrapper */
.svg-wrapper :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

/* Hide guide labels (SVG <text class="guide">) — replaced by KaTeX overlay */
.svg-wrapper :deep(.guide) {
  display: none;
}

/* ── Default hidden state for all revealable SVG elements ─────────────────── */

.svg-wrapper :deep(#circle-f),
.svg-wrapper :deep(#circle-h),
.svg-wrapper :deep(#dot-x),
.svg-wrapper :deep(#dot-y),
.svg-wrapper :deep(#dot-xhat),
.svg-wrapper :deep(#arrow-w),
.svg-wrapper :deep(#arrowhead-w),
.svg-wrapper :deep(#arrow-wt),
.svg-wrapper :deep(#arrowhead-wt) {
  opacity: 0;
  transition: opacity 0.6s ease;
}

/* Arrow strokes draw from start to end via stroke-dashoffset */
.svg-wrapper :deep(#arrow-w),
.svg-wrapper :deep(#arrow-wt) {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  transition: opacity 0.6s ease, stroke-dashoffset 0.9s ease-out 0.15s;
}

/* Arrowheads default: fast hide (no delay) */
.svg-wrapper :deep(#arrowhead-w),
.svg-wrapper :deep(#arrowhead-wt) {
  transition: opacity 0.15s ease 0s;
}

/* ── Stage reveals ─────────────────────────────────────────────────────────── */

/* feature-space: F circle + x dot */
.stage-feature-space .svg-wrapper :deep(#circle-f),
.stage-feature-space .svg-wrapper :deep(#dot-x) { opacity: 1; }

/* both-spaces: H circle */
.stage-both-spaces .svg-wrapper :deep(#circle-h) { opacity: 1; }

/* encoding: y dot + W arrow (draws) + W arrowhead (delayed) */
.stage-encoding .svg-wrapper :deep(#dot-y),
.stage-encoding .svg-wrapper :deep(#arrow-w) { opacity: 1; }
.stage-encoding .svg-wrapper :deep(#arrow-w)  { stroke-dashoffset: 0; }
.stage-encoding .svg-wrapper :deep(#arrowhead-w) {
  opacity: 1;
  transition: opacity 0.15s ease 0.75s;
}

/* decoding: x̂ dot + W^T arrow (draws) + W^T arrowhead (delayed) */
.stage-decoding .svg-wrapper :deep(#dot-xhat),
.stage-decoding .svg-wrapper :deep(#arrow-wt) { opacity: 1; }
.stage-decoding .svg-wrapper :deep(#arrow-wt)  { stroke-dashoffset: 0; }
.stage-decoding .svg-wrapper :deep(#arrowhead-wt) {
  opacity: 1;
  transition: opacity 0.15s ease 0.75s;
}

/* ── HTML label layer ──────────────────────────────────────────────────────── */

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

/* ── Default hidden state for HTML labels ─────────────────────────────────── */

.tgt-feature-space,
.tgt-both-spaces,
.tgt-encoding,
.tgt-decoding,
.tgt-gram-matrix {
  opacity: 0;
  transition: opacity 0.6s ease;
}

/* ── Stage reveals for HTML labels ────────────────────────────────────────── */

.stage-feature-space .tgt-feature-space { opacity: 1; }
.stage-both-spaces   .tgt-both-spaces   { opacity: 1; }
.stage-encoding      .tgt-encoding      { opacity: 1; }
.stage-decoding      .tgt-decoding      { opacity: 1; }
.stage-gram-matrix   .tgt-gram-matrix   { opacity: 1; }

/* Coordinate expansion fades out once embedding space is introduced */
.mapping-diagram.stage-both-spaces .coord-expansion { opacity: 0; }
</style>
