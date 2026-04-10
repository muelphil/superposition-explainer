# Blog Entry Draft Review

**Target venue:** 9th Workshop on Visualization for AI Explainability (VISxAI) at IEEE 2026  
**Audience:** ML researchers, subfield: interpretability / explainability  
**Format:** Interactive blog entry with side-panel visualizations  
**Scope:** Sections 1–5 (`1_motivation.md` through `5_superposition.md`)

---

## Overall Assessment

The draft presents a strong pedagogical arc: it builds from embeddings and features through geometric foundations to a toy autoencoder, guides the reader through progressive experiments, and culminates in naming and explaining superposition. The concept sequencing is carefully considered — readers discover superposition themselves before it is formally introduced. The mathematical development in section 2 is particularly well-crafted, and the experimental progression in section 4 is a highlight.

For a VISxAI submission, the interactive component (autoencoder visualizations, embedding space, weight matrices) is the core contribution. The text currently reads more like a self-contained tutorial than a companion to an interactive tool. Strengthening the integration between prose and visualization — making the text explicitly refer to what the reader sees, and making insights emerge from interaction rather than from reading — will be essential.

---

## Section-by-Section Analysis

### Section 1: Motivation (~58 lines)

**Strengths:**
- Clean four-part progression: embeddings → dimensional cost → feature mismatch → toy model
- The quadratic scaling argument with the accompanying plot is concrete and effective
- Neuronpedia reference grounds the abstract feature concept in real research
- The transition to geometric foundations is well-motivated

**Issues:**

1. **Bullet-point format throughout.** Section 1 is almost entirely bullet lists, while sections 4–5 are narrative prose. For VISxAI, consistent narrative flow is expected. Bullet lists feel like lecture notes, not a published article. Converting to prose paragraphs would significantly improve readability and professionalism.

2. **Accidental superposition reference.** Line 51 says "Following the spirit of Anthropic's *Toy Models of Superposition* (2022)." The paper title contains the word "superposition," which the article is explicitly deferring to section 5. Consider referencing it as "Elhage et al. (2022)" with a footnote, or as "Anthropic's toy model framework" without the paper title.

3. **The embeddings section could better motivate "directions."** Line 11 introduces "different **directions** in the embedding space may correspond to different properties" — this is a crucial claim that foreshadows the entire geometric framework. Currently it appears as one bullet among many. It deserves more emphasis or a brief intuitive example.

4. **The feature count argument is slightly loose.** The 170,000+ OED words are cited as evidence for the vast feature space, but individual words aren't really "features" in the mechanistic interpretability sense. The argument would be stronger if it briefly noted that features are *compositional* — "is_plural AND refers_to_food" — which makes the combinatorial space much larger than any word count.

5. **Embedding definition is somewhat redundant.** "Vectors of numbers — fixed-length arrays of real values" says the same thing twice. Consider tightening.

6. **Missing: what makes this article different.** For VISxAI, the introduction should state the contribution: that this is an *interactive explorable explanation* that lets readers discover superposition through hands-on experimentation, not just read about it. Currently the article's interactive nature is not mentioned until section 4.

**What could be sacrificed:** The meta-comment "Throughout this article, we use the term embedding space in a broad geometric sense" (line 10) could be cut or made into a brief parenthetical. The four sub-bullets about learning and identity mapping (lines 29–32 of the features section) could be condensed.

**What could be deepened:** The connection between "features as directions" and the upcoming geometric framework. A single concrete example (e.g., "the direction in GPT-2's residual stream that activates for the concept 'is_plural'") would make this tangible.

---

### Section 2: Mathematical Fundamentals (~101 lines)

**Strengths:**
- Excellent W / W^T / W^TW framework, introduced narratively rather than as dry notation
- The arbitrary → orthogonal → orthonormal progression is pedagogically ideal
- Concrete 2D numerical examples make abstract linear algebra tangible
- The Gram matrix is introduced naturally through the interference concept
- The closing sentence about encode/decode symmetry motivating the autoencoder is a perfect transition

