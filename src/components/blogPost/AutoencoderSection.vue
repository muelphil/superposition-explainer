<script setup lang="ts">
import {ref} from 'vue'
import {useScrollActiveParagraph} from './useScrollActiveParagraph'
import AutoencoderVisualization from './AutoencoderVisualization.vue'

const paragraphRefs = ref<(HTMLElement | null)[]>([])
const {activeParagraphIndex} = useScrollActiveParagraph(paragraphRefs)
</script>

<template>
  <!-- Single-root section: owns its own CSS grid, centered at wider width -->
  <div class="ae-section post-section">
    <!-- Text column -->
    <div class="text-column">
      <h2 class="section-heading">Autoencoder</h2>

      <p
          :ref="(el) => paragraphRefs[0] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 0 }"
      >
        The clean encode/decode symmetry of an orthonormal basis — embed with
        <em>W</em>, recover with <em>Wᵀ</em> — is the geometric intuition behind
        the architecture of our toy autoencoder. In this section, we define the
        model formally.
      </p>

      <p
          :ref="(el) => paragraphRefs[1] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 1 }"
      >
        The encoder computes the embedding <em>h</em> as a linear combination of
        feature direction vectors <em>wᵢ</em>, weighted by the feature activations
        <em>xᵢ</em>: <em>h = Wx</em>. The decoder projects the embedding onto each
        feature direction and applies a bias and ReLU nonlinearity:
        <em>x̂ = ReLU(Wᵀh + b)</em>.
      </p>

      <p
          :ref="(el) => paragraphRefs[2] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 2 }"
      >
        Using <em>Wᵀ</em> as the decoder is directly motivated by the geometry of
        orthonormal bases. In the ideal case where the columns of <em>W</em> are
        orthonormal, <em>Wᵀ</em> is the exact inverse — encoding and decoding are
        perfectly symmetric.
      </p>

      <p
          :ref="(el) => paragraphRefs[3] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 3 }"
      >
        We generate synthetic feature vectors directly in feature space rather
        than training on real text. Each coordinate cleanly represents one
        disentangled feature, isolating the geometric compression problem from
        all other aspects of learning.
      </p>

      <p
          :ref="(el) => paragraphRefs[4] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 4 }"
      >
        The loss function weights each feature by an importance factor
        <em>Iᵢ = αⁱ</em>, where <em>α ∈ (0, 1)</em> controls the decay.
        This creates a natural hierarchy: the model must prioritise the
        first features and can afford to sacrifice later ones when dimensions
        are limited.
      </p>
    </div>

    <!-- Visualization column (sticky) -->
    <div class="viz-column">
      <div class="viz-sticky">
        <AutoencoderVisualization/>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * AutoencoderSection is a self-contained CSS grid row.
 * Width: calc(1400px - 4rem), centered via post-section in parent.
 * Columns: 1fr text | AE viz (min 512px, max 600px)
 */
.ae-section {
  max-width: calc(1400px - 4rem);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr minmax(512px, 600px);
  column-gap: 3rem;
  align-items: start;
}

.text-column {
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
  border-left-color: #3b82f6 !important;
}

/* Viz column stretches to row height so sticky works */
.viz-column {
  min-width: 0;
  align-self: stretch;
}

.viz-sticky {
  position: sticky;
  top: 6rem;
}
</style>
