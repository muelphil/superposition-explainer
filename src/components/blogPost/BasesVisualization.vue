<script setup lang="ts">
import { inject, computed } from 'vue'
import type { BasesServiceType } from '../../services/BasesService'
import MappingDiagram from './MappingDiagram.vue'
import CoordinateViz from './CoordinateViz.vue'

const svc = inject<BasesServiceType>('basesService')!

const showMapping = computed(() => svc.activeViz.value === 'mapping')
const showCoordinate = computed(() => svc.activeViz.value === 'coordinate')
</script>

<template>
  <div class="bases-viz">
    <MappingDiagram v-if="showMapping" />
    <CoordinateViz v-if="showCoordinate" />
  </div>
</template>

<style scoped>
.bases-viz {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}
</style>