**Issues:**

1. **Notation inconsistency with Section 3.** Section 2 uses $y$ for the embedding vector; Section 3 uses $h$. This is a significant consistency issue. Pick one symbol and use it throughout. Recommendation: use $h$ (for "hidden") everywhere, as it is more standard in the autoencoder literature and already used in the model definition.

2. **The opening paragraph is dense.** Lines 5–7 pack feature space definition, feature vector notation, and the geometric intuition into one paragraph. Consider breaking this into two: first explain the setup conceptually, then introduce the notation.

3. **"Basis" terminology is premature.** Line 34 introduces "form a basis of the embedding space" in the 2D-to-2D case, with an immediate caveat (line 35) that when $m < n$ they are "feature directions rather than a basis." This caveat is important but easily missed. Consider leading with "feature directions" throughout, noting that in the special $n = m$ case they happen to form a basis.

4. **The W^{-1} recovery claim (line 64) needs qualification.** "We would need to ... multiply by $W^{-1}$" — this only works when $W$ is square and invertible. For the general $m < n$ case (which is the entire point of the article), $W^{-1}$ does not exist. The statement is correct in context (2D-to-2D example) but could mislead readers about the general case. Add a parenthetical: "which is only possible when the feature directions form a square, invertible matrix."

5. **The orthogonal Gram matrix deserves explicit calculation.** Lines 77–78 give the diagonal Gram matrix values $\begin{bmatrix} 5 & 0 \\ 0 & 1.25 \end{bmatrix}$ but don't show $\|w_2\|^2 = (-1)^2 + (0.5)^2 = 1.25$. For readers following along, showing this one step would help.

6. **Missing: what happens when $m < n$?** The entire section works in the $n = m = 2$ case. The closing two lines gesture at $m < n$ but never develop it. A brief paragraph — even just 2–3 sentences — explicitly stating "when we have more feature directions than dimensions, the vectors $w_i$ cannot all be mutually orthogonal, and the Gram matrix $W^TW$ will necessarily have nonzero off-diagonal entries" would bridge to section 3 more concretely.

7. **The plot reference (line 101) has no caption.** `![](./plots/basis_types.png)` — add a descriptive alt text/caption for accessibility and context.

**Scientific correctness:**
- The linear algebra throughout is correct
- The Gram matrix definition and properties are stated accurately
- The claim that $W^T = W^{-1}$ for orthonormal square $W$ is correct (these are the orthogonal matrices, i.e. $O(n)$)
- The dot product interpretation of $W^T$ is correct

**What could be sacrificed:** Some of the bullet-sub-bullets in the 2D example section (lines 28–35) are somewhat repetitive about why arbitrary directions exist. The four bullets explaining the 2D setup could be condensed to two.

**What could be deepened:** The transition from $n = m$ to $m < n$ (see point 6). This is the most important conceptual jump in the article and currently gets only a two-line remark at the very end.

---

### Section 3: Autoencoder Toy Model (~52 lines)

**Strengths:**
- Direct, motivated connection to section 2's geometry
- Clean architecture definition with clear encoder/decoder separation
- Tied weights are well-motivated from the orthonormal basis perspective
- Synthetic data justification (disentangled features) is strong
- Feature importance with exponential decay is clear and well-connected to the LLM analogy

**Issues:**

1. **"Linear model" is inaccurate.** Line 7: "The autoencoder is a linear model with tied weights." The encoder is linear, but the decoder applies ReLU, making the overall model nonlinear. This is particularly important because the nonlinearity is later crucial for superposition (bias + ReLU denoising). Suggest: "The autoencoder uses a linear encoder and a nonlinear decoder with tied weights."

2. **Adam is not gradient descent.** Line 51: "updating $W$ and $b$ via gradient descent (Adam optimizer)." Adam is an adaptive learning rate method, not vanilla gradient descent. Say "gradient-based optimization (Adam)" or simply "the Adam optimizer."

