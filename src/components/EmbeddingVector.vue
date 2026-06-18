<script setup lang="ts">
defineProps<{
  dimensionLabel?: string
}>()
</script>

<template>
  <div class="embedding-vector">
    <katex-element
      :display-mode="true"
      expression="\begin{bmatrix} 0.17 \\ -1.24 \\ 0.83 \\ \vdots \\ 0.42 \end{bmatrix}"
    />
    <div class="vector-label">{{ dimensionLabel || '4096 dimensions' }}</div>
  </div>
</template>

<style scoped>
.embedding-vector {
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

.embedding-vector :deep(.katex-display) {
  margin: 0;
}

.embedding-vector :deep(.katex) {
  font-size: 1.4em;
}

.vector-label {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: var(--font-family-label);
}
</style>
