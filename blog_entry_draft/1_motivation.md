## Features, Embeddings, and Why Superposition Matters

### What do we mean by a “feature”?

* When mechanistic interpretability researchers talk about a **feature**, they usually mean a direction or pattern inside a model’s internal activations that corresponds to some recognizable property of the input.
* Some features are relatively concrete and human-interpretable, such as:
    * “the current token is plural”
    * “the text is talking about a person”
    * “the sentence is in the past tense”
    * “the next word is likely a city name”
* Other features may be much more abstract, distributed, or difficult to name.
* Importantly, a feature is **not necessarily a single neuron**.
* In modern neural networks, and especially in transformers, many features appear to be represented **across directions in activation space**, rather than being stored cleanly in one coordinate.
* This distinction is crucial for understanding superposition: the model may encode more useful concepts than there are available coordinate axes.

### What are embeddings?

* Neural networks cannot operate directly on symbolic concepts such as words, grammatical roles, or semantic properties.
* Instead, they transform information into **vectors of numbers**.
* These numeric vectors live in a high-dimensional space often called an **embedding space**, **latent space**, or **activation space**.
* The purpose of such a space is not to assign one coordinate to one concept, but to provide a compact numerical representation in which many useful properties can be encoded and manipulated.
* In language models, this happens at many stages:

    * tokens are mapped to vectors
    * intermediate activations inside layers are vectors
    * MLPs and attention blocks repeatedly transform vectors into new vectors
* Throughout this article, we will use the term **embedding space** in a broad geometric sense: a vector space in which the model stores and processes internal information.

### A useful mental model

* It is tempting to imagine an embedding vector as “meaning compressed into numbers.”
* A more precise mental model is:

    * the vector itself is a point in a high-dimensional space
    * different **directions** in that space correspond to different potentially useful features
    * the amount of movement along each direction determines how strongly that feature is present
* In the simplest possible case, each feature would get its own clean axis.
* But real models do not generally have that luxury.
* Instead, many features may have to share the same finite-dimensional space.

### Important caveat: features are not directly observed ground truth

* Large language models are trained **end-to-end** to minimize predictive loss, not to explicitly learn a predefined set of human-labeled features.
* Researchers can often identify directions that correlate with meaningful concepts, but we should be careful not to overstate what is known.
* We do **not** have a complete list of the “true features” inside a large language model.
* Nor do we know that the model’s internal decomposition of the world aligns perfectly with human semantic categories.
* In this article, the term **feature** should therefore be understood as a useful idealization:

    * a conceptually meaningful latent factor
    * something the model may benefit from representing
    * not necessarily something isolated cleanly in one neuron or even one exact axis

---

## Why embedding dimension matters

### Embedding width is a central architectural bottleneck

* If we imagine giving every possible useful feature its own dedicated coordinate axis, the problem would seem easy.
* However, neural networks operate under a hard constraint: the internal vectors have a **fixed dimensionality**.
* In transformer models, this width is often called:

    * **embedding dimension**
    * **hidden size**
    * **model dimension**
    * commonly denoted (d_{\text{model}})
* This number is one of the most important architectural parameters in the entire model.
* It determines how many coordinates are available at each layer to store and process information.

### Why can’t we just make the embedding space arbitrarily larger?

* Increasing the embedding dimension is expensive.
* In dense transformer architectures, a large fraction of the parameters live in matrices whose size scales roughly with the **square** of the hidden dimension.
* As a result:

    * doubling the width does **not** merely double the parameter count
    * it can increase parameter count by roughly a factor of four in the dominant layers
* The same scaling also affects:

    * memory usage
    * training cost
    * inference cost
    * bandwidth requirements
* In practice, this means that embedding dimension is not a free resource.
* Model designers cannot simply keep adding new axes for every potentially useful feature.

### Rough scaling intuition

* For a GPT-style dense decoder transformer, a common back-of-the-envelope approximation is:

