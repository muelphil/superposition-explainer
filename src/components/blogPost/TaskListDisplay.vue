<script setup lang="ts">
import type { TaskList } from './taskSystem'

defineProps<{
  taskList: TaskList
}>()

defineSlots<{
  insight(): any
}>()
</script>

<template>
  <div class="task-list">
    <div class="task-list-header">Tasks</div>

    <ul class="task-items">
      <li
        v-for="task in taskList.tasks.value"
        :key="task.id"
        class="task-item"
        :class="{
          'task-completed': task.completed,
          'task-blocked': task.blocked,
          'task-optional': task.optional,
        }"
      >
        <span class="task-checkbox" aria-hidden="true">
          <template v-if="task.completed">✓</template>
          <template v-else-if="task.blocked">🔒</template>
        </span>
        <span class="task-label">{{ task.label }}</span>
        <span v-if="task.optional" class="task-badge">optional</span>
      </li>
    </ul>

    <div v-if="taskList.stickyResolved.value" class="task-insight">
      <div class="task-insight-header">💡 Insight</div>
      <slot name="insight" />
    </div>
  </div>
</template>

<style scoped>
.task-list {
  margin-top: 1rem;
  border: 1px solid var(--color-task-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--color-task-bg);
}

.task-list-header {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-label);
  margin-bottom: 0.5rem;
}

.task-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.task-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  flex-shrink: 0;
  border-radius: 3px;
  border: 1.5px solid var(--color-task-checkbox-border);
  background: var(--color-bg);
  font-size: 0.72rem;
  color: var(--color-task-checkbox-border);
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.task-completed .task-checkbox {
  background: var(--color-task-check-bg);
  border-color: var(--color-task-check-bg);
  color: var(--color-bg);
}

.task-blocked .task-checkbox {
  border-color: var(--color-task-blocked);
  background: var(--color-bg);
  font-size: 0.65rem;
}

.task-blocked .task-label {
  color: var(--color-task-blocked);
}

.task-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: 0.1em 0.45em;
  border-radius: 3px;
}

/* ── Insight box ── */
.task-insight {
  margin-top: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  background: var(--color-task-insight-bg);
  border: 1px solid var(--color-task-insight-border);
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.task-insight-header {
  font-weight: 700;
  font-size: 0.8rem;
  margin-bottom: 0.3rem;
  color: var(--color-text-label);
}
</style>
