<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Lightbulb } from 'lucide-vue-next'
import type { TaskList } from './taskSystem'
import { useTextReveal } from './useTextReveal'

const props = defineProps<{
  taskList: TaskList
}>()

const insightRef = ref<HTMLElement | null>(null)
const revealContainer = ref<HTMLElement | null>(null)

const { revealedHtml, visible, done } = useTextReveal(revealContainer, props.taskList.stickyResolved)
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

  <!-- Revealed insight: only shown after unlock -->
  <template v-if="taskList.stickyResolved.value">
    <div
      ref="insightRef"
      class="insight-block"
    >
      <div class="task-list-header">
        <Lightbulb :size="14" class="header-icon" />
        Insight
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
  padding-top: 10px;
}


.header-icon {
  flex-shrink: 0;
}

.insight-content {
  min-height: 1.2em;
}

</style>
