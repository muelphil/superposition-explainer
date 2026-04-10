<script setup lang="ts">
import BlogSectionHeader from './components/BlogSectionHeader.vue'
import BasisPanel from './components/BasisPanel.vue'
import SummaryComparison from './components/SummaryComparison.vue'
import { basisPresets } from './lib/basisPresets'
</script>

<template>
  <div class="page-container">
    <BlogSectionHeader />

    <div class="comparison-grid">
      <BasisPanel
        v-for="preset in basisPresets"
        :key="preset.type"
        :preset="preset"
      />
    </div>

    <SummaryComparison />

    <!-- Bridge to superposition -->
    <div class="bridge-callout">
      <strong>What happens when there are more features than orthogonal directions?</strong><br />
      Some interference between coordinates becomes unavoidable — the basis can no longer
      perfectly decouple them. This is the heart of the
      <em>superposition</em> phenomenon explored in the next section.
    </div>
  </div>
</template>

<style scoped></style>
