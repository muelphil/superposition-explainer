## Superposition

### What you observed

The pattern from the experiments — encoding more features than there are embedding dimensions by distributing feature directions at non-orthogonal angles — is called **superposition**. In superposition, each embedding dimension simultaneously participates in representing multiple features, and the feature directions form a geometry that is denser than any orthogonal basis could be.

More precisely: a representation exhibits superposition when the model uses $m$ embedding dimensions to encode $n > m$ features, accepting nonzero off-diagonal entries in the Gram matrix $W^TW$ — that is, interference between feature directions — in exchange for the ability to represent more features than the space can accommodate orthogonally.

### The tradeoff

Superposition is fundamentally a tradeoff between **feature capacity** and **reconstruction fidelity**.

In the ideal case ($n \leq m$), the model can assign each feature an orthogonal direction — no interference, no reconstruction error. Once $n > m$, orthogonality is impossible: there are simply not enough linearly independent directions. Every additional feature the model chooses to represent introduces cross-talk: when feature $f_j$ is active, its embedding $x_j w_j$ produces a spurious projection onto every other feature direction $w_i$, proportional to their dot product $w_i \cdot w_j$. This is the interference captured by the off-diagonal entries of the Gram matrix.

Whether the model should represent a feature in superposition — or drop it entirely — depends on three quantities:

* **Feature importance** $I_i$: the cost of failing to reconstruct feature $f_i$. A high-importance feature that is completely unrepresented contributes significantly to the loss, so the model has strong incentive to include it.
* **Sparsity** $S$: the probability that a feature is active. Two features interfere only when both are active simultaneously, which occurs with probability $S^2$ (assuming independence). The rarer the co-activation, the cheaper the interference.
* **Geometric interference** $w_i \cdot w_j$: the dot product between feature direction vectors. This determines the magnitude of cross-talk per co-activation. By arranging feature directions far apart, the model reduces the interference per event.

A feature is worth including in superposition when the expected reconstruction benefit of representing it exceeds the expected interference cost it introduces. Because the interference cost scales with $S^2$, sparser features can be packed much more aggressively: the rarer the co-activations, the less the interference matters in expectation.

### How bias and ReLU compensate

The bias $b$ and the ReLU activation — whose significance we deferred in the model definition — play a concrete role in making superposition viable.

Consider the trained model from Experiment 4: five unit-length feature directions spread evenly at $72°$ around the unit circle. Suppose only feature $f_1$ is active with value $x_1$. The raw decoder output for feature $f_j$ before ReLU is:

$$z_j = w_j \cdot (w_1 \, x_1) + b_j = (w_j \cdot w_1) \, x_1 + b_j$$

For $j = 1$: the self-projection $w_1 \cdot w_1 = 1$ recovers $x_1$ directly (shifted by $b_1$).

For $j \neq 1$: the cross-projection $w_j \cdot w_1 = \cos(\theta_{j1})$ produces a nonzero interference term. This is where bias and ReLU work together:

1. **Bias cancels expected interference.** The model learns a negative bias $b_j$ that approximately offsets the average interference from all other features. When $f_1$ alone is active, the residual $\cos(\theta_{j1}) \, x_1 + b_j$ is shifted toward zero or below.
2. **ReLU suppresses false activations.** When the residual is negative — indicating that the interference is not large enough to look like a genuine activation — the ReLU clamps the output to zero: $\hat{x}_j = \text{ReLU}(z_j) = 0$. This correctly reflects that feature $f_j$ is not present.

The combination acts as a simple denoising mechanism. The bias provides a threshold that separates genuine activations (large positive projections) from interference artifacts (small or negative projections), and ReLU enforces a hard floor at zero. This is also why non-negative feature activations are essential to the setup: with strictly non-negative ground truth, any negative decoder output is necessarily an error that ReLU can safely discard.

### Scaling: it is exponential

In two dimensions, we observed 5 features packed at $72°$ minimum separation — $2.5\times$ the number of embedding dimensions. A natural question is: how does this scale with dimensionality?

