<script setup lang="ts">
</script>

<template>
  <div class="stub-view">
    <h3 class="stub-title">Training Statistics</h3>
    <p class="stub-desc">Loss curve, embedding direction count, average minimum angle graphs — coming in the next step.</p>
  </div>
</template>

<style scoped>
.stub-view {
  background: var(--color-bg-stub);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.5rem;
  min-height: 200px;
}

.stub-title {
  font-size: 1rem;
  color: var(--color-text-label);
}

.stub-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0;
}
</style>
