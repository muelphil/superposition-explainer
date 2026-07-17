<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import BasesSection from './blogPost/BasesSection.vue'
import AutoencoderSection from './blogPost/AutoencoderSection.vue'
import SphericalCodesChart from './blogPost/SphericalCodesChart.vue'
import InterferenceIllustration from './blogPost/InterferenceIllustration.vue'
import EmbeddingSuperpositionIllustration from "./EmbeddingSuperpositionIllustration.vue";
import ParamScaleChart from './ParamScaleChart.vue'
import References from './References.vue'
import { activeBlockElement } from './blogPost/activeBlockBus'

// Dim top-level post-body sections that don't contain the currently active
// text-block. Implemented via direct classList toggling (driven by scroll,
// which changes rarely) rather than a `:has()` CSS selector — `:has()` here
// forced a full-subtree style recalculation on every reactive DOM update
// anywhere in `.blog-post`, including on every training tick unrelated to
// scrolling (confirmed via CPU trace: recalcStyle ~3.8s -> ~0.3s over an 8s
// training run after removing the `:has()` rules).
const postBodyRef = ref<HTMLElement | null>(null)
let stopWatch: (() => void) | null = null

onMounted(() => {
  stopWatch = watch(activeBlockElement, (el) => {
    const postBody = postBodyRef.value
    if (!postBody) return
    for (const child of Array.from(postBody.children)) {
      if (el && !child.contains(el)) {
        child.classList.add('dim-section')
      } else {
        child.classList.remove('dim-section')
      }
    }
  })
})

onUnmounted(() => stopWatch?.())
</script>

