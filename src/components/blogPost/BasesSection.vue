<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import { createBasesService } from '../../services/BasesService'
import { useScrollActiveBlock } from './useScrollActiveParagraph'
import BasesVisualization from './BasesVisualization.vue'

const svc = createBasesService()
provide('basesService', svc)

const blockRefs = ref<(HTMLElement | null)[]>([])
const { activeBlockIndex } = useScrollActiveBlock(blockRefs)

watch(activeBlockIndex, (idx) => {
  if (idx >= 0) svc.setActiveParagraph(idx)
})
</script>

<template>
  <!-- Single-root section: owns its own CSS grid, centered at wider width -->
  <div class="bases-section post-section">
    <!-- Text column -->
    <div class="text-column">
      <h2 class="section-heading">Mathematical Fundamentals</h2>

      <!-- Block 0: feature space intro + embedding space (two related paragraphs) -->
      <div
        :ref="(el) => blockRefs[0] = el as HTMLElement"
        class="text-block"
        :class="{ 'active-block': activeBlockIndex === 0 }"
      >
        <p>
          Consider <katex-element expression="n" /> features
          <katex-element expression="f_1, \ldots, f_n" />. A feature vector
          <katex-element expression="\boldsymbol{x} = (x_1, \ldots, x_n)^\top" />
          lives in feature space <katex-element expression="F = \mathbb{R}^n" />,
          where each coordinate <katex-element expression="x_i" /> represents the activation strength
          of feature <katex-element expression="f_i" />. In feature space, features align with the
          standard coordinate axes, so reading off a feature activation is
          trivial: it is simply the corresponding coordinate.
        </p>
        <p>
          The model maps <katex-element expression="\boldsymbol{x}" /> into an embedding space
          <katex-element expression="H = \mathbb{R}^m" />, typically with fewer dimensions
          (<katex-element expression="m < n" />). Inside this space, each feature
          <katex-element expression="f_i" /> is represented by a learned feature direction vector
          <katex-element expression="w_i \in \mathbb{R}^m" />. These
          <katex-element expression="n" /> vectors form the columns of the weight matrix
          <katex-element expression="\boldsymbol{W}" />.
        </p>
      </div>

      <!-- Block 1: encoding — plain content, not a scroll-activatable block -->
      <p>
        Embedding with <katex-element expression="\boldsymbol{W}" /> computes a linear combination of the
        feature direction vectors, weighted by the feature activations:
        <katex-element expression="\boldsymbol{h} = \boldsymbol{W}\boldsymbol{x}" />.
        Each activation <katex-element expression="x_i" /> controls how much its
        direction <katex-element expression="w_i" /> contributes to the embedded representation.
      </p>

      <!-- Block 1 (activatable): decoding -->
      <div
        :ref="(el) => blockRefs[1] = el as HTMLElement"
        class="text-block"
        :class="{ 'active-block': activeBlockIndex === 1 }"
      >
        <p>
          Recovery with <katex-element expression="\boldsymbol{W}^\top" /> reverses this process.
          To recover feature activations from <katex-element expression="\boldsymbol{h}" />,
          we measure how aligned <katex-element expression="\boldsymbol{h}" /> is
          with each feature direction by computing the dot product. The
          transpose <katex-element expression="\boldsymbol{W}^\top" /> computes all projections at once.
        </p>
      </div>

      <!-- Block 2 (activatable): Gram matrix / interference -->
      <div
        :ref="(el) => blockRefs[2] = el as HTMLElement"
        class="text-block"
        :class="{ 'active-block': activeBlockIndex === 2 }"
      >
        <p>
          Whether this actually recovers the true feature activations depends
          on the geometry of the feature direction vectors. The matrix
          <katex-element expression="\boldsymbol{W}^\top\boldsymbol{W}" /> is the Gram matrix
          whose entries quantify the pairwise dot products — and thus the
          interference — between features.
        </p>
      </div>
    </div>

    <!-- Visualization column (sticky) -->
    <div class="viz-column">
      <div class="viz-sticky">
        <BasesVisualization />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Layout only. Shared typography and interaction styles (section-heading,
 * text-column .text-block, active-block, viz-column, viz-sticky) live in BlogPost.vue.
 */
.bases-section {
  max-width: calc(1400px - 4rem);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr minmax(300px, 400px);
  column-gap: 3rem;
  align-items: start;
}
</style>
