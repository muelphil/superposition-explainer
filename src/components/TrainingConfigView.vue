<script setup lang="ts">
import { inject, computed } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'

const svc = inject<AutoencoderServiceType>('autoencoderService')!

const isTraining = computed(() => svc.isTraining.value)

// ── Helpers ──────────────────────────────────────────────────
function numVal(e: Event) {
  return parseFloat((e.target as HTMLInputElement).value)
}
function intVal(e: Event) {
  return parseInt((e.target as HTMLSelectElement).value)
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

// Progress
const progressFrac = computed(() => {
  const done = svc.step.value - svc.trainingStartStep.value
  return Math.min(1, Math.max(0, done / svc.config.trainingSteps))
})
const stepsCompleted = computed(() =>
  Math.max(0, svc.step.value - svc.trainingStartStep.value)
)
const lossDisplay = computed(() => svc.loss.value.toFixed(4))
</script>

<template>
  <div class="config-panel">

    <!-- ── Parameter rows ──────────────────────────────── -->
    <div class="cfg-grid">

      <label class="cfg-label" title="Probability a feature is non-zero in a training sample">Sparsity</label>
      <input type="range" class="cfg-slider" min="0" max="1" step="0.05"
        :value="svc.config.sparsity" :disabled="isTraining"
        @input="svc.updateConfig({ sparsity: numVal($event) })" />
      <span class="cfg-val">{{ svc.config.sparsity.toFixed(2) }}</span>

      <label class="cfg-label" title="I_i = α^i — 1.0 = uniform, lower = first features more important">Importance α</label>
      <input type="range" class="cfg-slider" min="0.5" max="1.0" step="0.01"
        :value="svc.config.featureDecay" :disabled="isTraining"
        @input="svc.updateConfig({ featureDecay: numVal($event) })" />
      <span class="cfg-val">{{ svc.config.featureDecay.toFixed(2) }}</span>

      <label class="cfg-label">Learning rate</label>
      <input type="range" class="cfg-slider" min="-4" max="-1" step="0.1"
        :value="lrLog" :disabled="isTraining"
        @input="setLR($event)" />
      <span class="cfg-val">{{ fmtLR(svc.config.learningRate) }}</span>

      <label class="cfg-label">Batch size</label>
      <select class="cfg-select" :value="svc.config.batchSize" :disabled="isTraining"
        @change="svc.updateConfig({ batchSize: intVal($event) })">
        <option v-for="bs in [32, 64, 128, 256, 512]" :key="bs" :value="bs">{{ bs }}</option>
      </select>
      <span class="cfg-val" />

      <label class="cfg-label">Steps</label>
      <input type="range" class="cfg-slider" min="1000" max="50000" step="1000"
        :value="svc.config.trainingSteps" :disabled="isTraining"
        @input="svc.updateConfig({ trainingSteps: numVal($event) })" />
      <span class="cfg-val">{{ svc.config.trainingSteps.toLocaleString() }}</span>

    </div>

    <!-- ── Progress ──────────────────────────────────────── -->
    <div class="progress-section">
      <div class="progress-meta">
        <span class="progress-steps">{{ stepsCompleted.toLocaleString() }} / {{ svc.config.trainingSteps.toLocaleString() }}</span>
        <span v-if="svc.step.value > 0" class="progress-loss">loss {{ lossDisplay }}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressFrac * 100}%` }" />
      </div>
    </div>

    <!-- ── Start / Stop ───────────────────────────────────── -->
    <button
      class="train-btn"
      :class="{ 'train-btn--stop': isTraining }"
      @click="isTraining ? svc.stopTraining() : svc.startTraining()"
    >
      {{ isTraining ? '■ Stop Training' : '▶ Start Training' }}
    </button>

  </div>
</template>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ── Parameter grid ──────────────────────────────────────── */
.cfg-grid {
  display: grid;
  grid-template-columns: auto 1fr 4ch;
  align-items: center;
  column-gap: 0.6rem;
  row-gap: 0.35rem;
}

.cfg-label {
  font-size: 0.78rem;
  color: var(--color-text-label);
  white-space: nowrap;
  cursor: default;
  user-select: none;
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
.cfg-slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
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
.cfg-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cfg-select:focus {
  border-color: var(--color-interactive);
}

/* ── Progress ──────────────────────────────────────────────── */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.progress-steps {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-label);
}

.progress-loss {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}

.progress-track {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-interactive);
  border-radius: 2px;
  transition: width 0.1s linear;
}

/* ── Start / Stop button ──────────────────────────────────── */
.train-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  background: var(--color-interactive);
  color: #fff;
  letter-spacing: 0.02em;
}
.train-btn:hover {
  background: var(--color-interactive-hover);
  border-color: transparent;
}
.train-btn--stop {
  background: #64748b;
}
.train-btn--stop:hover {
  background: #475569;
  border-color: transparent;
}
</style>

