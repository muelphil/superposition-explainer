<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import { showEmbeddingPoint, useFeatureColorsForIO } from '../services/SettingsService'

defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Settings">

        <div class="modal-header">
          <span class="modal-title">Settings</span>
          <button class="modal-close" @click="emit('close')" title="Close"><X :size="15" /></button>
        </div>

        <div class="modal-body">
          <div class="setting-row">
            <label class="setting-label" for="setting-emb-point">
              Show input point in Embedding Space
            </label>
            <input
              id="setting-emb-point"
              type="checkbox"
              class="setting-toggle"
              :checked="showEmbeddingPoint"
              @change="showEmbeddingPoint = ($event.target as HTMLInputElement).checked"
            />
          </div>
          <div class="setting-row">
            <label class="setting-label" for="setting-feature-colors">
              Color input/output neurons by feature
            </label>
            <input
              id="setting-feature-colors"
              type="checkbox"
              class="setting-toggle"
              :checked="useFeatureColorsForIO"
              @change="useFeatureColorsForIO = ($event.target as HTMLInputElement).checked"
            />
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--color-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-card);
  width: 360px;
  max-width: calc(100vw - 2rem);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.2rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.15s, background 0.15s;
}
.modal-close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.modal-body {
  padding: 0.75rem 1rem;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 2rem;
}

.setting-label {
  font-size: 0.8rem;
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
}

.setting-toggle {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: var(--color-interactive);
}
</style>
