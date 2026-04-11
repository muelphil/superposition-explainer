## Embeddings, Features, and the Dimensional Bottleneck

### What are embeddings?

* Neural networks cannot operate directly on symbolic concepts such as words, grammatical roles, or semantic properties.
* Instead, they transform information into **vectors of numbers** — fixed-length arrays of real values.
* These numeric vectors live in a high-dimensional space commonly called an **embedding space** or **latent space**.
* The purpose of such a space is to provide a compact numerical representation in which useful properties of the input can be encoded and manipulated through mathematical operations.
* In language models, this transformation happens at every stage: tokens are mapped to vectors, and each subsequent layer transforms these vectors into new ones. All intermediate representations are vectors of the same fixed dimensionality.
* Throughout this article, we use the term **embedding space** in a broad geometric sense: a vector space in which the model stores and processes internal information.
* An embedding vector is not simply "meaning compressed into numbers." More precisely, different **directions** in the embedding space may correspond to different features of the input, and the component along each direction indicates how strongly that feature is present.

### Why embedding dimension matters

* The internal vectors of a neural network have a **fixed dimensionality** — a hard architectural constraint. In transformer models, this is called the **embedding dimension** or **model dimension** $d_{\text{model}}$, and it determines how many coordinates are available at each layer to store and process information.
* Increasing the embedding dimension is expensive. In dense transformer architectures, a large fraction of the parameters reside in matrices whose size scales roughly with the **square** of the embedding dimension. Doubling the width therefore increases parameter count by roughly a factor of four in the dominant layers — and with it memory, training cost, and inference cost.

![Total parameter count of a GPT-style dense decoder transformer as a function of its embedding / model dimension d_model, for five prominent architecture families. Parameter count is approximated as P ≈ 12·L·d² + (V + n_ctx)·d, where L is the number of transformer layers, V the vocabulary size, and n_ctx the context length. The y-axis uses a logarithmic scale. Because P grows quadratically with d, even modest increases in embedding dimension incur a steep cost in parameters. Reference points mark the published widths of GPT-3 175B, LLaMA-2 70B, GPT-2 XL, LLaMA-2 7B / Mistral 7B, and BERT-Large.](./plots/model_size_depending_on_emb_dim.png)

* Modern large language models typically use embedding dimensions in the range of roughly **3072 to 12,288**. These are large vector spaces by human standards, but still far smaller than the number of concepts a model may need to represent.
* In practice, embedding dimension is not a free resource. Model designers cannot simply keep adding dimensions for every property the model might need to represent.

---

## The apparent mismatch: far more possible features than dimensions

### What are features?

* In mechanistic interpretability research, a **feature** refers to a direction or pattern inside a model's internal activations that corresponds to a recognizable property of the input.
* Some features are relatively concrete, such as: "it is something in plural," "this is about a person," or "this is in past tense." Others may be abstract, distributed, or difficult to name.
* Importantly, a feature is **not necessarily a single neuron**. In modern neural networks, many features appear to be represented across directions in activation space rather than being stored cleanly in one coordinate.
* Features are not directly observed ground truth. Models are trained end-to-end to minimize predictive loss, not to explicitly learn a predefined set of human-labeled concepts. Researchers can identify directions that correlate with meaningful concepts, but we do not have a complete list of the "true features" inside a large language model, nor do we know that the model's internal decomposition aligns perfectly with human categories.
* Significant research effort has gone into uncovering interpretable features inside trained models. Projects such as [Neuronpedia](https://www.neuronpedia.org/) catalog discovered features and make them searchable, illustrating both the progress made and the sheer scale of the problem.

### The mismatch

* The number of potentially useful features is vast. Consider just the English lexicon: the Oxford English Dictionary contains on the order of **170,000+ words in current use**. But words alone are a tiny fraction of what a language model may need to represent — syntactic roles, tense and agreement, named entities, relations, sentiment, domain knowledge, world facts, and compositional interactions between concepts all add to the count.

![Visualization showing a numeric vector in the middle representing an embedding vector capturing semantics, surrounding by numerous possible features (i.e. is_person, has_petals, is_male, is_scientist, is_plural) captured surrounding the vector, connecting to the vector via lines, indicating the vector captures them](./plots/latent_space.png)

* The space of potentially useful features is plausibly **vastly larger** than the number of available coordinates in any one hidden vector. If a model has a few thousand hidden dimensions but may need to track many more potentially useful features, how can it do so? Empirically, large language models exhibit surprisingly rich behavior, suggesting that their internal representations do more than assign one feature to one axis.
* This article aims to provide an understanding of how models might deal with this mismatch. Rather than analyzing a full-scale language model — where architecture complexity and training data make it nearly impossible to isolate any single effect — we will use a small, controlled model that lets us study the compression problem in isolation.

---

## A toy model for exploring the mismatch

* We will study this problem based on the experimental setup described in Anthropic's *Toy Models of Superposition* (2022), using an **autoencoder** — a simple neural network trained to reconstruct its input.
* The input first passes through a smaller **embedding layer** whose dimension is lower than that of the input. The model then attempts to reconstruct the original input from this compressed embedding.
* Because the embedding dimension is smaller than the input dimension, the model cannot simply copy the data through. It is forced to learn how to compress many features into fewer dimensions — exactly the pressure we want to study.
* this gives us a controlled setting to explore how learned representations deal with the mismatch between features and available dimensions. The formal architecture, loss function, and training details will be introduced in a later section.

---

## What comes next: the geometric foundations

* Before defining the toy autoencoder formally, we first develop the mathematical fundamentals that underpin it.
* The next section builds a geometric understanding of how features can be represented as vectors in an embedding space, how they can be recovered, and what goes wrong when more features must share fewer dimensions. This intuition directly motivates the architecture of the autoencoder and is essential for interpreting its learned representations.