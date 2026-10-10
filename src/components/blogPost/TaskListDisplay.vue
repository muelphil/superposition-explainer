<script setup lang="ts">
import { computed } from 'vue'
import type { TaskList, TaskState } from './taskSystem'
import { FlaskConical } from 'lucide-vue-next'
import InsightBlock from './InsightBlock.vue'
import TaskCheckbox from './TaskCheckbox.vue'

const props = defineProps<{
  taskList: TaskList
}>()

defineSlots<{
  insight(): any
}>()

const mandatoryTasks = computed(() =>
  props.taskList.tasks.value.filter((t: TaskState) => !t.optional)
)
const optionalTasks = computed(() =>
  props.taskList.tasks.value.filter((t: TaskState) => t.optional)
)

/** Notes are v-html, so action links are handled by delegation via `[data-note-action]`. */
function onNoteClick(event: MouseEvent, task: TaskState) {
  if (!task.noteAction || !(event.target as HTMLElement).closest('[data-note-action]')) return
  event.preventDefault()
  if (task.blocked) return  // action disabled until the task's prerequisites are met
  event.stopPropagation()  // don't trigger the surrounding text-block's scroll-to-block
  task.noteAction()
}
</script>

<template>
  <div class="task-list">
    <div class="task-list-header">
      <FlaskConical :size="14" class="header-icon" />
      Tasks
    </div>

    <ul class="task-items">
      <li
        v-for="task in mandatoryTasks"
        :key="task.id"
        class="task-item"
        :class="{
          'task-completed': task.completed,
          'task-blocked': task.blocked,
        }"
      >
        <TaskCheckbox :completed="task.completed" :blocked="task.blocked" />
        <span class="task-body">
          <span class="task-label" v-html="task.label"></span>
          <span v-if="task.note" class="task-note" v-html="task.note" @click="onNoteClick($event, task)"></span>
        </span>
        <span v-if="task.progress" class="task-badge task-progress">{{ task.progress.current }}/{{ task.progress.total }}</span>
      </li>
    </ul>

    <!-- Optional tasks section -->
    <template v-if="optionalTasks.length">
      <div class="optional-section-header">Optional</div>
      <ul class="task-items">
        <li
          v-for="task in optionalTasks"
          :key="task.id"
          class="task-item"
          :class="{
            'task-completed': task.completed,
            'task-blocked': task.blocked,
          }"
        >
          <TaskCheckbox :completed="task.completed" :blocked="task.blocked" />
          <span class="task-body">
            <span class="task-label" v-html="task.label"></span>
            <span v-if="task.note" class="task-note" v-html="task.note" @click="onNoteClick($event, task)"></span>
          </span>
          <span v-if="task.progress" class="task-badge task-progress">{{ task.progress.current }}/{{ task.progress.total }}</span>
        </li>
      </ul>
    </template>

    <!-- Insight appended inside same box, only after unlock -->
    <InsightBlock v-if="$slots.insight" :task-list="taskList">
      <slot name="insight" />
    </InsightBlock>
  </div>
</template>

<style>
.task-list {
  /*padding: 0 1rem;*/
}

.task-list-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  margin-bottom: 0.8rem;
  font-family: var(--font-family-label);
  color: white;
  background-color: var(--color-interactive);
  inline-size: min-content;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.header-icon {
  flex-shrink: 0;
}

.optional-section-header {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-family: var(--font-family-label);
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
}

.task-items {
  list-style: none;
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 0.5em !important;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.task-blocked .task-label, .task-blocked .task-note, .task-blocked .katex{
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

.task-note [data-note-action] {
  font-style: normal;
  color: var(--color-interactive);
  cursor: pointer;
}

.task-blocked .task-note [data-note-action] {
  color: var(--color-task-blocked);
  cursor: default;
  text-decoration: none;
}

/* ── Inline resample button icon (visual reference in task text) ── */
.inline-resample-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 2px;
  background: transparent;
  border: 1px solid var(--color-interactive-disabled);
  border-radius: 50%;
  color: var(--color-text-action);
  vertical-align: middle;
  pointer-events: none;
  user-select: none;
}

</style>