<template>
  <article class="blog-post">
    <div class="post-body" ref="postBodyRef">

      <!-- ── Header ───────────────────────────────────────────── -->
      <header class="post-header post-section">
        <!--        <div class="post-meta">-->
        <!--          <span class="post-date">April 2, 2025</span>-->
        <!--          <span class="post-separator">·</span>-->
        <!--          <span class="post-read-time">8 min read</span>-->
        <!--        </div>-->

        <h1 class="post-title">
          Superposition in Neural Networks: A Visual Exploration
        </h1>

        <p class="post-subtitle">
          How neural networks store more features than they have dimensions — and
          what this reveals about the hidden geometry of learned representations
        </p>

        <div class="post-authors">
          <span class="author-name">Philip Müller</span>
          <span class="author-separator">·</span>
          <span class="author-name">Peter Steinbach</span>
        </div>
      </header>

      <!-- ── Section 1: Introduction & Motivation ──────────────── -->
      <div class="post-section text-section">
        <h2>Introduction</h2>

        <p>
          This article is an interactive explorable explanation of <em>superposition</em> — a geometric
          phenomenon that may explain how neural network embeddings represent far more features than their
          dimensionality would naively allow. Guided by the experimental framework of Anthropic's
          <em>Toy Models of Superposition</em> (<a href="#Elhage2022">Elhage et al., 2022</a>), we build from geometric
          foundations
          to an interactive autoencoder and guide the reader through progressive experiments. Rather than introducing
          superposition as a predefined concept, the article encourages readers to discover it through hands-on
          experimentation. The phenomenon is then formally named and connected to broader ideas in representation
          learning.
        </p>

        <h2>Embeddings, Features, and the Dimensional Bottleneck</h2>

        <h3>What are embeddings?</h3>

        <p>
          Neural networks cannot operate directly on symbolic concepts such as words, grammatical roles,
          or semantic properties. Instead, they transform information into <strong>embeddings</strong> —
          fixed-length vectors of real numbers that live in a high-dimensional <strong>embedding space</strong>
          (also called a <strong>latent space</strong>). The purpose of such a space is to provide a compact
          numerical representation in which useful properties of the input can be encoded and manipulated
          through mathematical operations. In language models, this transformation happens at every stage:
          tokens are mapped to vectors, and each subsequent layer transforms these vectors into new ones,
          all of the same fixed dimensionality. Throughout this article, we use the term
          <strong>embedding space</strong> in a broad geometric sense: a vector space in which the model
          stores and processes internal information.
        </p>

        <p>
          Crucially, an embedding vector is not simply "meaning compressed into numbers." Different
          <strong>directions</strong> in the embedding space may correspond to different features of the
          input, and the component along each direction indicates how strongly that feature is present.
          This geometric view of embeddings, where features correspond to directions and feature activations correspond
          to the magnitudes along these directions, forms the basis for exploring how information can be organized in
          learned representations.
        </p>

        <h3>Why embedding dimension matters</h3>

        <p>
          The internal vectors of a neural network have a <strong>fixed dimensionality</strong>, which is a hard
          architectural constraint. In transformer models, this is called the <strong>embedding
          dimension</strong> or <strong>model dimension</strong>
          <katex-element expression="d_{\text{model}}"/>
          , and it determines how many coordinates are
          available at each layer to store and process information. Increasing the embedding dimension is
          expensive: in dense transformer architectures, a large fraction of the parameters reside in
          matrices whose size scales roughly with the <strong>square</strong> of the embedding dimension.
          Doubling the width therefore increases parameter count by roughly a factor of four in the
          dominant layers, and with it memory, training cost, and inference cost.
        </p>

        <figure class="post-figure">
          <ParamScaleChart/>
          <figcaption>
            Parameter count for a GPT-style dense decoder transformer (L = 96 layers, V = 50,257
            vocabulary, context window 2,048) as a function of embedding dimension
            <katex-element expression="d_{\text{model}}"/>
            . The dominant term
            <katex-element expression="\sim 12 L \cdot d_{\text{model}}^2"/>
            means that doubling
            the embedding dimension roughly quadruples the parameter count.
          </figcaption>
        </figure>

        <p>
          Modern large language models typically use embedding vectors in the range of several thousand dimensions,
          often roughly between <strong>3,072 to 12,288</strong> for publicly known transformer architectures. These are
          large vector spaces by human standards, but still far
          smaller than the number of concepts a model may need to represent. In practice, embedding
          dimension is not a free resource: model designers cannot simply keep adding dimensions for every
          property the model might need to represent.
        </p>

        <h2>The Apparent Mismatch: Far More Possible Features than Dimensions</h2>

        <h3>What are features?</h3>

        <p>
          In mechanistic interpretability research, a <strong>feature</strong> refers to a direction or
          pattern inside a model's internal activations that corresponds to a recognizable property of the
          input. Some features may be relatively concrete, such as <em>"it is something in plural," "this is
          about a person,"</em> or <em>"this is in past tense."</em> Others may be abstract, distributed, or difficult
          to name. Importantly, a feature is <strong>not necessarily a single neuron</strong> — in modern
          neural networks, many features appear to be represented as directions in activation space rather
          than being stored cleanly in one coordinate.
        </p>

        <p>
          Features are not directly observed ground truth. Models are trained end-to-end to minimize
          predictive loss, not to explicitly learn a predefined set of human-labeled concepts. Researchers
          can identify directions that correlate with meaningful concepts, but we do not have a complete
          list of the "true features" inside a large language model, nor do we know that the model's
          internal decomposition aligns perfectly with human categories. Significant research effort has
          gone into uncovering interpretable features inside trained models;
          the <a href="https://www.neuronpedia.org/" target="_blank" rel="noopener">Neuronpedia</a> project
          (<a href="#Lin2023">Lin, 2023</a>) catalogs discovered features for a small set of models and makes them
          searchable, illustrating
          both the
          progress made and the sheer scale of the problem.
        </p>

        <h3>The mismatch</h3>

        <p>
          The number of potentially useful features is vast. Consider just the English lexicon: the
          Oxford English Dictionary lists over <strong>170,000 words in current use</strong>, giving a sense
          of scale for how many distinct concepts exist even in a single domain. But features are not
          limited to individual words or explicit categories. Properties like
          <em>"is_plural," "refers_to_food,"</em> or <em>"negative_sentiment"</em> can be relevant across
          many different contexts, and many such features may be active simultaneously. This creates a
          challenge for any fixed-dimensional representation: assigning one dedicated dimension to each
          feature would quickly exceed the available space.
        </p>

        <figure class="post-figure">
          <EmbeddingSuperpositionIllustration></EmbeddingSuperpositionIllustration>
          <figcaption>
            A model with a few thousand embedding dimensions (e.g. 4096) must represent hundreds
            of thousands of potential features that may interact and trigger knowledge.
            The enormous feature space must be squeezed into a narrow bottleneck.
          </figcaption>
        </figure>

        <p>
          If a model has a few thousand hidden dimensions but may need to track a vastly larger number of
          potentially useful features, how can it do so? Empirically, large language models exhibit
          surprisingly rich behavior, suggesting that their internal representations do more than assign
          one feature to one axis. This article aims to provide an understanding of how models might deal
          with this mismatch. Rather than analyzing a full-scale language model, where architectural complexity and
          training data make it nearly impossible to isolate any single effect, we use a small, controlled model that
          lets us study the compression problem in isolation.
        </p>

        <h2>A Toy Model for Exploring the Mismatch</h2>

        <p>
          We study this problem using the experimental setup described in Anthropic's <em>Toy Models of
          Superposition</em> (<a href="#Elhage2022">Elhage et al., 2022</a>), built around an autoencoder, a simple
          neural network trained to reconstruct its
          input. The input first passes through a smaller embedding layer whose dimension is lower than that of the
          input, and the model then attempts to reconstruct the original input from this compressed embedding. Because
          the embedding dimension is smaller than the input dimension, the model cannot simply copy the data through the
          network. It is forced to learn how to compress many features into fewer dimensions, exactly the pressure we
          want to study. This gives us a controlled setting to explore how learned representations deal with the
          mismatch between features and available dimensions. The formal architecture, loss function, and training
          details are introduced in a later section.
        </p>

        <h2>What Comes Next: The Geometric Foundations</h2>

        <p>
          Before defining the toy autoencoder formally, we first develop the mathematical fundamentals
          that underpin it. The next section builds a geometric understanding of how features can be
          represented as vectors in an embedding space, how they can be recovered, and what goes wrong
          when more features must share fewer dimensions. This intuition directly motivates the
          architecture of the autoencoder and is essential for interpreting its learned representations.
        </p>
      </div>

      <!-- ── Mathematical Fundamentals — viz on right ──────────── -->
      <BasesSection/>

      <!-- ── Autoencoder — viz on right ────────────────────────── -->
      <AutoencoderSection/>

      <!-- ── Section 5: Superposition ──────────────────────────── -->
      <div class="post-section text-section">
        <h2>Superposition</h2>

        <h3>What you observed</h3>

        <p>
          Through the interactive experiments, you observed how the model navigates the
          dimensional bottleneck:
        </p>

        <ul>
          <li>With sufficient dimensions, the model learns an orthonormal basis, using one direction per
            feature and zero interference.
          </li>
          <li>Under a dimensional bottleneck with dense features, the model sacrifices low-importance
            features entirely rather than accept constant cross-talk.
          </li>
          <li>With sparse features, the model exploits opposite directions to double its capacity
            without introducing interference between orthogonal pairs.
          </li>
          <li>With more features than double the dimensionality, the model distributes feature directions
            at non-orthogonal angles, accepting genuine interference in exchange for representing
            more features.
          </li>
        </ul>

        <p>
          This behavior of encoding more features than there are embedding dimensions by
          distributing feature directions at non-orthogonal angles, accepting interference as a
          cost, is called <strong>superposition</strong>.
        </p>

        <h3>The tradeoff</h3>

        <p>
          Superposition is fundamentally a tradeoff between <strong>feature capacity</strong> and
          <strong>reconstruction fidelity</strong>. When the number of features is less than or
          equal to the embedding dimension, the model can assign each feature its own orthogonal
          direction, resulting in no interference and no reconstruction error. When there are more features than
          dimensions, every additional represented feature introduces cross-talk. Whether the
          tradeoff is worthwhile depends on a feature's importance, the degree of sparsity (which
          determines how rarely interference actually manifests), and how far apart the feature
          directions are arranged.
        </p>

        <h3>How bias and ReLU compensate</h3>

        <p>
          The bias
          <katex-element expression="b"/>
          and the ReLU activation — whose significance
          we deferred in the model definition — play a concrete role in making superposition work.
        </p>

        <p>
          In the superposition regime, you will notice that the feature direction vectors are all
          roughly of unit length and the learned bias is approximately equal across features. Under
          the assumptions of normalized feature directions and uniform bias, we can visualize why
          the model chose this particular bias value.
        </p>

        <figure class="post-figure">
          <InterferenceIllustration/>
          <figcaption>
            With one active feature, the projection of the embedding onto each other feature
            direction produces a nonzero interference term. The learned bias cancels this expected
            interference, and ReLU clamps negative residuals to zero.
          </figcaption>
        </figure>

        <p>
          The illustration shows a typical superposition solution. The five feature directions are
          arranged symmetrically, and we assume that only feature
          <katex-element expression="f_1"/>
          is active with activation
          <katex-element expression="x_1 = 1"/>
          . Ideally, the decoder would reconstruct a strong activation for
          <katex-element expression="f_1"/>
          and zero for all other features. However, because the feature directions are not orthogonal,
          the embedding inevitably projects onto the other directions as well. This is the interference
          introduced by superposition.
        </p>

        <p>
          The bias and ReLU work together to manage this interference. In the figure, the shaded region
          marks the range that ReLU will clamp to zero after the bias has been applied. The learned bias
          shifts all decoder outputs downward, reducing the spurious activations caused by interference.
          As a result, most of the interference from inactive features falls into the shaded region and
          is removed by ReLU.
        </p>

        <p>
          This correction is not perfect. Notice that part of the active feature direction
          <katex-element expression="w_1"/>
          also lies inside the shaded region. That portion is lost when ReLU is applied, reducing the
          reconstructed activation of the true feature. At the same time, some of the neighboring feature
          directions remain outside the shaded region, meaning that a small amount of interference
          survives. The model therefore cannot eliminate all error. Instead, it learns a compromise that
          balances two competing objectives: preserving the signal of active features while suppressing
          false activations caused by interference.
        </p>

        <p>
          This is why both the bias and the ReLU activation are essential in the superposition regime.
          Superposition creates interference between features, and the bias-ReLU combination provides a
          mechanism for selectively discarding much of that interference. The learned bias determines
          where the cutoff lies, and ReLU removes everything below it. Together, they allow the model to
          represent more features than dimensions while keeping reconstruction error manageable.
        </p>

        <h3>Scaling: it is exponential</h3>

        <p>
          In two dimensions, we observed 5 features packed at
          <katex-element expression="72^\circ"/>
          minimum separation, which amounts to
          <katex-element expression="2.5\times"/>
          the number of embedding
          dimensions. But how does this scale with dimensionality?
        </p>

        <p>
          The exiting news: the number of nearly-orthogonal directions that can coexist in a
          <katex-element expression="d"/>
          -dimensional space grows <strong>exponentially</strong>
          with
          <katex-element expression="d"/>
          .
        </p>

        <p>
          This is supported by a well-studied problem in combinatorial geometry known as <strong>spherical
          codes</strong>: given
          <katex-element expression="d"/>
          dimensions, how many unit vectors
          can be placed such that every pairwise angle exceeds some threshold
          <katex-element expression="\theta_{\min}"/>
          ? At
          <katex-element expression="\theta_{\min} = 90^\circ"/>
          , the answer is exactly
          <katex-element expression="2d"/>
          (the positive and negative direction along each axis).
          But as the angle threshold is relaxed even slightly below
          <katex-element expression="90^\circ"/>
          , the achievable count rises dramatically.
        </p>

        <figure class="post-figure">
          <SphericalCodesChart/>
          <figcaption>
            Maximum number of unit vectors that can be simultaneously placed in a
            <katex-element expression="d"/>
            -dimensional space such that every pair subtends an
            angle of at least
            <katex-element expression="\alpha"/>
            degrees. As the angle threshold
            decreases below
            <katex-element expression="90^\circ"/>
            , the achievable count rises in
             discrete steps, with higher-dimensional spaces accommodating substantially more vectors.
             Data from optimal spherical code bounds (<a href="#Cohn2024">Cohn, 2024</a>).
          </figcaption>
        </figure>

        <p>
          Concrete examples from spherical code tables (<a href="#Cohn2024">Cohn, 2024</a>):
          in
          <katex-element expression="d = 3"/>
          with a minimum angle of
          <katex-element expression="63^\circ"/>
          , up to <strong>12 unit vectors</strong> fit
          (
          <katex-element expression="4\times"/>
          the dimension). In
          <katex-element expression="d = 15"/>
          with the same threshold, up to <strong>990 unit
          vectors</strong> fit (
          <katex-element expression="66\times"/>
          the dimension).
        </p>

        <p>
          No closed-form formula exists for the exact packing number in general, but numerical
          constructions and theoretical bounds consistently show this exponential growth.
        </p>

        <p>
          A striking demonstration comes from
          <a href="https://youtu.be/9-Jl0dxWQs8?si=1JIOc0Yfg0T_H5iJ&t=1025" target="_blank" rel="noopener"><em>How might
            LLMs store facts</em> by Grant Sanderson (Chapter 7)</a>.
          In the video, he constructs 10,000 vectors in a 100-dimensional space and uses an algorithm
          to iteratively adjust their directions, gradually increasing their separation. The result is
          remarkable: the pairwise angles between all 10,000 vectors range between
          <katex-element expression="89^\circ"/>
          and
          <katex-element expression="91^\circ"/>
          , making them virtually orthogonal despite outnumbering the available dimensions by a factor
          of 100.
        </p>

        <p>
          This near-orthogonality in high dimensions is a consequence of the <strong>concentration
          of measure</strong>, a fundamental property of high-dimensional geometry. A precise
          version is given by the <strong>Johnson–Lindenstrauss lemma</strong> (<a href="#Johnson1984">Johnson &amp;
          Lindenstrauss, 1984</a>): any set of
          <katex-element expression="n"/>
          points can be projected into
          <katex-element expression="d = O(\log n / \varepsilon^2)"/>
          dimensions while preserving
          all pairwise distances within
          <katex-element expression="(1 \pm \varepsilon)."/>
          Inverting this, the number of vectors that can be placed nearly orthogonally in
          <katex-element expression="d"/>
          dimensions grows exponentially with
          <katex-element expression="d"/>
          : even a modest increase in dimensionality permits a
          dramatically larger number of nearly-orthogonal directions.
        </p>

        <h3>What this means for neural networks</h3>

        <p>
          Superposition is one contributing explanation for how language models (or any other overparameterized model)
          with embedding dimensions of a few thousand could represent a vastly larger number, potentially millions, of
          features with each pair of feature directions remaining nearly orthogonal.
          The interference between any two features stays proportional to the cosine of their angle
          (close to zero), and with the sparsity of real-world features, the expected cost of this
          interference remains manageable.
        </p>

        <p>
          This is the core insight of the <strong>superposition hypothesis</strong>: neural
          networks may routinely represent far more features than they have dimensions, because:
        </p>

        <ol>
          <li><strong>Features are sparse</strong> — most are inactive at any given time, so
            interference rarely manifests.
          </li>
          <li><strong>High-dimensional geometry is exponentially permissive</strong> — it allows
            vastly more nearly-orthogonal directions than the dimension count would suggest.
          </li>
          <li><strong>Nonlinearities suppress residual interference</strong> — bias and ReLU
            mitigate cross-talk.
          </li>
        </ol>

        <p>
          Superposition is both a powerful representational strategy and a fundamental challenge for
          interpretability. If each dimension encodes a mixture of many features, understanding what
          a model represents from its activations becomes far harder than if features were cleanly
          separated. This matters practically: identifying which features drive a particular
          prediction is essential for detecting unintended behaviors, diagnosing model failures, and
          verifying that safety-relevant properties are correctly represented. Without the ability to
          disentangle superposed representations, auditing or steering a model's internal reasoning
          remains severely limited.
        </p>

        <p>
          Superposition also provides a geometric explanation for <strong>polysemanticity</strong> —
          the widely observed phenomenon that individual neurons in neural networks respond to
          multiple, seemingly unrelated concepts (<a href="#Olah2020">Olah et al., 2020</a>). If features are stored in
          superposition, a single neuron's activation is a mixture of projections from many
          overlapping feature directions, so it naturally activates for multiple unrelated inputs.
        </p>

        <p>
          <strong>Sparse autoencoders</strong> (SAEs) have emerged as a practical tool for
          recovering individual features from superposed representations (<a href="#Bricken2023">Bricken et al.,
          2023</a>).
          Unlike the toy autoencoder studied here, SAEs project into a <em>higher</em>-dimensional
          hidden layer that is trained to be sparse — only a small number of hidden units activate
          for any given input. This sparsity in the hidden representation encourages each unit to
          isolate a single feature, effectively disentangling the superposition.
        </p>

        <p>
          The toy model studied here isolates superposition under simplifying assumptions: a linear
          encoder, synthetic data, tied weights, and a single layer. Real networks exhibit
          superposition in more complex forms. Nevertheless, the core geometric intuition
          transfers: high-dimensional spaces permit far more nearly-orthogonal directions than their
          dimension count suggests, and sparse activations make the resulting interference tolerable.
          For deeper exploration, we refer to the original <em>Toy Models of Superposition</em>
          (<a href="#Elhage2022">Elhage et al., 2022</a>) and the <em>Towards Monosemanticity</em> work on sparse
          autoencoders (<a href="#Bricken2023">Bricken et al., 2023</a>).
        </p>
      </div>

      <!-- ── Acknowledgements ──────────────────────────────────── -->
      <div class="post-section text-section acknowlegements">
        <h2>Acknowledgements</h2>
        <p>
          This work was conducted at the Helmholtz-Zentrum Dresden-Rossendorf (HZDR), whose support in the form of institutional resources and dedicated research time made it possible. Helmholtz AI provided a fruitful community context for this effort.
        </p>
      </div>

      <!-- ── About This Project ────────────────────────────────── -->
      <div class="post-section text-section about-project">
        <h2>About This Project</h2>
        <p>
          This project and its interactive demo are open source. The code is available on GitHub at
          <a href="https://github.com/muelphil/superposition-explainer" target="_blank" rel="noopener">github.com/muelphil/superposition-explainer</a>.
          If you find any bugs, have questions, or want to share feedback, please open an issue there.
        </p>
      </div>

      <!-- ── Section 7: References ─────────────────────────────── -->
      <References/>

    </div>
  </article>
