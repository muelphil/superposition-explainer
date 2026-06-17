<script setup lang="ts">

defineProps<{
  completed: boolean
  blocked?: boolean
}>()
</script>

<template>
  <span
    class="task-checkbox"
    :class="{ 'task-completed': completed, 'task-blocked': blocked && !completed }"
    aria-hidden="true"
  >
    <span v-if="completed" class="check-mark">
      <svg viewBox="15.422 -2.994 93.032 80.607" class="check-svg" fill="none" stroke="currentColor" stroke-width="19" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15.422 51.349l27.292 26.264 65.74-80.607"/>
      </svg>
    </span>
  </span>
</template>

<style scoped>
.task-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  flex-shrink: 0;
  margin-top: 0.15rem;
  border: 1.5px solid var(--color-task-checkbox-border);
  background: var(--color-bg);
  font-size: 0.72rem;
  color: var(--color-task-checkbox-border);
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  border-radius: 4px;
}

.task-completed {
  background: var(--color-interactive);
  border-color: var(--color-interactive);
  color: var(--color-bg);
}

.task-blocked {
  border-color: var(--color-task-blocked);
}

.check-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: check-pop 0.3s ease-out forwards;
}

.check-svg {
  width: 9px;
  height: 9px;
}

@keyframes check-pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
