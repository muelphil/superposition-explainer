<script setup lang="ts">
import { inject, computed } from 'vue'
import type { SelectionServiceType } from '../../services/SelectionService'
import { featureColorCss } from '../../utils/featureColor'

const props = defineProps<{ inputDim: number }>()

const selSvc = inject<SelectionServiceType>('selectionService')!

const hoveredFeatureIdx = computed(() => {
  const h = selSvc.hovered.value
  return h?.kind === 'feature' ? h.idx : null
})

const items = computed(() => Array.from({ length: props.inputDim }, (_, i) => i))

function onEnter(i: number) { selSvc.setHover({ kind: 'feature', idx: i }, 'embedding') }
function onLeave()          { selSvc.clearHover() }
function onClick(i: number) { selSvc.setSelected({ kind: 'feature', idx: i }, 'embedding') }
</script>

<template>
  <div class="emb-legend">
    <div
      v-for="i in items"
      :key="i"
      class="legend-item"
      :class="{ dimmed: hoveredFeatureIdx !== null && hoveredFeatureIdx !== i }"
      @mouseenter="onEnter(i)"
      @mouseleave="onLeave()"
      @click="onClick(i)"
    >
      <span class="legend-swatch" :style="{ background: featureColorCss(i, inputDim) }" />
      <span class="legend-text">f{{ i + 1 }}</span>
    </div>
  </div>
</template>

<style scoped>
.emb-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.65rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: opacity 0.15s;
  user-select: none;
}
.legend-item.dimmed { opacity: 0.35; }

.legend-swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-size: 0.72rem;
  color: var(--color-text-label);
  font-variant-numeric: tabular-nums;
}
</style>
