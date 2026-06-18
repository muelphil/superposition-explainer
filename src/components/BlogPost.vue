<script setup lang="ts">
import BasesSection from './blogPost/BasesSection.vue'
import AutoencoderSection from './blogPost/AutoencoderSection.vue'
import SphericalCodesChart from './blogPost/SphericalCodesChart.vue'
import InterferenceIllustration from './blogPost/InterferenceIllustration.vue'
import EmbeddingSuperpositionIllustration from "./EmbeddingSuperpositionIllustration.vue";
import ParamScaleChart from './ParamScaleChart.vue'
</script>

<template>
  <article class="blog-post">
    <div class="post-body">

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
          <div class="author">
            <div class="author-avatar">PM</div>
            <div class="author-info">
              <span class="author-name">Philip Müller</span>
              <span class="author-affiliation">Helmholtz-Zentrum Dresden-Rossendorf</span>
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

      <!-- ── Section 1: Introduction & Motivation ──────────────── -->
      <div class="post-section text-section">
        <h2>Introduction</h2>

        <p>
          This article is an interactive explorable explanation of <em>superposition</em> — a geometric
          phenomenon that may explain how neural network embeddings represent far more features than their
          dimensionality would naively allow. Guided by the experimental framework of Anthropic's
          <em>Toy Models of Superposition</em> (Elhage et al., 2022), we build from geometric foundations
          to a toy autoencoder and guide the reader through progressive experiments. Rather than presenting
          superposition as a predefined concept, the article lets readers discover it through hands-on
          interaction with the accompanying visualizations, and then formally names and contextualizes the
          phenomenon.
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
          This geometric picture — features as directions, activations as magnitudes along those
          directions — is foundational to the analysis that follows, and will be developed formally in the
          next section.
        </p>

        <h3>Why embedding dimension matters</h3>

        <p>
          The internal vectors of a neural network have a <strong>fixed dimensionality</strong> — a hard
          architectural constraint. In transformer models, this is called the <strong>embedding
          dimension</strong> or <strong>model dimension</strong> <katex-element expression="d_{\text{model}}" />, and it determines how many coordinates are
          available at each layer to store and process information. Increasing the embedding dimension is
          expensive: in dense transformer architectures, a large fraction of the parameters reside in
          matrices whose size scales roughly with the <strong>square</strong> of the embedding dimension.
          Doubling the width therefore increases parameter count by roughly a factor of four in the
          dominant layers — and with it memory, training cost, and inference cost.
        </p>

        <figure class="post-figure">
          <ParamScaleChart />
          <figcaption>
            Parameter count for a GPT-style dense decoder transformer (L = 96 layers, V = 50,257
            vocabulary, context window 2,048) as a function of embedding dimension
            <katex-element expression="d_{\text{model}}" />. The dominant term
            <katex-element expression="\sim 12 L \cdot d_{\text{model}}^2" /> means that doubling
            the embedding dimension roughly quadruples the parameter count.
          </figcaption>
        </figure>

        <p>
          Modern large language models typically use embedding dimensions in the range of roughly
          <strong>3,072 to 12,288</strong>. These are large vector spaces by human standards, but still far
          smaller than the number of concepts a model may need to represent. In practice, embedding
          dimension is not a free resource: model designers cannot simply keep adding dimensions for every
          property the model might need to represent.
        </p>

        <h2>The Apparent Mismatch: Far More Possible Features than Dimensions</h2>

        <h3>What are features?</h3>

        <p>
          In mechanistic interpretability research, a <strong>feature</strong> refers to a direction or
          pattern inside a model's internal activations that corresponds to a recognizable property of the
          input. Some features are relatively concrete, such as "it is something in plural," "this is
          about a person," or "this is in past tense." Others may be abstract, distributed, or difficult
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
          gone into uncovering interpretable features inside trained models; projects such as
          <a href="https://www.neuronpedia.org/" target="_blank" rel="noopener">Neuronpedia</a> catalog
          discovered features for a small set of models and make them searchable, illustrating both the
          progress made and the sheer scale of the problem.
        </p>

        <h3>The mismatch</h3>

        <p>
          The number of potentially useful features is vast — and fundamentally combinatorial. Consider
          just the English lexicon: the Oxford English Dictionary lists over <strong>170,000 words in
          current use</strong>, giving a sense of scale for how many distinct concepts exist even in a
          single domain. But features are not merely a flat list — they are fundamentally
          <strong>combinatorial</strong>. Properties like "is_plural," "refers_to_food," or
          "negative_sentiment" combine freely, and each combination constitutes a distinct feature. This
          means the space of potentially useful features grows combinatorially with the number of
          underlying properties, and at any given point many features are likely active simultaneously —
          far exceeding what any fixed number of embedding dimensions could accommodate with one axis per
          feature.
        </p>

        <figure class="post-figure">
          <EmbeddingSuperpositionIllustration></EmbeddingSuperpositionIllustration>
          <figcaption>
            A model with a few thousand embedding dimensions (e.g. 4096) must represent hundreds
            of thousands of potentially features that may interact and trigger knowledge.
            The enormous feature space must be squeezed into a narrow bottleneck.
          </figcaption>
        </figure>

        <p>
          If a model has a few thousand hidden dimensions but may need to track a vastly larger number of
          potentially useful features, how can it do so? Empirically, large language models exhibit
          surprisingly rich behavior, suggesting that their internal representations do more than assign
          one feature to one axis. This article aims to provide an understanding of how models might deal
          with this mismatch. Rather than analyzing a full-scale language model — where architecture
          complexity and training data make it nearly impossible to isolate any single effect — we use a
          small, controlled model that lets us study the compression problem in isolation.
        </p>

        <h2>A Toy Model for Exploring the Mismatch</h2>

        <p>
          We study this problem using the experimental setup described in Anthropic's <em>Toy Models of
          Superposition</em> (2022), built around an <strong>autoencoder</strong> — a simple neural
          network trained to reconstruct its input. The input first passes through a smaller
          <strong>embedding layer</strong> whose dimension is lower than that of the input, and the model
          then attempts to reconstruct the original input from this compressed embedding. Because the
          embedding dimension is smaller than the input dimension, the model cannot simply copy the data
          through — it is forced to learn how to compress many features into fewer dimensions, exactly the
          pressure we want to study. This gives us a controlled setting to explore how learned
          representations deal with the mismatch between features and available dimensions. The formal
          architecture, loss function, and training details are introduced in a later section.
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
      <BasesSection />

      <!-- ── Autoencoder — viz on right ────────────────────────── -->
      <AutoencoderSection />

      <!-- ── Section 5: Superposition ──────────────────────────── -->
      <div class="post-section text-section">
        <h2>Superposition</h2>

        <h3>What you observed</h3>

        <p>
          In Experiment 3, the model exploited the non-negativity of feature activations together
          with sparsity to place features in opposite directions — doubling its capacity without
          introducing interference between orthogonal pairs. In Experiment 4, the model went
          further: it packed five features into two dimensions at angles of
          <katex-element expression="72^\circ" />, where <strong>every pair of features genuinely
          interferes</strong>. No pair is orthogonal. The model accepted cross-talk between all
          feature directions in exchange for representing more features than the embedding space
          can accommodate without overlap.
        </p>

        <p>
          This behavior — encoding more features than there are embedding dimensions by
          distributing feature directions at non-orthogonal angles, accepting interference as a
          cost — is called <strong>superposition</strong>.
        </p>

        <h3>The tradeoff</h3>

        <p>
          Superposition is fundamentally a tradeoff between <strong>feature capacity</strong> and
          <strong>reconstruction fidelity</strong>. When the number of features is less than or
          equal to the embedding dimension, the model can assign each feature its own orthogonal
          direction — no interference, no reconstruction error. When there are more features than
          dimensions, every additional represented feature introduces cross-talk. Whether the
          tradeoff is worthwhile depends on a feature's importance, the degree of sparsity (which
          determines how rarely interference actually manifests), and how far apart the feature
          directions are arranged.
        </p>

        <h3>How bias and ReLU compensate</h3>

        <p>
          The bias <katex-element expression="b" /> and the ReLU activation — whose significance
          we deferred in the model definition — play a concrete role in making superposition work.
        </p>

        <p>
          In the superposition regime, you will notice that the feature direction vectors are all
          roughly of unit length and the learned bias is approximately equal across features. Under
          these assumptions — normalized feature directions and uniform bias — we can visualize why
          the model chose this particular bias value.
        </p>

        <figure class="post-figure">
          <InterferenceIllustration />
          <figcaption>
            With one active feature, the projection of the embedding onto each other feature
            direction produces a nonzero interference term. The learned bias cancels this expected
            interference, and ReLU clamps negative residuals to zero.
          </figcaption>
        </figure>

        <p>
          Assume only feature <katex-element expression="f_1" /> is active. The projection of the
          embedding onto each other feature direction <katex-element expression="w_j" /> produces a
          nonzero interference term proportional to the alignment between
          <katex-element expression="w_j" /> and <katex-element expression="w_1" />. With all
          feature directions of length 1, this interference is directly visible as the projection
          of each other feature direction onto <katex-element expression="f_1" />. More precisely,
          for an inactive feature <katex-element expression="f_j" />, the raw decoder output before
          ReLU is
          <katex-element expression="(W^Ty + b)_j = \sum_{k \neq j} (w_j \cdot w_k) \, x_k + b_j" />
          — pure interference from active features, offset by the bias. The model learns
          <katex-element expression="b_j" /> to approximately cancel the expected interference:
          <katex-element expression="b_j \approx -\sum_{k \neq j} (w_j \cdot w_k) \cdot \mathbb{E}[x_k]" />.
          When the residual interference after bias correction is negative, ReLU clamps it to zero
          — correctly indicating that the feature is not present.
        </p>

        <p>
          This is why non-negative feature activations matter: with strictly non-negative ground
          truth, any negative decoder output is necessarily an error, and ReLU can safely discard
          it. Together, bias and ReLU act as a denoising mechanism — bias shifts the interference
          below zero, and ReLU eliminates it.
        </p>

        <h3>Scaling: it is exponential</h3>

        <p>
          In two dimensions, we observed 5 features packed at <katex-element expression="72^\circ" />
          minimum separation — <katex-element expression="2.5\times" /> the number of embedding
          dimensions. How does this scale with dimensionality?
        </p>

        <p>
          The number of nearly-orthogonal directions that can coexist in a
          <katex-element expression="d" />-dimensional space grows <strong>exponentially</strong>
          with <katex-element expression="d" />.
        </p>

        <p>
          This is a well-studied problem in combinatorial geometry known as <strong>spherical
          codes</strong>: given <katex-element expression="d" /> dimensions, how many unit vectors
          can be placed such that every pairwise angle exceeds some threshold
          <katex-element expression="\theta_{\min}" />? At
          <katex-element expression="\theta_{\min} = 90^\circ" />, the answer is exactly
          <katex-element expression="2d" /> (the positive and negative direction along each axis).
          But as the angle threshold is relaxed even slightly below
          <katex-element expression="90^\circ" />, the achievable count rises dramatically.
        </p>

        <figure class="post-figure">
          <SphericalCodesChart />
          <figcaption>
            Maximum number of unit vectors that can be simultaneously placed in a
            <katex-element expression="d" />-dimensional space such that every pair subtends an
            angle of at least <katex-element expression="\alpha" /> degrees. As the angle threshold
            decreases below <katex-element expression="90^\circ" />, the achievable count rises in
            discrete steps, with higher-dimensional spaces accommodating substantially more vectors.
          </figcaption>
        </figure>

        <p>
          Concrete examples from optimal spherical code tables
          (<a href="https://spherical-codes.org/" target="_blank" rel="noopener">spherical-codes.org</a>):
          in <katex-element expression="d = 3" /> with a minimum angle of
          <katex-element expression="63^\circ" />, up to <strong>12 unit vectors</strong> fit
          (<katex-element expression="\sim 4\times" /> the dimension). In
          <katex-element expression="d = 15" /> with the same threshold, up to <strong>990 unit
          vectors</strong> fit (<katex-element expression="\sim 66\times" /> the dimension).
        </p>

        <p>
          No closed-form formula exists for the exact packing number in general, but numerical
          constructions and theoretical bounds consistently show this exponential growth.
        </p>

        <p>
          A striking demonstration comes from 3Blue1Brown
          (<a href="https://youtu.be/9-Jl0dxWQs8?si=1JIOc0Yfg0T_H5iJ&t=1025" target="_blank" rel="noopener"><em>How might LLMs store facts</em>, Chapter 7</a>):
          it is possible to place <strong>10,000 vectors in just 100 dimensions</strong> while all
          pairwise angles remain between <katex-element expression="89^\circ" /> and
          <katex-element expression="91^\circ" /> — virtually orthogonal, despite outnumbering the
          dimensions by a factor of 100.
        </p>

        <p>
          This near-orthogonality in high dimensions is a consequence of the <strong>concentration
          of measure</strong>, a fundamental property of high-dimensional geometry. A precise
          version is given by the <strong>Johnson–Lindenstrauss lemma</strong>: any set of
          <katex-element expression="n" /> points can be projected into
          <katex-element expression="d = O(\log n / \varepsilon^2)" /> dimensions while preserving
          all pairwise distances within <katex-element expression="(1 \pm \varepsilon)" />.
          Inverting this, the number of vectors that can be placed nearly orthogonally in
          <katex-element expression="d" /> dimensions grows exponentially with
          <katex-element expression="d" />: even a modest increase in dimensionality permits a
          dramatically larger number of nearly-orthogonal directions.
        </p>

        <h3>What this means for neural networks</h3>

        <p>
          Superposition is one contributing explanation for how language models with embedding
          dimensions of a few thousand could represent a vastly larger number of features —
          potentially millions — with each pair of feature directions remaining nearly orthogonal.
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
          interference rarely manifests.</li>
          <li><strong>High-dimensional geometry is exponentially permissive</strong> — it allows
          vastly more nearly-orthogonal directions than the dimension count would suggest.</li>
          <li><strong>Nonlinearities suppress residual interference</strong> — bias and ReLU
          discard small cross-talk.</li>
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
          multiple, seemingly unrelated concepts (Olah et al., 2020). If features are stored in
          superposition, a single neuron's activation is a mixture of projections from many
          overlapping feature directions, so it naturally activates for multiple unrelated inputs.
        </p>

        <p>
          <strong>Sparse autoencoders</strong> (SAEs) have emerged as a practical tool for
          recovering individual features from superposed representations (Bricken et al., 2023).
          Unlike the toy autoencoder studied here, SAEs project into a <em>higher</em>-dimensional
          hidden layer that is trained to be sparse — only a small number of hidden units activate
          for any given input. This sparsity in the hidden representation encourages each unit to
          isolate a single feature, effectively disentangling the superposition.
        </p>

        <p>
          It is worth noting that superposition is not the only mechanism by which neural networks
          achieve rich internal representations. Other contributing factors include
          <strong>computation in superposition</strong>, where networks perform operations directly
          on superposed representations without first disentangling them (Elhage et al., 2022), and
          nonlinear feature interactions that go beyond the linear directional model assumed here.
        </p>

        <p>
          Finally, the toy model studied in this article isolates the superposition phenomenon under
          controlled conditions, but it differs from real neural networks in important ways: it uses
          a linear encoder (no nonlinearity until the decoder), relies on synthetic data with known
          ground-truth features, employs tied weights, and studies only a single layer. Real networks
          exhibit superposition in more complex forms — across multiple layers, with nonlinear
          encoding, and over natural data distributions where features themselves are not predefined.
          Nevertheless, the core geometric intuition — that high-dimensional spaces permit far more
          nearly-orthogonal directions than their dimension count suggests, and that sparse
          activations make the resulting interference tolerable — transfers directly to the
          large-scale setting.
        </p>
      </div>

      <!-- ── Section 6: Recap ──────────────────────────────────── -->
      <div class="post-section text-section">
        <h2>Recap</h2>

        <p>
          This article traced a path from the dimensional bottleneck in neural network embeddings
          to the geometric phenomenon of superposition.
        </p>

        <p>
          We began with the observation that neural networks must represent a vast, combinatorial
          space of features within embedding vectors of fixed and limited dimensionality. The
          mathematical foundations established that representing features as directions in embedding
          space naturally leads to the framework of the weight matrix
          <katex-element expression="W" />, its transpose <katex-element expression="W^T" /> for
          recovery, and the Gram matrix <katex-element expression="W^TW" /> as a measure of
          interference between feature directions. When features outnumber dimensions, perfect
          orthogonality is impossible, and some interference becomes unavoidable.
        </p>

        <p>
          The toy autoencoder provided a controlled setting to study how a model navigates this
          constraint. Through progressive experiments, we observed that:
        </p>

        <ul>
          <li>With sufficient dimensions, the model learns an orthonormal basis — one direction per
          feature, zero interference.</li>
          <li>Under a dimensional bottleneck with dense features, the model sacrifices low-importance
          features entirely rather than accept constant interference.</li>
          <li>With sparse features, the model exploits opposite directions to double its capacity
          without introducing cross-talk between orthogonal pairs.</li>
          <li>With further pressure, the model distributes feature directions at non-orthogonal
          angles, accepting genuine interference in exchange for representing more features — the
          hallmark of superposition.</li>
        </ul>

        <p>
          Superposition is a powerful representational strategy that leverages sparsity and the
          exponential capacity of high-dimensional geometry. It is also a fundamental obstacle for
          interpretability: when features overlap in activation space, understanding what a model
          internally represents requires tools — such as sparse autoencoders — to disentangle them.
        </p>

        <p>
          The toy model studied here operates under simplifying assumptions: a linear encoder,
          synthetic data, tied weights, and a single layer. Real neural networks exhibit
          superposition in more complex forms, and active research continues to develop both
          theoretical understanding and practical tools for working with superposed representations.
          For further reading, we recommend the original <em>Toy Models of Superposition</em>
          paper (Elhage et al., 2022), the <em>Towards Monosemanticity</em> work on sparse
          autoencoders (Bricken et al., 2023), and the growing body of work in the VISxAI community
          on making these phenomena accessible through interactive explanation.
        </p>
      </div>

      <!-- ── Section 7: References ─────────────────────────────── -->
      <div class="post-section text-section">
        <h2>References</h2>

        <ul class="references-list">
          <li>
            Elhage, N., Hume, T., Olsson, C., Schiefer, N., et al. (2022).
            <em>Toy Models of Superposition.</em> Transformer Circuits Thread.
            <a href="https://transformer-circuits.pub/2022/toy_model/index.html" target="_blank" rel="noopener">transformer-circuits.pub</a>
          </li>
          <li>
            Bricken, T., Templeton, A., Batson, J., Chen, B., et al. (2023).
            <em>Towards Monosemanticity: Decomposing Language Models With Dictionary Learning.</em>
            Transformer Circuits Thread.
            <a href="https://transformer-circuits.pub/2023/monosemantic-features/index.html" target="_blank" rel="noopener">transformer-circuits.pub</a>
          </li>
          <li>
            Olah, C., Cammarata, N., Schubert, L., Goh, G., Petrov, M., &amp; Carter, S. (2020).
            <em>Zoom In: An Introduction to Circuits.</em> Distill.
            <a href="https://distill.pub/2020/circuits/zoom-in/" target="_blank" rel="noopener">distill.pub</a>
          </li>
          <li>
            Johnson, W. B., &amp; Lindenstrauss, J. (1984). Extensions of Lipschitz mappings into a
            Hilbert space. <em>Contemporary Mathematics</em>, 26, 189–206.
          </li>
          <li>
            3Blue1Brown. (2024). <em>How might LLMs store facts | Chapter 7, Deep Learning.</em>
            YouTube.
            <a href="https://youtu.be/9-Jl0dxWQs8" target="_blank" rel="noopener">youtube.com</a>
          </li>
          <li>
            Cohn, H. (2024). <em>Table of Spherical Codes.</em> Dataset. MIT DSpace.
            <a href="https://hdl.handle.net/1721.1/153543" target="_blank" rel="noopener">hdl.handle.net/1721.1/153543</a>.
            See also:
            <a href="https://spherical-codes.org/" target="_blank" rel="noopener">spherical-codes.org</a>
          </li>
          <li>
            Neuronpedia.
            <a href="https://www.neuronpedia.org/" target="_blank" rel="noopener">neuronpedia.org</a>
          </li>
        </ul>
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