[
P \approx 12 L d^2 + (V + n_{\text{ctx}}) d
]

where:

* (P) is the total parameter count

* (L) is the number of transformer layers

* (d) is the hidden size / embedding dimension

* (V) is the vocabulary size

* (n_{\text{ctx}}) is the context length contribution to positional parameters or embeddings, depending on the architecture

* The exact constants differ across architectures, but the important point is robust:

* the dominant term is typically **quadratic in (d)**.

* This makes embedding width one of the most expensive ways to increase representational capacity.

### Concrete model-size intuition

* Across many modern dense language models, hidden sizes are large — but still nowhere near “one dimension per possible concept.”
* As a rough rule of thumb:

    * 7–8B models often use hidden sizes around **3072–4096**
    * 13–20B models often use hidden sizes around **5120–6144**
    * 70B models often use hidden sizes around **8192**
    * GPT-3-class 175B dense models use **12288**
* These are large vector spaces by human standards.
* But they are still tiny compared to the number of distinct semantic, syntactic, factual, relational, and contextual features a language model may need to represent.

![Total parameter count of a GPT-style dense decoder transformer as a function of its embedding / model dimension d_model, for five prominent architecture families. Parameter count is approximated as P ≈ 12·L·d² + (V + n_ctx)·d, where L is the number of transformer layers, V the vocabulary size, and n_ctx the context length. The y-axis uses a logarithmic scale. Because P grows quadratically with d, even modest increases in embedding dimension incur a steep cost in parameters. Reference points mark the published widths of GPT-3 175B, LLaMA-2 70B, GPT-2 XL, LLaMA-2 7B / Mistral 7B, and BERT-Large.](./plots/model_size_depending_on_emb_dim.png)

---

## The apparent mismatch: far more possible features than dimensions

### Natural language seems to require an enormous number of potentially useful features

* Even a crude estimate quickly suggests that the number of potentially relevant features is vast.
* Consider just the English lexicon:

    * The Oxford English Dictionary is often cited as containing on the order of **170,000+ words in current use**, depending on how one counts entries and inflections.
* But words alone are only a tiny part of the story.
* A language model may also need to represent:
    * syntactic roles
    * tense, number, and agreement
    * named entities
    * relations between entities
    * discourse structure
    * topic shifts
    * sentiment
    * stylistic cues
    * domain knowledge
    * world facts
    * compositional interactions between concepts

![Visualization showing a numeric vector in the middle representing an embedding vector capturing semantics, surrounding by numerous possible features (i.e. is_person, has_petals, is_male, is_scientist, is_plural) captured surrounding the vector, connecting to the vector via lines, indicating the vector captures them](./plots/latent_space.png)

* If we widen the lens to knowledge and concepts in text corpora, the scale becomes even more striking.
* For example:
    * the English Wikipedia contains **millions of articles**, each reflecting clusters of concepts, entities, relations, and facts
* The exact number is not the point.
* The point is that the space of potentially useful features is plausibly **vastly larger** than the number of available coordinates in any one hidden vector.

### This creates the central puzzle

* If a model only has, say, a few thousand hidden dimensions at a given layer, but may need to track many more than a few thousand useful latent features, how can it do so?
* How can a finite-dimensional vector carry information about a much larger set of potentially relevant concepts?
* One naive answer would be:

    * “it cannot; it must simply forget most of them”
* But empirically, large language models are capable of surprisingly rich behavior.
* This suggests that the internal representation is doing something more clever than assigning one feature to one axis.

### This is where superposition enters

* **Superposition** is the idea that multiple features may be represented in overlapping directions inside the same activation space.
* Instead of giving each feature its own dedicated coordinate axis, the model may reuse directions and encode features in a more distributed way.
* This can allow the model to represent **more features than dimensions**, at least approximately and under the right sparsity conditions.
* The cost is that features can begin to **interfere** with one another.
* The central tradeoff becomes:

    * more representational efficiency
    * but less clean separation

