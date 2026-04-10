<script setup lang="ts">
import MathBlock from './MathBlock.vue'
</script>

<template>
  <header class="blog-header">
    <h1>Recovering Coordinates in Different Bases</h1>
    <p class="subtitle">
      Given a vector and a set of basis vectors, how do we find its coordinates?
      The answer depends entirely on the <strong>geometry of the basis</strong>.
    </p>
    <p class="intro">
      Below we explore the same target vector
      <MathBlock tex="\mathbf{x} = (3,\, 2)" />
      represented in three different bases — <em>arbitrary</em>, <em>orthogonal</em>,
      and <em>orthonormal</em>. Each step reveals how the structure of the basis
      simplifies (or complicates) the coordinate recovery problem, building intuition
      for why <MathBlock tex="W^\top" /> becomes the natural readout operator.
    </p>
  </header>
</template>

<style scoped>
.blog-header {
  max-width: 740px;
  margin: 0 auto 2rem;
  text-align: center;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.6rem;
}

.subtitle {
  font-size: 1.05rem;
  color: var(--color-text-muted);
  margin-bottom: 0.8rem;
}

.intro {
  font-size: 0.95rem;
  color: var(--color-text);
  line-height: 1.7;
}
</style>
