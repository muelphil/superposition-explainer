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
        </span>
        <span class="task-body">
          <span class="task-label" v-html="task.label"></span>
          <span v-if="task.note" class="task-note" v-html="task.note"></span>
        </span>
        <span v-if="task.progress" class="task-badge task-progress">{{ task.progress.current }}/{{ task.progress.total }}</span>
        <span v-if="task.optional" class="task-badge">optional</span>
      </li>
    </ul>

    <!-- Insight: rendered only when slot content is provided, spoiler-locked until all tasks complete -->
    <div
      v-if="$slots.insight"
      class="task-insight"
      :class="{ 'task-insight--locked': !taskList.stickyResolved.value }"
    >
      <div class="task-insight-header">Insight</div>
      <div class="task-insight-content">
        <slot name="insight" />
      </div>
      <div v-if="!taskList.stickyResolved.value" class="task-insight-lock-overlay">
        <span class="lock-message">Complete all tasks above to unlock this insight</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-list {
  margin: 1rem 0;
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

/* KaTeX inline math should match surrounding text size */
.task-label :deep(.katex) {
  font-size: 0.95em;
}

/* ── Insight box ── */
.task-insight {
  position: relative;
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

/* Content is blurred while locked */
.task-insight--locked .task-insight-content {
  filter: blur(5px);
  user-select: none;
  pointer-events: none;
}

/* Lock overlay: hidden by default, fades in on hover */
.task-insight-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 246, 255, 0.90); /* matches --color-task-insight-bg */
  border-radius: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.task-insight--locked:hover .task-insight-lock-overlay {
  opacity: 1;
}

.lock-message {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--color-text-label);
  text-align: center;
  padding: 0.5rem 1rem;
}
</style>
