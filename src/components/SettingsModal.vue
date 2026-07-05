<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X, Moon, Sun, Monitor } from 'lucide-vue-next'
import { showEmbeddingPoint, useFeatureColorsForIO, dimNeuronsOnHover, themeMode } from '../services/SettingsService'

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
          <div class="setting-group">
            <span class="setting-group-label">Appearance</span>
            <div class="theme-toggle-group">
              <label class="theme-radio-label" :class="{ active: themeMode === 'light' }" for="theme-light">
                <input
                  id="theme-light"
                  type="radio"
                  name="theme-mode"
                  value="light"
                  :checked="themeMode === 'light'"
                  @change="themeMode = 'light'"
                  class="theme-radio"
                />
                <Sun :size="14" class="theme-icon" />
                Light
              </label>
              <label class="theme-radio-label" :class="{ active: themeMode === 'dark' }" for="theme-dark">
                <input
                  id="theme-dark"
                  type="radio"
                  name="theme-mode"
                  value="dark"
                  :checked="themeMode === 'dark'"
                  @change="themeMode = 'dark'"
                  class="theme-radio"
                />
                <Moon :size="14" class="theme-icon" />
                Dark
              </label>
              <label class="theme-radio-label" :class="{ active: themeMode === 'system' }" for="theme-system">
                <input
                  id="theme-system"
                  type="radio"
                  name="theme-mode"
                  value="system"
                  :checked="themeMode === 'system'"
                  @change="themeMode = 'system'"
                  class="theme-radio"
                />
                <Monitor :size="14" class="theme-icon" />
                System
              </label>
            </div>
          </div>

          <div class="setting-divider"></div>

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
          <div class="setting-row">
            <label class="setting-label" for="setting-dim-neurons">
              Dim other neurons on hover
            </label>
            <input
              id="setting-dim-neurons"
              type="checkbox"
              class="setting-toggle"
              :checked="dimNeuronsOnHover"
              @change="dimNeuronsOnHover = ($event.target as HTMLInputElement).checked"
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
  border-radius: var(--radius-lg);
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

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-group-label {
  font-family: var(--font-family-label);
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.theme-toggle-group {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.theme-radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  padding: 0.4rem 0.5rem;
  background: var(--color-bg-secondary);
  transition: background 0.15s, color 0.15s;
  border-right: 1px solid var(--color-border);
}

.theme-radio-label:last-child {
  border-right: none;
}

.theme-radio-label.active {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.theme-radio-label:hover:not(.active) {
  background: var(--color-bg-hover);
}

.theme-radio {
  display: none;
}

.theme-icon {
  flex-shrink: 0;
}

.setting-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.5rem 0;
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
