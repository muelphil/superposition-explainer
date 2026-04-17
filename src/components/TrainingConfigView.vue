<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import { AE_VIEW_CONSTRAINTS_KEY } from './blogPost/aeStepTypes'
import { TASK_EVENT_BUS_KEY } from './blogPost/taskSystem'

const svc = inject<AutoencoderServiceType>('autoencoderService')!

// Optional constraints from blog paragraph steps (undefined in MainView)
const constraints = inject(AE_VIEW_CONSTRAINTS_KEY, undefined)
const hiddenControls = computed(() => constraints?.value.hiddenControls ?? new Set<string>())

// Optional event bus for task system (undefined in MainView)
const eventBus = inject(TASK_EVENT_BUS_KEY, undefined)

const isTraining = computed(() => svc.isTraining.value)
const showAdvanced = ref(false)

function numVal(e: Event) {
  return parseFloat((e.target as HTMLInputElement).value)
}
function intVal(e: Event) {
  return parseInt((e.target as HTMLSelectElement).value)
}

function setSparsity(e: Event) {
  const v = numVal(e)
  svc.updateConfig({ sparsity: v })
  eventBus?.emit('sparsity-changed', { value: v })
}

function setImportance(e: Event) {
  const v = numVal(e)
  svc.updateConfig({ featureDecay: v })
  eventBus?.emit('importance-changed', { value: v })
}

// Learning rate: slider on log10 scale [-4, -1]
const lrLog = computed(() => Math.log10(svc.config.learningRate))
function setLR(e: Event) {
  svc.updateConfig({ learningRate: Math.pow(10, numVal(e)) })
}
function fmtLR(lr: number) {
  if (lr < 0.001) return lr.toFixed(5)
  if (lr < 0.01)  return lr.toFixed(4)
  return lr.toFixed(3)
}
</script>

<template>
  <div class="config-panel">

    <!-- Main parameters -->
    <div class="cfg-grid" v-if="!hiddenControls.has('sparsity') || !hiddenControls.has('importance')">

      <template v-if="!hiddenControls.has('sparsity')">
        <label class="cfg-label" title="Fraction of features that are zero in a training sample (higher = fewer active features)">Sparsity <katex-element expression="S" /></label>
        <input type="range" class="cfg-slider" min="0" max="0.95" step="0.05"
          :value="svc.config.sparsity" :disabled="isTraining"
          @input="setSparsity($event)" />
        <span class="cfg-val">{{ svc.config.sparsity.toFixed(2) }}</span>
      </template>

      <template v-if="!hiddenControls.has('importance')">
        <label class="cfg-label" title="I_i = α^i — 1.0 = uniform, lower = first features more important">Importance <katex-element expression="\alpha" /></label>
        <input type="range" class="cfg-slider" min="0.5" max="1.0" step="0.05"
          :value="svc.config.featureDecay" :disabled="isTraining"
          @input="setImportance($event)" />
        <span class="cfg-val">{{ svc.config.featureDecay.toFixed(2) }}</span>
      </template>

    </div>

    <!-- Advanced toggle -->
    <button v-if="!hiddenControls.has('advanced')" class="advanced-toggle" @click="showAdvanced = !showAdvanced">
      <ChevronDown :size="12" :class="{ rotated: showAdvanced }" />
      Advanced
    </button>

    <!-- Advanced parameters -->
    <div v-if="!hiddenControls.has('advanced') && showAdvanced" class="cfg-grid">

      <label class="cfg-label">Learning rate</label>
      <input type="range" class="cfg-slider" min="-4" max="-1" step="0.1"
        :value="lrLog" :disabled="isTraining"
        @input="setLR($event)" />
      <span class="cfg-val">{{ fmtLR(svc.config.learningRate) }}</span>

      <label class="cfg-label">Batch size</label>
      <select class="cfg-select cfg-select-number" :value="svc.config.batchSize" :disabled="isTraining"
        @change="svc.updateConfig({ batchSize: intVal($event) })">
        <option v-for="bs in [32, 64, 128, 256, 512]" :key="bs" :value="bs">{{ bs }}</option>
      </select>
      <span class="cfg-val" />

    </div>

  </div>
</template>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.cfg-grid {
  display: grid;
  grid-template-columns: auto 1fr 4ch;
  align-items: center;
  column-gap: 0.6rem;
  row-gap: 0.35rem;
}

.cfg-label {
  font-family: var(--font-family-label);
  font-size: 0.78rem;
  color: var(--color-text-label);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  text-align:right;
}

.cfg-slider {
  width: 100%;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
}
.cfg-slider:disabled { opacity: 0.4; cursor: not-allowed; }
.cfg-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-interactive);
  border: none;
  cursor: pointer;
}
.cfg-slider:disabled::-webkit-slider-thumb {
  background: var(--color-interactive-disabled);
  cursor: not-allowed;
}
.cfg-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-interactive);
  border: none;
  cursor: pointer;
}

.cfg-val {
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  text-align: right;
  white-space: nowrap;
  font-family: var(--font-family-number);
}

.cfg-select {
  width: 100%;
  font-size: 0.78rem;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.15rem 0.3rem;
  cursor: pointer;
  outline: none;
  height: 1.6rem;
}

.cfg-select.cfg-select-number{
  font-family: var(--font-family-number);
}

.cfg-select:disabled { opacity: 0.4; cursor: not-allowed; }
.cfg-select:focus { border-color: var(--color-interactive); }

.advanced-toggle {
  font-family: var(--font-family-label);
  //color: var(--color-text-label);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  width: fit-content;
  user-select: none;
}
.advanced-toggle:hover { color: var(--color-text-secondary); }
.advanced-toggle svg { transition: transform 0.15s ease; }
.advanced-toggle svg.rotated { transform: rotate(180deg); }
</style>
