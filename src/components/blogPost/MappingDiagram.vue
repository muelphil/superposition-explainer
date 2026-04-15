<script setup lang="ts">
import { inject, computed } from 'vue'
import type { BasesServiceType } from '../../services/BasesService'
import { MAPPING_STAGES, type MappingStage } from '../../services/BasesService'

const svc = inject<BasesServiceType>('basesService')!

const stage = computed(() => svc.mappingStage.value)

/** Cumulative stage classes: all stages up to and including the current one */
const stageClasses = computed(() => {
  const idx = MAPPING_STAGES.indexOf(stage.value)
  const classes: Record<string, boolean> = {}
  for (let i = 0; i <= idx; i++) {
    classes[`stage-${MAPPING_STAGES[i]}`] = true
  }
  return classes
})

// ── SVG geometry ──────────────────────────────────────────────────────────────

const viewBox = '0 0 600 380'

// Feature space ellipse (left, larger)
const F = { cx: 160, cy: 195, rx: 130, ry: 145 }
// Embedding space ellipse (right, smaller)
const H = { cx: 450, cy: 195, rx: 90, ry: 110 }

// Points
const xPt  = { x: 130, y: 155 }   // x in F
const yPt  = { x: 465, y: 165 }   // y in H
const xhPt = { x: 170, y: 275 }   // x̂ in F

// Curved arrow paths
const wPath = `M ${xPt.x + 8} ${xPt.y - 8} C 260 40, 380 40, ${yPt.x - 8} ${yPt.y - 6}`
const wtPath = `M ${yPt.x - 8} ${yPt.y + 12} C 380 340, 260 340, ${xhPt.x + 8} ${xhPt.y + 4}`
</script>