.post-body :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 2rem 0 0.5rem;
  color: var(--color-text-primary);
}

.post-body :deep(figure.post-figure) {
  margin: 1.5rem 0 2rem;
  text-align: center;
}

.post-body :deep(figure.post-figure img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.post-body :deep(figure.post-figure figcaption) {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.post-body :deep(ol),
.post-body :deep(ul) {
  margin: 0 0 1.5rem;
  padding-left: 1.5rem;
}

.post-body :deep(li) {
  margin-bottom: 0.5rem;
}

.post-body :deep(a) {
  color: var(--color-interactive);
  text-decoration: none;
}

.post-body :deep(a:hover) {
  text-decoration: underline;
}

.post-body :deep(.references-list) {
  list-style: none;
  padding-left: 0;
}

.post-body :deep(.references-list li) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
  text-indent: -1.5rem;
  font-size: 0.92rem;
  line-height: 1.6;
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
  line-height: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
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
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
  color: var(--color-text-primary);
}

/* ── Text block base (shared across all variants) ─────────────── */
.blog-post .text-column .text-block {
  margin: 0 0 1.5rem;
  //padding: 0.5rem 0 0.5rem 1rem;
  padding-left: 1rem;
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
  transition: opacity 0.3s ease-out;
  opacity: 1;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: $accent;
    border-radius: 2px;
    transform: scaleY(0);
    opacity: 0;
    transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  }
}

