<script setup lang="ts">
import { inject, computed } from 'vue'
import type { BasesServiceType } from '../../services/BasesService'
import { MAPPING_STAGES } from '../../services/BasesService'
import svgRaw from '../../assets/mapping-diagram.svg?raw'

const svc = inject<BasesServiceType>('basesService')!

/** Cumulative stage classes: all stages up to and including the current one */
const stageClasses = computed(() => {
  const idx = MAPPING_STAGES.indexOf(svc.mappingStage.value)
  const cls: Record<string, boolean> = {}
  for (let i = 0; i <= idx; i++) {
    cls[`stage-${MAPPING_STAGES[i]}`] = true
  }
  return cls
})
</script>

<template>
  <div class="mapping-diagram" :class="stageClasses">
    <div class="svg-wrapper" v-html="svgRaw" />
  </div>
</template>

<style scoped>
.mapping-diagram {
  width: 100%;
  aspect-ratio: 580 / 360;
  font-size: 1em;
}

@media (max-width: 768px) {
  .mapping-diagram {
    font-size: 1.2em;
  }
}

.svg-wrapper {
  width: 100%;
  height: 100%;
}

.svg-wrapper :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

/* ── Default: all stage groups hidden ──────────────────────────────────────── */

.svg-wrapper :deep(#g-feature-space),
.svg-wrapper :deep(#g-coord-exp),
.svg-wrapper :deep(#g-both-spaces),
.svg-wrapper :deep(#g-encoding),
.svg-wrapper :deep(#g-decoding),
.svg-wrapper :deep(#g-gram-matrix),
.svg-wrapper :deep(#g-error-line) {
  opacity: 0;
  transition: opacity 0.6s ease;
}

/* Arrow paths: draw on via stroke-dashoffset */
.svg-wrapper :deep(#arrow-w),
.svg-wrapper :deep(#arrow-wt) {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  transition: stroke-dashoffset 0.9s ease-out 0.15s;
}

/* Arrowheads: hidden by default, revealed with delay after arrow completes */
.svg-wrapper :deep(#arrowhead-w),
.svg-wrapper :deep(#arrowhead-wt) {
  opacity: 0;
  transition: opacity 0.15s ease 0s;
}

/* ── Stage reveals ─────────────────────────────────────────────────────────── */

.stage-feature-space .svg-wrapper :deep(#g-feature-space),
.stage-feature-space .svg-wrapper :deep(#g-coord-exp) { opacity: 1; }

/* coord-expansion fades out once embedding space is introduced */
.stage-both-spaces .svg-wrapper :deep(#g-coord-exp)   { opacity: 0; }
.stage-both-spaces .svg-wrapper :deep(#g-both-spaces)  { opacity: 1; }

.stage-encoding .svg-wrapper :deep(#g-encoding)   { opacity: 1; }
.stage-encoding .svg-wrapper :deep(#arrow-w)      { stroke-dashoffset: 0; }
.stage-encoding .svg-wrapper :deep(#arrowhead-w) {
  opacity: 1;
  transition: opacity 0.15s ease 0.75s;
}

.stage-decoding .svg-wrapper :deep(#g-decoding)    { opacity: 1; }
.stage-decoding .svg-wrapper :deep(#arrow-wt)      { stroke-dashoffset: 0; }
.stage-decoding .svg-wrapper :deep(#arrowhead-wt) {
  opacity: 1;
  transition: opacity 0.15s ease 0.75s;
}

.stage-gram-matrix .svg-wrapper :deep(#g-gram-matrix) { opacity: 1; }
</style>
