<script setup lang="ts">
import { computed } from 'vue'
import { featureColor } from '../utils/featureColor'
import { FEATURE_NAMES } from '../data/featureNames'

const props = withDefaults(defineProps<{
  featureRowCount?: number
}>(), {
  featureRowCount: 22,
})

const PILL_COUNT = 4

function pillColor(): string {
  const seg = Math.floor(Math.random() * 3)
  const jitter = 0.05 + Math.random() * 0.9
  const t = (seg + jitter) / 3
  const rgb = featureColor(Math.round(t * 99), 100)
  const channels = rgb.slice(4, -1).split(',').map(Number)
  const lerp = 0.3 + Math.random() * 0.2
  const r = Math.round(channels[0] + (255 - channels[0]) * lerp)
  const g = Math.round(channels[1] + (255 - channels[1]) * lerp)
  const b = Math.round(channels[2] + (255 - channels[2]) * lerp)
  return `rgb(${r},${g},${b})`
}

/**
 * All rows computed together: shuffle once, then consume sequentially.
 * Guarantees zero duplicates across all pills.
 */
const rows = computed(() => {
  const shuffled = [...FEATURE_NAMES].sort(() => Math.random() - 0.5)
  const result: { text: string; bgColor: string }[][] = []

  for (let row = 0; row < props.featureRowCount && shuffled.length >= PILL_COUNT; row++) {
    const pills: { text: string; bgColor: string }[] = []
    for (let p = 0; p < PILL_COUNT; p++) {
      const name = shuffled.shift()!
      pills.push({ text: name, bgColor: pillColor() })
    }
    result.push(pills)
  }
  return result
})
</script>

<template>
  <div class="feature-cloud">
    <div
      v-for="(pillRow, ri) in rows"
      :key="ri"
      class="feature-row"
    >
      <span
        v-for="(pill, pi) in pillRow"
        :key="`${ri}-${pi}`"
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
  align-items: flex-end;
  mask-image: linear-gradient(to left, rgba(0, 0, 0, 0.85) 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to left, rgba(0, 0, 0, 0.85) 100%);
}

.feature-row {
  display: flex;
  flex-direction: row-reverse;
  gap: 8px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.feature-pill {
  font-family: var(--font-family-label);
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
  padding: 6px 4px 4px 0;
  user-select: none;
  text-align: right;
}
</style>
