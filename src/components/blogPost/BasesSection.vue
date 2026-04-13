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
  svc.setActiveParagraph(idx)
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
          Consider <em>n</em> features <em>f₁, …, fₙ</em>. A feature vector
          <em>x = (x₁, …, xₙ)ᵀ</em> lives in feature space <em>F = ℝⁿ</em>,
          where each coordinate <em>xᵢ</em> represents the activation strength
          of feature <em>fᵢ</em>. In feature space, features align with the
          standard coordinate axes, so reading off a feature activation is
          trivial: it is simply the corresponding coordinate.
        </p>
        <p>
          The model maps <em>x</em> into an embedding space <em>H = ℝᵐ</em>,
          typically with fewer dimensions (<em>m &lt; n</em>). Inside this
          space, each feature <em>fᵢ</em> is represented by a learned feature
          direction vector <em>wᵢ ∈ ℝᵐ</em>. These <em>n</em> vectors form
          the columns of the weight matrix <em>W</em>.
        </p>
      </div>

      <!-- Block 1: encoding -->
      <div
        :ref="(el) => blockRefs[1] = el as HTMLElement"
        class="text-block"
        :class="{ 'active-block': activeBlockIndex === 1 }"
      >
        <p>
          Embedding with <em>W</em> computes a linear combination of the
          feature direction vectors, weighted by the feature activations:
          <em>y = Wx</em>. Each activation <em>xᵢ</em> controls how much its
          direction <em>wᵢ</em> contributes to the embedded representation.
        </p>
      </div>

      <!-- Block 2: decoding -->
      <div
        :ref="(el) => blockRefs[2] = el as HTMLElement"
        class="text-block"
        :class="{ 'active-block': activeBlockIndex === 2 }"
      >
        <p>
          Recovery with <em>Wᵀ</em> reverses this process. To recover feature
          activations from <em>y</em>, we measure how aligned <em>y</em> is
          with each feature direction by computing the dot product. The
          transpose <em>Wᵀ</em> computes all projections at once.
        </p>
      </div>

      <!-- Block 3: Gram matrix / interference -->
      <div
        :ref="(el) => blockRefs[3] = el as HTMLElement"
        class="text-block"
        :class="{ 'active-block': activeBlockIndex === 3 }"
      >
        <p>
          Whether this actually recovers the true feature activations depends
          on the geometry of the feature direction vectors. The matrix
          <em>WᵀW</em> is the Gram matrix whose entries quantify the pairwise
          dot products — and thus the interference — between features.
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