<template>
  <div class="mapping-diagram" :class="stageClasses">
    <!-- SVG layer: shapes, dots, arrows -->
    <svg class="mapping-svg" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrow-w" viewBox="0 0 10 8" refX="9" refY="4"
                markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 4 L 0 8 Z" fill="var(--color-text-primary)" />
        </marker>
        <marker id="arrow-wt" viewBox="0 0 10 8" refX="9" refY="4"
                markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 4 L 0 8 Z" fill="var(--color-text-primary)" />
        </marker>
      </defs>

      <!-- Feature space F ellipse -->
      <ellipse class="space-ellipse map-tgt-feature-space"
               :cx="F.cx" :cy="F.cy" :rx="F.rx" :ry="F.ry" />

      <!-- Embedding space H ellipse -->
      <ellipse class="space-ellipse map-tgt-both-spaces"
               :cx="H.cx" :cy="H.cy" :rx="H.rx" :ry="H.ry" />

      <!-- W arrow (encoding) -->
      <path class="arrow-path map-tgt-encoding"
            :d="wPath" marker-end="url(#arrow-w)" />

      <!-- W^T arrow (decoding) -->
      <path class="arrow-path map-tgt-decoding"
            :d="wtPath" marker-end="url(#arrow-wt)" />

      <!-- Dot: x in feature space -->
      <circle class="point-dot map-tgt-feature-space"
              :cx="xPt.x" :cy="xPt.y" r="5" />

      <!-- Dot: y in embedding space -->
      <circle class="point-dot map-tgt-encoding"
              :cx="yPt.x" :cy="yPt.y" r="5" />

      <!-- Dot: x̂ in feature space -->
      <circle class="point-dot map-tgt-decoding"
              :cx="xhPt.x" :cy="xhPt.y" r="5" />
    </svg>

    <!-- HTML labels positioned over the SVG -->
    <div class="label-overlay">
      <!-- Space title: Feature Space F -->
      <div class="space-label map-tgt-feature-space" :style="{ left: `${(F.cx / 600) * 100}%`, top: '4%' }">
        Feature Space
        <katex-element expression="F" />
      </div>

      <!-- Space title: Embedding Space H -->
      <div class="space-label map-tgt-both-spaces" :style="{ left: `${(H.cx / 600) * 100}%`, top: '4%' }">
        Embedding Space
        <katex-element expression="H" />
      </div>

      <!-- Label: x (with coordinate expansion) -->
      <div class="point-label map-tgt-feature-space" :style="{ left: `${((xPt.x - 30) / 600) * 100}%`, top: `${((xPt.y - 24) / 380) * 100}%` }">
        <katex-element expression="x" />
      </div>

      <!-- Label: x coordinate expansion (only at feature-space stage) -->
      <div class="point-label coord-label map-tgt-feature-space"
           :style="{ left: `${((xPt.x + 16) / 600) * 100}%`, top: `${((xPt.y - 24) / 380) * 100}%` }">
        <katex-element expression="= (x_1, \ldots, x_n)^T" :display-mode="false" />
      </div>

      <!-- Label: y = Wx -->
      <div class="point-label map-tgt-encoding" :style="{ left: `${((yPt.x + 14) / 600) * 100}%`, top: `${((yPt.y - 24) / 380) * 100}%` }">
        <katex-element expression="y = Wx" />
      </div>

      <!-- Label: W on encoder arrow -->
      <div class="arrow-label map-tgt-encoding" :style="{ left: '50%', top: '6%' }">
        <katex-element expression="W" />
      </div>

      <!-- Label: W^T on decoder arrow -->
      <div class="arrow-label map-tgt-decoding" :style="{ left: '50%', top: '88%' }">
        <katex-element expression="W^T" />
      </div>

      <!-- Label: x̂ = W^T y (decoding stage) -->
      <div class="point-label xhat-label map-tgt-decoding"
           :style="{ left: `${((xhPt.x - 80) / 600) * 100}%`, top: `${((xhPt.y - 12) / 380) * 100}%` }">
        <katex-element expression="\hat{x} = W^T y" />
      </div>

      <!-- Label: x̂ = W^T W x (gram-matrix stage, replaces the decoding label) -->
      <div class="point-label xhat-expanded map-tgt-gram-matrix"
           :style="{ left: `${((xhPt.x - 80) / 600) * 100}%`, top: `${((xhPt.y + 16) / 380) * 100}%` }">
        <katex-element expression="= W^T W x" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mapping-diagram {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.mapping-svg {
  width: 100%;
  height: auto;
  display: block;
}

/* ── SVG element styles ────────────────────────────────────────────────────── */

.space-ellipse {
  fill: var(--color-bg-secondary, #f3f4f6);
  stroke: var(--color-border);
  stroke-width: 1;
}

.arrow-path {
  fill: none;
  stroke: var(--color-text-primary);
  stroke-width: 2.2;
}

.point-dot {
  fill: var(--color-text-primary);
}

/* ── Label overlay ─────────────────────────────────────────────────────────── */

.label-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.space-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.point-label {
  position: absolute;
  font-size: 1rem;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.arrow-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* ── Default hidden state: all revealable elements start invisible ────────── */

.map-tgt-feature-space,
.map-tgt-both-spaces,
.map-tgt-encoding,
.map-tgt-decoding,
.map-tgt-gram-matrix {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

/* ── Stage reveals (cumulative) ────────────────────────────────────────────── */

.stage-feature-space .map-tgt-feature-space {
  opacity: 1;
  visibility: visible;
}

.stage-both-spaces .map-tgt-both-spaces {
  opacity: 1;
  visibility: visible;
}

/* When both-spaces is active, hide the coordinate expansion label */
.stage-both-spaces .coord-label {
  opacity: 0;
  visibility: hidden;
}

.stage-encoding .map-tgt-encoding {
  opacity: 1;
  visibility: visible;
}

.stage-decoding .map-tgt-decoding {
  opacity: 1;
  visibility: visible;
}

.stage-gram-matrix .map-tgt-gram-matrix {
  opacity: 1;
  visibility: visible;
}

/* ── Entrance pulse animation for newly revealed elements ──────────────────── */

@keyframes map-reveal-pulse {
  0% { transform: scale(0.85); opacity: 0; }
  60% { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* Apply entrance animation to SVG elements transitioning in */
.stage-both-spaces .map-tgt-both-spaces:not(.map-tgt-feature-space),
.stage-encoding .map-tgt-encoding,
.stage-decoding .map-tgt-decoding {
  animation: map-reveal-pulse 0.5s ease-out;
}

/* Gram matrix label subtle emphasis */
.stage-gram-matrix .xhat-expanded {
  animation: map-reveal-pulse 0.5s ease-out;
}
</style>