</template>

<style>
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
  gap: 48px;
}

/* Every section is horizontally centered within the page */
.post-section {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Text-only sections: constrained prose column for legibility */
.text-section {
  max-width: var(--blog-prose-width);
}

/* ── Header ────────────────────────────────────────────────────── */
.post-header {
  max-width: var(--blog-prose-width);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 2.5rem;
}

/* ── Prose ─────────────────────────────────────────────────────── */
.post-body p {
  margin: 0 0 1.5rem;
}

.post-body h2 {
  letter-spacing: -0.01em;
}

.post-body h2:not(:first-child) {
  margin-top: 2.5rem;
  margin-bottom: 0.5rem;
}

.post-body h3 {
  letter-spacing: -0.01em;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
}

.post-body figure.post-figure {
  margin: 3em 0;
  text-align: center;
}

.post-body figure.post-figure img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.post-body figure.post-figure figcaption {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-label);
  line-height: 1.5;
}

.post-body blockquote {
  margin: 1.5rem 0;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--color-interactive);
  background: var(--color-active-paragraph-bg);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-style: italic;
  color: var(--color-text-strong);
}

.post-body blockquote p {
  margin: 0;
}

.post-body ol,
.post-body ul {
  margin: 0 0 1.5rem;
  padding-left: 1.5rem;
}