3. **Bias and ReLU section is arguably too terse.** Line 26: "Their significance will become clear in the experiments." While the intent to defer is understood, a single additional sentence like "In brief, they allow the model to compensate for interference when features must share dimensions" would give readers enough to hold onto without spoiling the experiments.

4. **Missing: brief note on model size.** For a VISxAI interactive piece, it would be helpful to state the model's total parameter count (m×n weights + n biases) to ground readers' intuition about how small this model is.

5. **Half-normal sampling vs. sparsity integration.** The sampling formula here ($x_i = |\mathcal{N}(0,1)|$) has no sparsity — that is introduced in section 4. This is intentional and correctly sequenced, but might confuse readers who skip ahead. A brief forward-reference ("Feature sparsity, introduced later, additionally gates which features are active in a given sample") could help, though this is a minor point.

**Scientific correctness:**
- Architecture equations are correct and consistent with the code
- Feature importance formula $I_i = \alpha^{i-1}$ is correct (verified against code: `Math.pow(config.featureDecay, i)` with 0-based `i`)
- Note: EXPERIMENT.md uses $I_i = \alpha^i$ (line 99), which is inconsistent with the blog's 1-indexed convention. The blog is correct relative to the code. EXPERIMENT.md should be updated.
- The Gram matrix terminology for non-square $W$ is correct (the Gram matrix of the column vectors)
- Tied weight motivation is mathematically sound

**What could be sacrificed:** The full forward pass equation ($\hat{x} = \text{ReLU}(W^TWx + b)$) is useful but could be inlined into the decoder equation rather than getting its own subsection header.

**What could be deepened:** A brief note on initialization — does the model start from random weights? This matters for the experiments since readers will train the model themselves.

---

### Section 4: Experiments (~64 lines)

**Strengths:**
- Progressive experimental structure is the article's strongest pedagogical device
- The raised question in Experiment 2 about opposite directions is excellent — it prompts the reader to think before the answer is revealed
- Insight boxes are well-written and provide clear takeaways
- The distinction between "exploiting unused directions" (Exp 3) and "genuine interference" (Exp 4) is clearly drawn
- Sparsity is introduced at exactly the right moment — after the reader has seen it fail without it (Exp 2)

**Issues:**

1. **Experiment 1 tasks assume specific UI knowledge.** "Check the angle between the two feature direction vectors in the training statistics" — readers need to know where to look. For a VISxAI piece, either the side panel should highlight the relevant metric, or the text should describe the visualization more explicitly: "In the training statistics panel (bottom right), observe the minimum angle between feature directions approaching 90°."

2. **Experiment 2: bias insight is stated without derivation.** "Compare it to the mean of the half-normal distribution: $\mu = \sqrt{2/\pi} \approx 0.798$" — this is a beautiful insight, but readers may not see why the mean is the optimal constant prediction. A parenthetical explanation would help: "This is the optimal constant prediction, since it minimizes the expected squared error $E[(x_i - c)^2]$ when $x_i \sim |\mathcal{N}(0,1)|$."

3. **Co-activation probability $S^2$ assumes independence.** Line 35: "any two specific features are simultaneously active with probability $S^2$." This is correct under the stated independent Bernoulli sampling model, but worth noting explicitly ("since feature activations are sampled independently").

4. **Experiment 4 sets $\alpha = 1.0$ without explaining why.** The instruction "Set $\alpha = 1.0$ (equal importance)" is given but not motivated. Add a brief justification: "so that all features compete equally for embedding capacity, removing importance ranking as a confound."

5. **The experiment numbering is slightly confusing.** There are 4 experiments but 5 subsections (because "Feature sparsity" is an interstitial explanation, not an experiment). Consider making the numbering clearer, e.g., "Interlude: Feature Sparsity" or numbering experiments 1–4 with a clear non-experiment section in between.

