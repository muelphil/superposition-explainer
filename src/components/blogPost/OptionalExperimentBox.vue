<script setup lang="ts">
import { FlaskConical } from 'lucide-vue-next'

defineProps<{ title: string }>()
</script>

<template>
  <aside class="optional-experiment">
    <div class="optional-header">
      <FlaskConical :size="16" class="header-icon" />
      {{ title }}
    </div>
    <div class="optional-body">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.optional-experiment {
  margin: 0 0 1.5rem;
  padding: 0.9rem 1.25rem;
  border-left: 3px solid var(--color-interactive);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  background: var(--color-bg-subtle);
}

.optional-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-icon {
  flex-shrink: 0;
  color: var(--color-interactive);
}

.optional-body {
  font-size: 0.92rem;
  line-height: 1.6;
}

.optional-body :deep(p),
.optional-body :deep(ol) {
  margin: 0 0 0.6rem;
}

.optional-body :deep(li) {
  margin-bottom: 0.35rem;
}

.optional-body > :deep(:last-child) {
  margin-bottom: 0;
}
</style>
