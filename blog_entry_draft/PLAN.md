

## Section 1
1. Convert the section to prose paragraphs
2. Keep "Anthropic's *Toy Models of Superposition* (2022)"
3. provide more emphasis/ motivation on "directions"
4. I get the critique, I dont like the solution. Maybe it should just be stated that the amount of words is just a reference to how many different concepts there are, without going into things like language, tonality, etc, and simply stating that features are combinatorial, so likely at any given point many features will be active at once.
5. Tighten the embedding definition
6. Add a brief section at the very top that introduces the blog article and states the contribution: an *interactive explorable explanation* that lets readers discover Anthropics findings on one explanation on how embeddings are capable of capturing many more features than their dimension suggests, a core concept in explainability of AI, through hands-on experimentation

## Section 2
1. Use $y\in H$ as embedding vector for now, not $h$. Update accordingly.
2. first explain the setup conceptually, then introduce the notation
3. no change.
4. give the recovery claim qualification. State that in this 2D-to-2D example
5. We will add this later as part of the sidebar example visualization, do not add it in the article
6. Add a brief paragraph (2-3 sentences) explicitly stating "when we have more feature directions than dimensions, the vectors $w_i$ cannot all be mutually orthogonal, and the Gram matrix $W^TW$ will necessarily have nonzero off-diagonal entries"

## Section 3
1. Replace with "The autoencoder uses a linear encoder and a nonlinear decoder with tied weights."
2. Replace with gradient-based optimization (Adam)
3. Add a single additional sentence like "In brief, they allow the model to compensate for interference when features must share dimensions" that briefly hints at the role of bias and RELU


## Section 4
3. state that features are sampled independently (for sparsity definition)
4. Add a brief justification: "so that all features compete equally for embedding capacity, removing importance ranking as a confound."
6. Good Point! Please add this as a brief info block at the top of the experiements section (we will run experiments, convergent behaviour may take long to show up, consider reseting the experiment if it takes long and rerunning it)

## Section 5
1. make the explanation of how bias cancels expected interference slightly more explicit. Keep the TODO figure, I will plug it in later.
2. state it more plainly: "the number of vectors grows exponentially with the dimension $d$."
3. Add the sentence (i.e. "Sparse autoencoders (Bricken et al., 2023) have emerged as a practical tool for recovering individual features from superposed representations", but give a brief hint on what Sparse in Sparse Autoencoder means, as readers may confuse it with feature activation sparsity, i.e. state that they are using higher dimensional, but sparse hidden layers to single out features)
4. add connection to polysemanticity, if possible with scientific reference
5. add reference to at least one complementary/alternative explanation, if possible with scientific reference.
6. Add a brief acknowledgment that real networks exhibit superposition in more complex forms, as the toy model in comparison has no nonlinearity in the encoder, uses synthetic data, has tied weights, and only studies one layer

Deepen the interpretability implications, explain why it matters practically (e.g., for safety, for understanding model failures, for steering model behavior).

## Cross-Cutting Concerns
3. Formal Citations: Add a file 7_references.md, listing the references
4. Structural elements:
   * as already hinted, add 1-2 paragraphs in the beginning as introduction and as a listing of contributions
   * Add a 6_recap.md: **Section 6 / Recap.**, needed to summarize key takeaways, acknowledge limitations, and point to further reading (Anthropic's full paper, SAE research, other VISxAI work).




