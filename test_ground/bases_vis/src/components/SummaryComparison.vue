<script setup lang="ts">
import MathBlock from './MathBlock.vue'
</script>

<template>
  <section class="summary-section">
    <h2 class="summary-heading">Summary</h2>
    <div class="summary-strip">
      <!-- Arbitrary -->
      <div class="summary-card">
        <h4 style="color: #92400e">Arbitrary</h4>
        <div class="formula">
          <MathBlock tex="\mathbf{c} = W^{-1}\mathbf{x}" display-mode />
        </div>
        <p class="message">
          Coordinates are <strong>coupled</strong>. Must solve a full linear system.
        </p>
      </div>

      <!-- Orthogonal -->
      <div class="summary-card">
        <h4 style="color: #1e40af">Orthogonal</h4>
        <div class="formula">
          <MathBlock
            tex="c_i = \frac{\mathbf{x}\cdot\mathbf{w}_i}{\|\mathbf{w}_i\|^2}"
            display-mode
          />
        </div>
        <p class="message">
          Coordinates are <strong>independent</strong>. Projection + scale correction.
        </p>
      </div>

      <!-- Orthonormal -->
      <div class="summary-card">
        <h4 style="color: #5b21b6">Orthonormal</h4>
        <div class="formula">
          <MathBlock tex="\mathbf{c} = W^\top\!\mathbf{x}" display-mode />
        </div>
        <p class="message">
          Projections <strong>are</strong> the coordinates. The transpose is the readout.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.summary-section {
  margin-top: 2.5rem;
}

.summary-heading {
  text-align: center;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.summary-card h4 {
  font-weight: 700;
}
</style>