.post-body li {
  margin-bottom: 0.5rem;
}

.post-body a {
  color: var(--color-interactive);
  text-decoration: none;
}

.post-body a:hover {
  text-decoration: underline;
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
  align-items: center;
  gap: 0.75rem;
  font-size: 0.92rem;
}

.author-name {
  color: var(--color-text-strong);
  font-weight: 500;
}

.author-separator {
  color: var(--color-text-label);
}

@media (max-width: 768px) {
  .post-body {
    padding: 2rem 0.75rem 4rem;
  }

  .post-title {
    font-size: 1.5rem;
  }

  .post-subtitle {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }

  .post-header {
    padding-bottom: 1.5rem;
  }
}
</style>

<!--
  Non-scoped: shared styles for blog viz-section children (BasesSection, AutoencoderSection).
  Scoped under .blog-post to avoid polluting the global namespace.
-->
<style lang="scss">
$accent: var(--color-interactive);
//$accent: linear-gradient(
//    to bottom,
//    #6f9ef0 0%,
//    #7eaef6 18%,
//    #6898e8 36%,
//    #77a7f2 55%,
//    #628fdc 73%,
//    #729ff0 88%,
//    #6b99e9 100%
//);
$spotlight-opacity: 0.45;

/* ── Shared styles for viz sections ────────────────────────────── */

