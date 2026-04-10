<script setup lang="ts">
import BasesSection from './blogPost/BasesSection.vue'
import AutoencoderSection from './blogPost/AutoencoderSection.vue'
</script>

<template>
  <article class="blog-post">
    <div class="post-body">

      <!-- ── Header ───────────────────────────────────────────── -->
      <header class="post-header post-section">
        <div class="post-meta">
          <span class="post-date">April 2, 2025</span>
          <span class="post-separator">·</span>
          <span class="post-read-time">8 min read</span>
        </div>

        <h1 class="post-title">
          Superposition in Neural Networks: A Visual Exploration
        </h1>

        <p class="post-subtitle">
          How neural networks store more features than they have dimensions — and
          what this reveals about the hidden geometry of learned representations
        </p>

        <div class="post-authors">
          <div class="author">
            <div class="author-avatar">JD</div>
            <div class="author-info">
              <span class="author-name">Jane Doe</span>
              <span class="author-affiliation">Institute for AI Research</span>
            </div>
          </div>
          <div class="author">
            <div class="author-avatar">MS</div>
            <div class="author-info">
              <span class="author-name">Max Schmidt</span>
              <span class="author-affiliation">Department of Computer Science</span>
            </div>
          </div>
        </div>
      </header>

      <!-- ── Intro paragraphs ──────────────────────────────────── -->
      <div class="post-section text-section">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
          irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
          deserunt mollit anim id est laborum.
        </p>

        <p>
          Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis
          molestie pretium placerat, arcu purus accumsan libero, vel molestie diam turpis at
          libero. Sed et lorem ut diam molestie luctus. Pellentesque habitant morbi tristique
          senectus et netus et malesuada fames ac turpis egestas. Donec quis nibh at felis
          congue commodo. Sed pellentesque, augue quis elementum sollicitudin, libero risus
          tristique velit, a consequat nibh augue et felis.
        </p>

        <p>
          Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi.
          Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus,
          elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget
          erat. Cras molestie lacus at nulla semper gravida.
        </p>
      </div>

      <!-- ── Mathematical Fundamentals — viz on right ──────────── -->
      <BasesSection />

      <!-- ── Transition paragraphs ─────────────────────────────── -->
      <div class="post-section text-section">
        <h2>The Geometry of Learned Representations</h2>

        <p>
          Donec lectus ipsum, tristique commodo, lobortis elementum, accumsan blandit, lorem.
          Morbi aliquet libero vel sapien. Cras molestie diam id velit. Praesent augue augue,
          iaculis nec, auctor at, aliquam vel, mi. In hac habitasse platea dictumst. Maecenas
          tempor purus eu dolor. Phasellus vel lorem vel enim euismod commodo. Sed accumsan leo
          et orci.
        </p>

        <p>
          Nullam rutrum. Phasellus fringilla velit quis purus. Proin vel nisl. Quisque fringilla
          euismod enim. Pellentesque habitant morbi tristique senectus et netus et malesuada fames
          ac turpis egestas. Proin semper, ante vitae sollicitudin posuere, metus quam iaculis
          nibh, vitae scelerisque nunc massa eget pede. Sed velit urna, interdum vel, ultricies
          vel, faucibus at, quam. Donec elit est, consectetuer eget, consequat quis, tempus quis,
          wisi.
        </p>

        <p>
          In in nunc. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per
          inceptos hymenaeos. Donec ullamcorper fringilla eros. Fusce in sapien eu purus dapibus
          commodo. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus
          mus. Cras faucibus condimentum odio. Sed id ligula quis est convallis tempor.
        </p>
      </div>

      <!-- ── Autoencoder — viz on right ────────────────────────── -->
      <AutoencoderSection />

      <!-- ── Conclusion paragraphs ─────────────────────────────── -->
      <div class="post-section text-section">
        <h2>Conclusion</h2>

        <p>
          Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio
          et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis
          ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris
          sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales,
          augue velit cursus nunc.
        </p>

        <p>
          Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
          nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus
          error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
          quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
        </p>
      </div>

    </div>
  </article>
</template>

<style scoped>
/* ── Blog article ──────────────────────────────────────────────── */
.blog-post {
  color: var(--color-text-primary);
}

/* ── Post body: stacked sections, no grid ──────────────────────── */
.post-body {
  display: flex;
  flex-direction: column;
  padding: 4rem 2rem 8rem;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-text-primary);
  gap: 3.5rem;
}

/* Every section is horizontally centered within the page */
.post-section {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Text-only sections: match main app-content width */
.text-section {
  max-width: calc(1200px - 4rem);
}

/* ── Header ────────────────────────────────────────────────────── */
.post-header {
  max-width: calc(1200px - 4rem);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 2.5rem;
}

/* ── Prose ─────────────────────────────────────────────────────── */
.post-body :deep(p) {
  margin: 0 0 1.5rem;
}

.post-body :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 2.5rem 0 0.75rem;
  color: var(--color-text-primary);
}

/* ── Header internals ──────────────────────────────────────────── */
.post-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.25rem;
}

.post-separator {
  color: var(--color-border);
}

.post-title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
  letter-spacing: -0.02em;
}

.post-subtitle {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--color-text-label);
  margin: 0 0 2rem;
  font-weight: 400;
}

.post-authors {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.author {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.author-avatar {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: var(--color-bg-stub);
  color: var(--color-text-label);
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.author-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.author-affiliation {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>

<!--
  Non-scoped: shared styles for blog viz-section children (BasesSection, AutoencoderSection).
  Scoped under .blog-post to avoid polluting the global namespace.
-->
<style>
/* ── Shared styles for viz sections ────────────────────────────── */

/* Text column — prevent overflow shrink */
.blog-post .text-column {
  min-width: 0;
}

/* Section headings inside viz sections */
.blog-post .section-heading {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
  color: var(--color-text-primary);
}

/* Paragraphs: spacing + scroll-active indicator via border-left */
.blog-post .text-column p {
  margin: 0 0 1.5rem;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid transparent;
  border-radius: 0 6px 6px 0;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

/* Active paragraph highlight (scroll-driven) */
.blog-post .active-paragraph {
  background-color: var(--color-active-paragraph-bg);
  border-left-color: var(--color-interactive) !important;
}

/* Viz column stretches to match text height so the sticky container works */
.blog-post .viz-column {
  min-width: 0;
  align-self: stretch;
}

/* Sticky visualization panel */
.blog-post .viz-sticky {
  position: sticky;
  top: 6rem;
}
</style>
