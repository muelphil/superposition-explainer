<script setup lang="ts">
import { computed, inject } from 'vue'
import { RotateCcw, Play, Pause } from 'lucide-vue-next'
import type { AutoencoderServiceType } from '../services/AutoencoderService'

const svc = inject<AutoencoderServiceType>('autoencoderService')!

const trainLabel = computed(() => {
  if (svc.isTraining.value) return 'Pause Training'
  if (svc.step.value > 0) return 'Continue Training'
  return 'Start Training'
})

function onTrainClick() {
  if (svc.isTraining.value) {
    svc.pauseTraining()
  } else {
    svc.startTraining()
  }
}
</script>

<template>
  <div class="footer-btns">
    <button
      class="reset-btn"
      :disabled="svc.isTraining.value"
      @click="svc.resetWeights()"
      title="Re-initialise weights (Xavier normal, bias = 0)"
    >
      <RotateCcw :size="13" /> Reset
    </button>
    <button
      class="train-btn"
      :class="{ 'train-btn--pause': svc.isTraining.value }"
      @click="onTrainClick"
    >
      <Pause v-if="svc.isTraining.value" :size="13" />
      <Play v-else :size="13" />
      {{ trainLabel }}
    </button>
  </div>
</template>

<style scoped>
.footer-btns {
  display: flex;
  gap: 0.5rem;
}

.reset-btn {
  flex: 0 0 auto;
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  background: var(--color-bg-subtle);
  color: var(--color-text-action-hover);
}
.reset-btn:hover:not(:disabled) { background: var(--color-bg-hover); }
.reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.train-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--color-interactive);
  color: var(--color-bg);
  letter-spacing: 0.02em;
}
.train-btn:hover { background: var(--color-interactive-hover); }
.train-btn--pause { background: var(--color-text-action); }
.train-btn--pause:hover { background: var(--color-text-action-hover); }
</style>