6. **Missing: what if the reader doesn't see the expected result?** Experiments can fail to converge, find local optima, or take longer than expected. A brief note about rerunning training or checking training steps would make the interactive experience more robust. This is especially important for Experiment 4, where the 5-way symmetric solution may not always emerge cleanly.

**Scientific correctness:**
- The orthonormal basis claim in Experiment 1 is correct for the global optimum but the model may find rotated variants — consider saying "an orthonormal basis (up to rotation/reflection)"
- The half-normal mean as optimal constant predictor is correct
- The "doubling via opposite directions" explanation is accurate
- The $72°$ claim for 5 equispaced vectors in 2D is correct ($360°/5 = 72°$)

**What could be sacrificed:** Some of the per-experiment tasks could be collapsed. E.g., in Experiment 1, "Check out the loss in the training statistics" and "Check the angle..." could be one task: "Observe the loss and the minimum angle in the training statistics."

**What could be deepened:** The insight in Experiment 2 about the model *choosing not to represent* low-importance features is a profound finding that could be connected more explicitly to the concept of feature priority / triage under capacity constraints.

---

### Section 5: Superposition (~56 lines)

**Strengths:**
- Clean definition of superposition after experimental grounding
- The distinction from the opposite-direction trick (Exp 3) is explicitly stated
- The tradeoff section is appropriately concise
- Spherical codes discussion and JL lemma provide strong theoretical grounding
- The 3Blue1Brown reference (10,000 vectors in 100D) is a compelling concrete example
- The "one contributing explanation" framing is honest and scientifically appropriate
- The closing paragraph on interpretability implications gives the reader a forward-looking perspective

**Issues:**

1. **The bias/ReLU section is incomplete.** The TODO placeholder (line 19) is understood for a draft, but the textual explanation (lines 20–23) currently works *without* a figure — it's self-contained. When the figure is added, ensure the text doesn't become redundant with it. Currently, the explanation of how bias cancels expected interference is well-written but could be slightly more explicit: "The bias is learned to be approximately $b_j \approx -\sum_{k \neq j} (w_j \cdot w_k) \cdot E[x_k]$" — this would make the cancellation concrete for mathematically inclined readers.

2. **The JL lemma notation may be unfamiliar.** $n = e^{\Omega(d \cdot \varepsilon^2)}$ uses asymptotic Ω notation, which may not be familiar to all ML researchers (many know big-O but not big-Ω). Consider stating it more plainly: "the number of vectors grows exponentially with the dimension $d$."

3. **Missing: reference to sparse autoencoders (SAEs).** For a VISxAI audience working in interpretability, the connection to SAEs is significant: if superposition makes features entangled in activation space, SAEs are the primary tool for disentangling them. Even a single sentence like "Sparse autoencoders (Bricken et al., 2023) have emerged as a practical tool for recovering individual features from superposed representations" would contextualize the work.

4. **Missing: connection to polysemanticity.** Superposition is closely related to the observation that individual neurons in neural networks are polysemantic (respond to multiple unrelated concepts). A brief mention would help readers connect this to the broader interpretability literature.

5. **The "What this means for neural networks" section could be stronger.** It correctly states superposition is "one contributing explanation" but doesn't hint at what the others might be. Even naming one alternative (e.g., "other mechanisms such as computation in superposition or nonlinear feature interactions also play a role") would make the hedging more informative.

6. **Missing: limitations of the toy model.** The toy model has no nonlinearity in the encoder, uses synthetic data, has tied weights, and only studies one layer. A brief acknowledgment that real networks exhibit superposition in more complex forms would be scientifically responsible.

**Scientific correctness:**
- The definition of superposition is consistent with Elhage et al. (2022)
- The spherical codes discussion is accurate
- The JL lemma statement is correct (this is the standard inverse form)
- The concentration of measure reference is appropriate
- The bias cancellation mechanism is qualitatively correct
- The 3B1Brown claim about 10,000 vectors in 100D is verifiable and correct