---

## Why use a toy model?

### Real language models are too complicated to inspect directly

* Large language models contain billions of parameters and are trained on enormous datasets with highly entangled objectives.
* Even when we can measure interesting internal directions, it is difficult to isolate the precise geometric reason why a particular representation emerged.
* If we want to understand the basic phenomenon of superposition, it helps to strip away as much complexity as possible.

### A toy model can isolate the geometry

* Instead of trying to analyze a full transformer, we can study a deliberately simplified model whose only job is:

    * take a set of synthetic features
    * compress them into a smaller latent space
    * reconstruct them again as accurately as possible
* This setup allows us to focus on the core question:
* **What geometry emerges when there are more features than available dimensions?**

### Following Anthropic’s toy model

* This article follows the spirit of Anthropic’s *Toy Models of Superposition* and related simplified expositions.
* The goal is not to perfectly simulate a transformer.
* The goal is to build a small, controlled experiment that captures the key representational pressure:

    * many possible sparse features
    * limited latent dimensions
    * pressure to reconstruct important features accurately
* Under these conditions, we can observe whether the model learns:

    * nearly orthogonal feature directions when capacity is sufficient
    * and increasingly overlapping directions when capacity is constrained

---

## A simple autoencoder as a surrogate model

### What is an autoencoder?

* An **autoencoder** is a neural network trained to reconstruct its input.
* It consists of two conceptual stages:

    * an **encoder**, which maps the input into a latent representation
    * a **decoder**, which maps that latent representation back into the original space
* Because the model is trained to reproduce its input, it is forced to learn a useful internal representation.
* If the latent space is smaller than the input space, the model cannot simply copy the input coordinate-by-coordinate.
* It must instead learn a compressed representation.

### Why is an autoencoder a useful toy model here?

* In our setting, the input vector will represent a set of feature activations.
* The latent space will represent the limited-capacity embedding space.
* If the latent dimension is smaller than the number of input features, the model is forced into the same kind of compression problem that motivates superposition in larger models.
* This makes the autoencoder a natural toy model for studying how multiple features may be packed into a smaller number of dimensions.

### The core intuition

* We will imagine an input vector (x \in \mathbb{R}^n) where:

    * each coordinate corresponds to a conceptual feature
    * each coordinate value indicates how strongly that feature is active
* The encoder maps this feature vector into a lower-dimensional latent vector (y \in \mathbb{R}^m), where typically (m < n).
* The decoder then tries to reconstruct the original feature vector from that latent representation.
* If the model succeeds, it has found a way to store the relevant information of (n) possible features inside only (m) dimensions.

---

## The specific toy autoencoder we will use

### Model setup

* To keep the geometry as transparent as possible, we will use a very small autoencoder with:

    * an input feature space (F = \mathbb{R}^n)
    * a latent / embedding space (H = \mathbb{R}^m)
    * a linear encoder matrix (W \in \mathbb{R}^{m \times n})
    * a tied linear decoder using the transpose (W^T \in \mathbb{R}^{n \times m})
* The encoder computes:

[
y = Wx + b_{\text{enc}}
]

* The decoder computes a reconstruction:

[
\hat{x} = W^T y + b_{\text{dec}}
]

* In many toy superposition setups, a nonlinearity such as ReLU is inserted in the latent or output pathway to reflect the fact that we are often modeling **nonnegative sparse feature activations**.
* The exact placement of the nonlinearity matters and will be discussed explicitly in the experiment section.

### Why use tied weights (W) and (W^T)?

* Using the transpose as the decoder is not arbitrary.
* It is directly motivated by the geometry of orthonormal bases.
* If the columns of (W) were orthonormal feature directions, then:

    * encoding would combine those directions
    * decoding with (W^T) would recover the coefficients exactly
