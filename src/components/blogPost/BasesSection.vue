<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import { createBasesService } from '../../services/BasesService'
import { useScrollActiveParagraph } from './useScrollActiveParagraph'
import BasesVisualization from './BasesVisualization.vue'

const svc = createBasesService()
provide('basesService', svc)

const paragraphRefs = ref<(HTMLElement | null)[]>([])
const { activeParagraphIndex } = useScrollActiveParagraph(paragraphRefs)

watch(activeParagraphIndex, (idx) => {
  svc.setActiveParagraph(idx)
})
</script>

<template>
  <!-- Fragment: two root elements participate directly in BlogPost's grid -->

  <!-- Text column: explicit grid-column:1 so auto-placement never fills col 2 -->
  <div class="text-column">
    <h2 class="section-heading">Mathematical Fundamentals</h2>

    <p
      :ref="(el) => paragraphRefs[0] = el as HTMLElement"
      :class="{ 'active-paragraph': activeParagraphIndex === 0 }"
    >
      Consider <em>n</em> features <em>f₁, …, fₙ</em>. A feature vector
      <em>x = (x₁, …, xₙ)ᵀ</em> lives in feature space <em>F = ℝⁿ</em>,
      where each coordinate <em>xᵢ</em> represents the activation strength
      of feature <em>fᵢ</em>. In feature space, features align with the
      standard coordinate axes, so reading off a feature activation is
      trivial: it is simply the corresponding coordinate.
    </p>

    <p
      :ref="(el) => paragraphRefs[1] = el as HTMLElement"
      :class="{ 'active-paragraph': activeParagraphIndex === 1 }"
    >
      The model maps <em>x</em> into an embedding space <em>H = ℝᵐ</em>,
      typically with fewer dimensions (<em>m &lt; n</em>). Inside this
      space, each feature <em>fᵢ</em> is represented by a learned feature
      direction vector <em>wᵢ ∈ ℝᵐ</em>. These <em>n</em> vectors form
      the columns of the weight matrix <em>W</em>.
    </p>

    <p
      :ref="(el) => paragraphRefs[2] = el as HTMLElement"
      :class="{ 'active-paragraph': activeParagraphIndex === 2 }"
    >
      Embedding with <em>W</em> computes a linear combination of the
      feature direction vectors, weighted by the feature activations:
      <em>y = Wx</em>. Each activation <em>xᵢ</em> controls how much its
      direction <em>wᵢ</em> contributes to the embedded representation.
    </p>

    <p
      :ref="(el) => paragraphRefs[3] = el as HTMLElement"
      :class="{ 'active-paragraph': activeParagraphIndex === 3 }"
    >
      Recovery with <em>Wᵀ</em> reverses this process. To recover feature
      activations from <em>y</em>, we measure how aligned <em>y</em> is
      with each feature direction by computing the dot product. The
      transpose <em>Wᵀ</em> computes all projections at once.
    </p>

    <p
      :ref="(el) => paragraphRefs[4] = el as HTMLElement"
      :class="{ 'active-paragraph': activeParagraphIndex === 4 }"
    >
      Whether this actually recovers the true feature activations depends
      on the geometry of the feature direction vectors. The matrix
      <em>WᵀW</em> is the Gram matrix whose entries quantify the pairwise
      dot products — and thus the interference — between features.
    </p>
  </div>

  <!-- Visualization column (sticky, auto-placed to col 2 by parent grid) -->
  <div class="viz-column">
    <div class="viz-sticky">
      <BasesVisualization />
    </div>
  </div>
</template>

<style scoped>
/*
 * These are direct children of BlogPost's grid.
 * .text-column → col 1 (explicit), align-self: start so it doesn't stretch
 * .viz-column  → col 2 (auto-placed), stretches to row height so sticky works
 */
.text-column {
  grid-column: 1;
  align-self: start;
  min-width: 0;
}

.section-heading {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
  color: var(--color-text-primary);
}

.text-column p {
  margin: 0 0 1.5rem;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid transparent;
  border-radius: 0 6px 6px 0;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.active-paragraph {
  background-color: rgba(59, 130, 246, 0.06);
  border-left-color: #3b82f6;
}

/* Stretches to full row height (row height = text-column content height) */
.viz-column {
  min-width: 0;
}

/* Sticky within the stretched viz-column; constrain bases viz to 400px */
.viz-sticky {
  position: sticky;
  top: 6rem;
  max-width: 400px;
}
</style>