**What could be sacrificed:** The full JL lemma statement with Ω notation (lines 42–43) could be simplified to the qualitative claim ("exponential in dimension") without the formal expression, which may intimidate some readers while not adding much for experts.

**What could be deepened:** The interpretability implications. The final paragraph (lines 54–55) gestures at "disentangling superposition" as a central problem but doesn't explain why it matters practically (e.g., for safety, for understanding model failures, for steering model behavior).

---

## Cross-Cutting Concerns

### 1. Notation Consistency
- **$y$ vs. $h$ for embedding vector.** Section 2 uses $y$, section 3 uses $h$. Must be unified. Recommend $h$ throughout.
- **Feature indexing.** Blog uses 1-based ($f_1, \ldots, f_n$, $I_i = \alpha^{i-1}$). EXPERIMENT.md uses a formula that appears 0-based ($I_i = \alpha^i$). Consistent 1-based indexing in the blog is fine, but EXPERIMENT.md should be updated.

### 2. Format Consistency
Section 1 is predominantly bullet-point lists. Sections 2–3 mix bullets with prose. Sections 4–5 are primarily narrative with task lists. For a VISxAI submission, narrative prose is the expected format. Section 1 in particular should be converted from bullets to paragraphs.

### 3. Formal Citations
The draft informally references:
- Elhage et al. (2022) / Anthropic's Toy Models of Superposition
- Neuronpedia
- 3Blue1Brown
- spherical-codes.org

For an IEEE workshop submission, proper academic citations are required:
- Elhage, N., et al. (2022). *Toy Models of Superposition.* Transformer Circuits Thread.
- Bricken, T., et al. (2023). *Towards Monosemanticity.* (if SAEs are mentioned)
- Johnson, W. B., & Lindenstrauss, J. (1984). *Extensions of Lipschitz mappings into a Hilbert space.*
- A references section at the end is needed.

