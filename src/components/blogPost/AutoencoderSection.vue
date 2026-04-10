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
 * Layout only. Shared typography and interaction styles (section-heading,
 * text-column p, active-paragraph, viz-column, viz-sticky) live in BlogPost.vue.
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
</style>