/* Text column — prevent overflow shrink */
.blog-post .text-column {
  min-width: 0;
}

/* Section headings inside viz sections */
.blog-post .section-heading {
  //font-size: 1.25rem;
  //font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
}

.blog-post .section-heading.full-span {
  grid-column: 1 / -1;
}

.blog-post .section-heading.experiments-heading {
  margin-top: 2rem;
}

/* ── Text block base (shared across all variants) ─────────────── */
.blog-post .text-column .text-block {
  margin: 0 0 1.5rem;
  padding: 0.5rem 1rem;
  border-left: 3px solid transparent;
  border-radius: 0 6px 6px 0;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

/* Paragraphs inside a text-block collapse their own bottom margin */
.blog-post .text-column .text-block p {
  margin: 0 0 1em;
}

.blog-post .text-column .text-block p:last-child {
  margin-bottom: 0;
}

/* ══ Underline Accent (direction-aware) ═══════════════════════ */
/* Growing uses .active-block::after origin (grows from that edge).
   Shrinking uses .text-block::after origin (shrinks toward that edge).

   Scroll down → grow from top, shrink toward bottom
   Scroll up   → grow from bottom, shrink toward top */
.blog-post .text-column .text-block {
  position: relative;
  border-left: none !important;
  transition: opacity 0.3s ease-out, background-color 0.25s ease;
  opacity: 1;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    background: $accent;
    border-radius: 3px;
    transform: scaleY(0);
    opacity: 0;
    transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  }
}