/* Dim non-active paragraphs when one is active */
.blog-post .text-column:has(.active-block) .text-block:not(.active-block) {
  opacity: $spotlight-opacity;
}
.blog-post .text-column .text-block:not(.active-block) {
  cursor: pointer;
}

/* Dim all direct children of .post-body that don't contain the active block */
.blog-post:has(.active-block) .post-body > :not(:has(.active-block)) {
  opacity: $spotlight-opacity;
  transition: opacity 0.3s ease-out;
}
.blog-post .post-body > * {
  transition: opacity 0.3s ease-out;
}

/* Shrink direction (non-active state) */
.blog-post .text-column[data-scroll-dir="down"] .text-block::after {
  transform-origin: bottom;
}
.blog-post .text-column[data-scroll-dir="up"] .text-block::after {
  transform-origin: top;
}

/* Grow direction (active state) — must match specificity of shrink selectors */
.blog-post .text-column[data-scroll-dir="down"] .active-block::after {
  transform-origin: top;
}
.blog-post .text-column[data-scroll-dir="up"] .active-block::after {
  transform-origin: bottom;
}

.blog-post .text-column .active-block {
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
}
.blog-post .viz-column {
  min-width: 0;
  align-self: stretch;
  /*align-content: center;*/
}

/* Sticky visualization panel */
.blog-post .viz-sticky {
  position: sticky;
  top: 6rem;
}
</style>