The answer is remarkable. The number of nearly-orthogonal directions that can coexist in a $d$-dimensional space grows **exponentially** with $d$.

This is a well-studied problem in combinatorial geometry known as **spherical packing** or **spherical codes**: given $d$ dimensions, how many unit vectors can be placed such that every pairwise angle exceeds some threshold $\theta_{\min}$? At $\theta_{\min} = 90°$, the answer is exactly $2d$ — the cross-polytope, which consists of the positive and negative directions along each coordinate axis. But as the angle threshold is relaxed even slightly below $90°$, the achievable count rises dramatically, and higher-dimensional spaces accommodate disproportionately more vectors.

![Maximum number of unit vectors that can be simultaneously placed in a d-dimensional space (d = 3 to 15) such that every pair subtends an angle of at least α degrees. The x-axis runs from 90° (left) to 63° (right); the y-axis uses a linear scale. At 90° each dimension d can hold exactly 2d vectors (the cross-polytope); as the angle threshold decreases the achievable count rises in discrete steps, with higher-dimensional spaces (yellow) accommodating substantially more vectors than lower-dimensional ones (green). Data combines closed-form solutions for regular simplices and cross-polytopes with numerically optimal spherical codes from N. J. A. Sloane's tables (spherical-codes.org).](./plots/vectors_vs_angle_lin_y.png)

Concrete examples from optimal spherical code tables ([spherical-codes.org](https://spherical-codes.org/)):
* In $d = 3$ with a minimum angle threshold of $63°$: up to **10 unit vectors** can be placed ($\sim 3.3\times$ the dimension).
* In $d = 15$ with the same $63°$ threshold: up to **1,000 unit vectors** fit ($\sim 67\times$ the dimension).

No closed-form formula exists for the exact packing number in general, but numerical constructions and theoretical bounds consistently show this rapid, super-linear growth.

A striking experimental demonstration is given by 3Blue1Brown ([*How might LLMs store facts*, Chapter 7](https://youtu.be/9-Jl0dxWQs8?si=1JIOc0Yfg0T_H5iJ&t=1025)): using random high-dimensional vectors, it is possible to place **10,000 vectors in just 100 dimensions** while maintaining all pairwise angles between $89°$ and $90°$ — virtually orthogonal, despite outnumbering the dimensions by a factor of 100.

This near-orthogonality of random vectors in high dimensions is not a coincidence but a consequence of the **concentration of measure** — a fundamental property of high-dimensional geometry. A precise version is given by the **Johnson–Lindenstrauss lemma**, which states that any set of $n$ points in high-dimensional space can be projected into $d = O(\log n \,/\, \varepsilon^2)$ dimensions while preserving all pairwise distances within a factor of $(1 \pm \varepsilon)$. Inverting this: in $d$ dimensions, there exist configurations of $n = e^{\Omega(d \cdot \varepsilon^2)}$ vectors whose pairwise angles deviate from $90°$ by at most $\varepsilon$. The capacity for nearly-orthogonal representations is exponential in the dimension.

### What this means for neural networks

The exponential scaling of superposition explains how a language model with an embedding dimension of a few thousand could, in principle, represent a vastly larger number of features — potentially millions — with each pair of feature directions being nearly orthogonal. The interference between any two features is proportional to the cosine of their angle, which remains close to zero. Combined with the sparsity of real-world features, the expected cost of this interference stays manageable.

This is the core insight of the **superposition hypothesis**: neural networks may routinely represent far more features than they have dimensions, and they can do so because:

1. **Features are sparse** — most are inactive at any given time, so interference rarely manifests.
2. **High-dimensional geometry is exponentially permissive** — it allows vastly more nearly-orthogonal directions than the number of dimensions would naively suggest.
3. **Nonlinearities suppress residual interference** — bias and ReLU act as a denoising mechanism that discards small cross-talk.

Superposition is both a powerful representational strategy and a source of difficulty for interpretability. If each dimension encodes a mixture of many features, reading off what a model "knows" from its activations becomes far harder than if features were cleanly separated along individual axes. Understanding and disentangling superposition is one of the central challenges of mechanistic interpretability research.
