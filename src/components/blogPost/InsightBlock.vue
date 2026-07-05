<script setup lang="ts">
import { ref } from 'vue'
import { Lightbulb } from 'lucide-vue-next'
import type { TaskList } from './taskSystem'
import { useTextReveal } from './useTextReveal'

const props = defineProps<{
  taskList: TaskList
}>()

const revealContainer = ref<HTMLElement | null>(null)

const revealTriggered = ref(false)
const triggerReveal = () => {
  if (!revealTriggered.value) revealTriggered.value = true
}

const { revealedHtml, visible, done } = useTextReveal(revealContainer, revealTriggered)
</script>

<template>
  <!-- Hidden container: slot renders here so KaTeX can process the content -->
  <div
    v-show="false"
    ref="revealContainer"
    class="insight-source"
  >
    <slot />
  </div>

  <!-- Pulsating insight header — appears when all tasks are done -->
  <template v-if="taskList.stickyResolved.value">
    <div
      class="insight-block"
      :class="{ 'insight-revealed': revealTriggered }"
    >
      <div
        class="task-list-header insight-header"
        :class="{ 'insight-pulsing': !revealTriggered }"
        role="button"
        tabindex="0"
        @click="triggerReveal"
        @keydown.enter="triggerReveal"
        @keydown.space.prevent="triggerReveal"
      >
        <Lightbulb :size="14" class="header-icon" />
        <template v-if="!revealTriggered">Click to reveal insight</template>
        <template v-else>Insight</template>
      </div>
      <div class="insight-content">
        <span v-if="visible" v-html="revealedHtml"></span>
      </div>
    </div>
  </template>
</template>

<style scoped>
.insight-source {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.insight-block {
  margin: 0;
  border: none;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  padding-top: 1em;
}

.header-icon {
  flex-shrink: 0;
}

.insight-content {
  display: none;
  min-height: 1.2em;
  padding-left: 0.5em;
}

.insight-revealed .insight-content {
  display: block;
}

/* Hover scale only while pulsing (before reveal) */
.insight-header.insight-pulsing {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.insight-header.insight-pulsing:hover {
  transform: scale(1.05);
}

/* Pulsing: stronger, using the interactive blue */
.insight-pulsing {
  animation: insight-pulse 1.4s ease-in-out infinite;
  white-space: nowrap;
}

/* No bottom margin/header spacing when insight hasn't been revealed yet */
.insight-block:not(.insight-revealed) .insight-header {
  margin-bottom: 0;
}

@keyframes insight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(101, 146, 223, 0.6),
                0 0 8px 2px rgba(101, 146, 223, 0.15);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(101, 146, 223, 0),
                0 0 16px 6px rgba(101, 146, 223, 0.25);
    filter: brightness(1.15);
  }
}

</style>