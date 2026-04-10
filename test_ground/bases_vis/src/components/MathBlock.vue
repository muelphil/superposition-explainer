<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import katex from 'katex'

const props = defineProps<{
  tex: string
  displayMode?: boolean
}>()

const el = ref<HTMLElement>()

function render() {
  if (!el.value) return
  katex.render(props.tex, el.value, {
    displayMode: props.displayMode ?? false,
    throwOnError: false,
  })
}

onMounted(render)
watch(() => props.tex, render)
</script>

<template>
  <span ref="el" class="math-block" :class="{ 'display-math': displayMode }"></span>
</template>

<style scoped>
.math-block.display-math {
  display: block;
  text-align: center;
  margin: 0.4rem 0;
}
</style>
