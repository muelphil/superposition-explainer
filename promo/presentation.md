# Workshop video script — Superposition in Neural Networks: A Visual Exploration

VISxAI @ IEEE VIS 2026 · target length ≤ 6 min (~730 words ≈ 5:15 spoken + pauses and live training)

Keys (see `src/promo/RecordingControls.vue`): **⏎ = NumpadEnter** (next cue) · NumpadDecimal = top ·
Numpad1–9 = cue 1–9 directly · Numpad0 = cursor · NumpadAdd = end slide · NumpadSubtract = narration audio ·
NumpadDivide = read-through scroll.

---

**[Top of page — main autoencoder visible]**

Language models work with embeddings of only a few thousand dimensions, yet they seem to represent far more concepts than that. So how does all of that fit?

We came across the answer, *superposition*, in Anthropic's *Toy Models of Superposition* paper and in 3Blue1Brown's lesson on how language models store facts. We found the idea fascinating, but we wanted a way to learn it not just by reading, but by experimenting. So we built this explainer.

At the very top is the toy model at the heart of Anthropic's paper: a small autoencoder, together with its embedding space, training controls and weights. We deliberately kept it as a standalone tool, so educators can use it to explain superposition in their own words.

**[⏎ cue 1 — article start]**
Below it, a guided article takes you there step by step. It starts with a practical constraint: embedding dimensions can't grow freely.

**[⏎ cue 2 — Figure 1, centred]**
In a transformer, a large share of the parameters scales with the *square* of the embedding dimension. Double the width, and those parts of the model become four times as large.

**[⏎ cue 3 — Figure 2, centred]**
At the same time, the number of potentially useful features is vast: over 170,000 words in current English alone, plus every property, entity and fact a model might need. That's far more than a few thousand dimensions, and this mismatch is what the explainer is about.

**[⏎ cue 4 — jump to "Geometric Foundations", hold 1.5 s, slow glide (22 s), stops just before "The 2D example"]**
Anthropic studied this mismatch with a deliberately small model: an autoencoder that compresses feature activations into a lower-dimensional embedding space, then tries to recover them. Before we build it, the article introduces the math to formalize this: features as directions in an input space, a mapping into a smaller embedding space, and a mapping back.

**[⏎ cue 5 — jump to "The 2D example", hold 1.5 s, slow glide (19 s), stops with the "compromise geometries" box still active]**
An optional section builds intuition with a 2D example. With as many dimensions as features, an orthonormal basis represents every feature perfectly, without any interference. With more features than dimensions, that's impossible, and the model is forced into compromise geometries. That is exactly what we explore next.

**[⏎ cue 6 — "The Toy Autoencoder"]**
Here, the toy autoencoder is introduced piece by piece: inputs, embedding and outputs. Each feature becomes a vector in embedding space, and the explainer shows this in three complementary views: the weighted connections of the network, the arrows in the embedding view, and the numeric weight matrix. Then come the synthetic training data and the training objective. To make reconstruction easy to check, input and output neurons are coloured by their activation. If the colours match, the input was recovered.

**[⏎ cue 7 — "Experiments"]**
The heart of the explainer is its experiments. Step by step, they guide you towards discovering superposition yourself. Each experiment poses small tasks: change a parameter, train the model, and observe what happens.

*(pause)*

Once all tasks are done, an insight box sums up the takeaway.

**[⏎ cue 8 — Experiment 4]**
For this demo, let's jump to the last experiment: five features, but only two embedding dimensions. I'll give all features equal importance, make them highly sparse, and train.

*(set α = 1.0 and S = 0.95, press Train, wait for convergence — fallback: "load a converged example")*

The model now keeps all five features. Their vectors share the plane, roughly 72 degrees apart: they are in superposition. The price is interference, which the earlier experiments make visible.

**[⏎ cue 9 — Figure 3]**
The article then names this phenomenon, and shows how the bias and the ReLU activation work together to filter out most of that interference.

**[⏎ cue 10 — Figure 4]**
And here's what makes superposition so powerful: the room grows exponentially with dimension. In two dimensions, five directions fit at least 72 degrees apart. In three dimensions it's eight, and you can try that yourself in the autoencoder at the top. In fifteen dimensions, it's already at least 259. The article connects this to spherical codes and the Johnson–Lindenstrauss lemma.

**[⏎ cue 11 — "What this means for neural networks"]**
We close with what this means for real neural networks, and with pointers to the literature for anyone who wants to dig deeper into this foundational concept of interpretability.

**[NumpadAdd — end slide]**
We hope this explainer offers a guided, hands-on introduction to superposition, for learners and educators alike. The project is open source, and you'll find the links here. We'd love to hear your feedback.

---

## Fact basis

| Claim | Source |
|---|---|
| Parameters scale ~ square of embedding dimension | Article, Figure 1 (dominant term ~12·L·d²) |
| 170,000 words in current use | Article, "The mismatch" (Oxford English Dictionary) |
| 5 / 8 / ≥ 259 directions at ≥ 72° in 2 / 3 / 15 dims | `src/data/sphericalCodesData.json` (Cohn, 2024); 15D value is a best-known construction, hence "at least" |
| Exponential growth | Article, "Scaling: it is exponential" (spherical codes, Johnson–Lindenstrauss) |
| 3Blue1Brown | *How might LLMs store facts* lesson (Sanderson, 2024), as cited in the article |
