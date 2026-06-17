<script setup lang="ts">
import type { TaskList } from './taskSystem'
import { FlaskConical } from 'lucide-vue-next'
import InsightBlock from './InsightBlock.vue'

defineProps<{
  taskList: TaskList
}>()

defineSlots<{
  insight(): any
}>()
</script>

<template>
  <div class="task-list">
    <div class="task-list-header">
      <FlaskConical :size="14" class="header-icon" />
      Tasks
    </div>

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
        </span>
        <span class="task-body">
          <span class="task-label" v-html="task.label"></span>
          <span v-if="task.note" class="task-note" v-html="task.note"></span>
        </span>
        <span v-if="task.progress" class="task-badge task-progress">{{ task.progress.current }}/{{ task.progress.total }}</span>
        <span v-if="task.optional" class="task-badge">optional</span>
      </li>
    </ul>

    <!-- Insight appended inside same box, only after unlock -->
    <InsightBlock v-if="$slots.insight" :task-list="taskList">
      <slot name="insight" />
    </InsightBlock>
  </div>
</template>

<style scoped>
.task-list {
  border: 1px solid var(--color-task-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--color-task-bg);
}

.task-list-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-label);
  margin-bottom: 0.5rem;
}

.header-icon {
  flex-shrink: 0;
}

.task-items {
  list-style: none;
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.task-item {
  display: flex;
  align-items: flex-start;
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
  margin-top: 0.15rem; /* align with first line of text */
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

/* ── Task body (label + note) ── */
.task-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.1rem;
}

.task-note {
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-secondary);
  line-height: 1.4;
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
  margin-top: 0.2rem;
  flex-shrink: 0;
}

.task-progress {
  font-variant-numeric: tabular-nums;
  text-transform: none;
}

</style>
