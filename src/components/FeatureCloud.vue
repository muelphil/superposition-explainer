<script setup lang="ts">
import { featureColor } from '../utils/featureColor'
import { FEATURE_NAMES } from '../data/featureNames'

defineProps<{
  featureRowCount?: number
}>()

/**
 * Pick a handful of unique feature names and assign a pastel color
 * derived from the gradient to each.
 */
function randomFeatures(): { text: string; bgColor: string }[] {
  const count = 4 //5 + Math.floor(Math.random() * 2)  // 5 or 6
  const shuffled = [...FEATURE_NAMES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(text => ({
    text,
    bgColor: pillColor(),
  }))
}

/**
 * Evenly force-spread across the 3 gradient stop regions:
 *   0 → orange        (#F69F16)
 *   1 → pink          (#F73361)
 *   2 → blue          (#097AFA)
 * Then add random jitter within each segment so adjacent stops blend.
 */
function pillColor(): string {
  // Pick one of the 3 segments
  const seg = Math.floor(Math.random() * 3)
  // t within segment [0.05, 0.95] so we don't hit exact boundaries
  const jitter = 0.05 + Math.random() * 0.9
  // Map segment + jitter to overall gradient t ∈ [0, 1]
  const t = (seg + jitter) / 3
  const rgb = featureColorAtT(t)
  const channels = rgb.slice(4, -1).split(',').map(Number)
  // Gentle lerp toward white for pastel
  const lerp = 0.3 + Math.random() * 0.2
  const r = Math.round(channels[0] + (255 - channels[0]) * lerp)
  const g = Math.round(channels[1] + (255 - channels[1]) * lerp)
  const b = Math.round(channels[2] + (255 - channels[2]) * lerp)
  return `rgb(${r},${g},${b})`
}

/**
 * Thin wrapper: sample the gradient at a specific t ∈ [0, 1] using the
 * same logic as featureColor but with an explicit t parameter.
 */
function featureColorAtT(t: number): string {
  // Reuse featureColor by finding an equivalent (i, n) pair.
  return featureColor(Math.round(t * 99), 100)
}
</script>

<template>
  <div class="feature-cloud">
    <div
      v-for="i in featureRowCount"
      :key="i"
      class="feature-row"
    >
      <span
        v-for="(pill, fi) in randomFeatures()"
        :key="`${i}-${fi}`"
        class="feature-pill"
        :style="{ backgroundColor: pill.bgColor }"
      >{{ pill.text }}</span>
    </div>
    <div class="feature-ellipsis">tens of thousands of more features&hellip;</div>
  </div>
</template>

<style scoped>
.feature-cloud {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
  mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.85) 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, rgba(0, 0, 0, 0.85) 100%);
}

.feature-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.feature-pill {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  border: 1px solid var(--color-border);
  color: black;
  white-space: nowrap;
  user-select: none;
}

.feature-ellipsis {
  font-size: 12px;
  font-style: italic;
  color: var(--color-text-primary);
  opacity: 0.6;
  padding: 6px 0 4px 4px;
  user-select: none;
  text-align: left;
}
</style>