### 4. Missing Structural Elements
For a VISxAI submission:
- **Abstract / contribution statement.** What is the contribution? (An interactive explorable explanation that guides readers through discovering superposition via progressive experiments with a toy autoencoder.)
- **Section 6 / Recap.** Currently does not exist. Needed to summarize key takeaways, acknowledge limitations, and point to further reading (Anthropic's full paper, SAE research, other VISxAI work).
- **References section.**
- **Author information / acknowledgments.**

### 5. Interactive Visualization Integration
The text currently treats the interactive visualizations as an assumed side panel with minimal explicit reference. For VISxAI, the visualization IS the core contribution. Consider:
- Section 1 should mention that this is an interactive article early on
- Section 2 should reference the side-panel visualization of the concrete 2D example being discussed
- Section 4 should describe what the reader *sees* in more detail (e.g., "In the embedding view, you will see the two feature direction vectors as colored arrows originating from the origin")
- Throughout: use phrases like "observe in the visualization" or "the panel to the right shows" to anchor the reader

### 6. Length Assessment
Current approximate lengths:

| Section | Lines | Approx. words |
|---------|-------|---------------|
| 1. Motivation | 58 | ~650 |
| 2. Math Fundamentals | 101 | ~1,050 |
| 3. Autoencoder | 52 | ~550 |
| 4. Experiments | 64 | ~750 |
| 5. Superposition | 56 | ~650 |
| **Total** | **331** | **~3,650** |

This is moderate for a VISxAI submission. Past VISxAI entries range from ~2,000 to ~10,000+ words (Distill-style articles). The current length is on the shorter side, which is appropriate given that the interactive visualizations carry substantial explanatory load. However:

- **Section 2 (Math Fundamentals) is the longest** and could be tightened. The 2D example uses ~70 lines for what is essentially one worked example. Some intermediate steps (e.g., restating the embedding equation before the dot product expansion) could be cut.
- **Section 5 (Superposition) could be slightly expanded.** The interpretability implications and limitations currently get 2 lines, which is thin for the article's capstone section.
- **A recap (section 6) of ~200–300 words is needed.**

### 7. Educational Approach — What Works
- **Progressive disclosure.** Concepts are introduced only when needed: features after embeddings, Gram matrix after interference is observed, sparsity after the dense case fails, superposition after the reader has seen it.
- **Concrete before abstract.** Numerical examples precede general formulas throughout.
- **Discovery-based learning.** Section 4 asks the reader to observe patterns before revealing the underlying principle.
- **Reusable mental model.** The W/W^T/W^TW framework ("combine / measure / interference") is introduced once and used consistently.

---

## Scientific Correctness Summary

| Claim | Status | Notes |
|-------|--------|-------|
| Quadratic scaling of parameters with $d_\text{model}$ | ✅ Correct | Dominant terms in transformer: $12Ld^2$ |
| Feature directions as columns of $W$ | ✅ Correct | Standard convention |
| $W^T$ computes projections (dot products) | ✅ Correct | $(W^Ty)_i = w_i \cdot y$ |
| $W^TW$ is the Gram matrix (even when $m \neq n$) | ✅ Correct | Gram matrix of column vectors |
| $W^TW = I$ ⟹ perfect recovery | ✅ Correct | In the linear case (no ReLU/bias) |
| $W^T = W^{-1}$ for square orthonormal $W$ | ✅ Correct | Definition of orthogonal matrix |
| Importance $I_i = \alpha^{i-1}$ | ✅ Correct | Matches code (0-based index: `Math.pow(α, i)`) |
| Half-normal mean $\sqrt{2/\pi} \approx 0.798$ | ✅ Correct | Standard result |
| Co-activation probability $S^2$ | ✅ Correct | Under independence (which is the sampling model) |
| 5 vectors at $72°$ in 2D | ✅ Correct | $360°/5 = 72°$; regular pentagon |
| JL lemma: $n = e^{\Omega(d \varepsilon^2)}$ | ✅ Correct | Standard inverse form |
| 10,000 vectors in 100D nearly orthogonal | ✅ Correct | 3B1B / concentration of measure |
| "Linear model" description of autoencoder | ⚠️ Misleading | Encoder is linear; model overall is nonlinear (ReLU) |
| Adam as "gradient descent" | ⚠️ Imprecise | Adam is adaptive, not vanilla SGD |
| EXPERIMENT.md: $I_i = \alpha^i$ | ❌ Inconsistent | Should be $\alpha^{i-1}$ (1-indexed) or clarify 0-indexed |

---

## Priority Recommendations

### High Priority (should be addressed before submission)
1. **Unify notation:** $y$ → $h$ for embedding vector across sections 2 and 3
2. **Convert section 1 from bullet lists to prose paragraphs** for format consistency
3. **Fix "linear model" claim** in section 3 — the model has a nonlinear decoder
4. **Remove the paper title "Toy Models of Superposition"** from section 1 to avoid premature use of the word "superposition"
5. **Add a recap/conclusion section** (section 6)
6. **Add formal references section** with proper citations
7. **Add an abstract/contribution statement** suitable for VISxAI

### Medium Priority (significantly improves quality)
8. Bridge section 2 to the $m < n$ case explicitly before ending
9. Describe the interactive visualizations more concretely in the text (what the reader sees, where to look)
10. Add a note about SAEs and/or polysemanticity in section 5 for interpretability context
11. Acknowledge toy model limitations in section 5 or 6
12. Number experiments more clearly (interlude between Exp 2 and Exp 3 for sparsity)
13. Add brief guidance for when experiments don't converge as expected

### Lower Priority (polish)
14. Tighten section 2's 2D example (~10–15 lines could be cut)
15. Add caption to the basis_types.png plot
16. Explain why $\alpha = 1.0$ is used in Experiment 4
17. Fix "gradient descent (Adam)" to "gradient-based optimization (Adam)"
18. Expand interpretability implications in the closing paragraphs
19. Add one concrete feature example in section 1 to ground the "features as directions" idea
