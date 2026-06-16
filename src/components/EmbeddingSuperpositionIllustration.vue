<script setup lang="ts">
import EmbeddingVector from './EmbeddingVector.vue'
import FeatureCloud from './FeatureCloud.vue'
import FunnelPaths from './FunnelPaths.vue'
</script>

<template>
  <div class="superposition-illustration-container">
    <FunnelPaths :arrow-count="16">
      <template #vector>
        <EmbeddingVector dimension-label="4096 dimensions" />
      </template>
      <template #features>
        <FeatureCloud :feature-row-count="22" />
      </template>
    </FunnelPaths>
  </div>
</template>

<style scoped>
.superposition-illustration-container {
  position: relative;
  width: 100%;
  max-width: var(--blog-prose-width, 720px);
  margin: 2rem auto;
  overflow: hidden;
}

.superposition-illustration-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 100%;
  background: linear-gradient(to left, transparent, var(--color-bg));
  pointer-events: none;
  z-index: 1000;
}
</style>