* In the undercomplete case, this is the idealized “clean geometry.”
* In the overcomplete case, exact orthonormality becomes impossible, but the tied-weight structure still provides a natural and interpretable inductive bias.
* This is why the next section reviews arbitrary, orthogonal, and orthonormal bases before we begin the interactive experiments.

---

## Synthetic data instead of real language data

### Why not train on real text?

* If we trained directly on language-model activations or real text, many different effects would be entangled:

    * token statistics
    * linguistic structure
    * optimizer dynamics
    * architectural biases
    * dataset artifacts
* That would make it much harder to isolate the one phenomenon we care about.

### A cleaner alternative: synthetic sparse feature vectors

* Instead, we generate synthetic inputs (x \in \mathbb{R}^n) directly in feature space.
* Each coordinate corresponds to a conceptual feature that may or may not be active.
* On each training example:

    * most features are inactive
    * only a small subset is active
* This sparsity assumption is central.
* Superposition becomes most useful when:

    * many features are *possible*
    * but only a few are active at the same time

### Why sparsity matters

* If all features were active at once, overlapping representations would interfere heavily.
* If only a few features are active at a time, the model can often reuse directions more safely.
* In other words:

    * the model is not trying to represent **all possible features simultaneously**
    * it is trying to represent **whichever small subset happens to be active in the current example**
* This is exactly the regime in which superposition becomes attractive.

---

## Feature importance and unequal pressure to preserve information

### Not all features matter equally

* In real language, some features are more common or more useful than others.
* A toy model that treats all features as equally important can still be informative, but it misses an important ingredient.
* Anthropic’s toy model therefore introduces **feature importance**:

    * some features contribute more strongly to the loss if reconstructed poorly
    * others are cheaper to distort or ignore

### Why this matters geometrically

* Once feature importance differs, the model may allocate representational resources unevenly.
* More important features may get:

    * cleaner directions
    * larger norms
    * less interference
* Less important features may be:

    * packed into more crowded regions
    * partially sacrificed
    * or represented only when capacity allows
* This helps produce the richer geometric patterns seen in toy superposition experiments.

---

## Training objective

### What is the model trying to optimize?

* The autoencoder is trained to make its reconstruction (\hat{x}) as close as possible to the original input (x).
* A simple version of the loss is a weighted mean squared error:

[
\mathcal{L}(x,\hat{x}) = \sum_{i=1}^{n} \alpha_i (x_i - \hat{x}_i)^2
]

where:

* (\alpha_i > 0) is the importance weight of feature (i)

* This objective encourages the model to preserve important features more accurately than unimportant ones.

* By training on many random sparse samples, the model gradually adjusts its feature directions to minimize expected reconstruction error.

### What we should expect to see

* If the latent dimension is large enough relative to the number of useful active features:

    * the model can often assign nearly independent directions
* If the latent dimension is too small:

    * the model must reuse directions
    * feature vectors begin to crowd together
    * interference becomes unavoidable
* The interesting question is **how** that crowding happens geometrically.
* That is exactly what the interactive visualization will let us observe.

---

## Before the experiment: the geometric prerequisite

### Why we need one more mathematical detour

* Before we can interpret the learned embedding vectors of the autoencoder, we need a clear geometric understanding of what those vectors mean.
* In particular, we need to understand:
    * what it means to encode a feature vector as a linear combination of feature directions
    * why recovering coefficients is easy in orthonormal systems
    * why recovery becomes harder when directions are not orthogonal
    * why the transpose (W^T) naturally acts like a “readout by projection”
* These ideas are easiest to see in a small 2D example.

### Transition into the next section

* We will therefore first step away from the neural network and revisit a simpler linear-algebra question:
* If we represent features as coefficients of vectors in another coordinate system, when can we recover those coefficients easily — and when do they begin to interfere?
* That question leads directly to the distinction between:
    * arbitrary bases
    * orthogonal bases
    * orthonormal bases
* And once that intuition is in place, the geometry of superposition becomes much easier to understand.