/* Dim non-active paragraphs when one is active */
.blog-post .text-column.has-active .text-block:not(.active-block) {
  opacity: $spotlight-opacity;
}

.blog-post .text-column .text-block:not(.active-block) {
  cursor: pointer;
}

.blog-post .text-column .text-block:not(.active-block):hover {
  background-color: var(--color-bg-subtle);
}

/* Dim all direct children of .post-body that don't contain the active block */
.blog-post .post-body > .dim-section {
  opacity: $spotlight-opacity;
  transition: opacity 0.3s ease-out;
}

// .blog-post .post-body > * { transition: opacity 0.3s ease-out; }
// Removed: forced style recalc on every DOM mutation inside .blog-post.
// The .dim-section class (above) already handles the only transition that
// actually fires (opacity dim on non-active sections).

/* Shrink direction (non-active state) */
body[data-scroll-dir="down"] .blog-post .text-block::after {
  transform-origin: bottom;
}

body[data-scroll-dir="up"] .blog-post .text-block::after {
  transform-origin: top;
}

/* Grow direction (active state) — must match specificity of shrink selectors */
body[data-scroll-dir="down"] .blog-post .active-block::after {
  transform-origin: top;
}

body[data-scroll-dir="up"] .blog-post .active-block::after {
  transform-origin: bottom;
}

.blog-post .text-column .active-block {
  background-color: var(--color-active-paragraph-bg);
  border-left: none !important;

  &::after {
    transform: scaleY(1);
    opacity: 1;
    transition: transform 0.35s ease-out, opacity 0.35s ease-out;
  }
}

/* Inline KaTeX in prose: match surrounding text size */
.blog-post .text-column p .katex,
.blog-post .text-section p .katex {
  font-size: 1em;
  color: var(--color-text-primary);
}

.blog-post .viz-column {
  min-width: 0;
  align-self: start;
}

.blog-post .viz-sticky {
  overflow: hidden;
}

.text-section.acknowlegements h2 {
  margin-top: 2.5rem;
}


</style>
