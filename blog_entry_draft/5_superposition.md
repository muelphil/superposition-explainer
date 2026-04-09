## Superposition

### What you observed

In Experiment 3, the model exploited the non-negativity of feature activations together with sparsity to place features in opposite directions — doubling its capacity without introducing interference between orthogonal pairs. In Experiment 4, the model went further: it packed five features into two dimensions at angles of $72°$, where **every pair of features genuinely interferes**. No pair is orthogonal. The model accepted cross-talk between all feature directions in exchange for representing more features than the embedding space can accommodate without overlap.

This behavior — encoding more features than there are embedding dimensions by distributing feature directions at non-orthogonal angles, accepting interference as a cost — is called **superposition**.

### The tradeoff

Superposition is fundamentally a tradeoff between **feature capacity** and **reconstruction fidelity**. When the number of features is less than or equal to the embedding dimension, the model can assign each feature its own orthogonal direction — no interference, no reconstruction error. When there are more features than dimensions, every additional represented feature introduces cross-talk. Whether the tradeoff is worthwhile depends on a feature's importance, the degree of sparsity (which determines how rarely interference actually manifests), and how far apart the feature directions are arranged.

### How bias and ReLU compensate

The bias $b$ and the ReLU activation — whose significance we deferred in the model definition — play a concrete role in making superposition work.

In the superposition regime, you will notice that the feature direction vectors are all roughly of unit length and the learned bias is approximately equal across features. Under these assumptions — normalized feature directions and uniform bias — we can visualize why the model chose this particular bias value.

<!-- TODO: include plot of superposition with one active feature, showing the interference from other feature directions and the bias canceling it -->

Assume only feature $f_1$ is active. The projection of the embedding onto each other feature direction $w_j$ produces a nonzero interference term proportional to the alignment between $w_j$ and $w_1$. With all feature directions of length 1, this interference is directly visible as the projection of each other feature direction onto $f_1$. The model learns a negative bias that **nearly cancels out the total expected interference** from the other feature directions. When the residual interference after bias correction is negative, ReLU clamps it to zero — correctly indicating that the feature is not present.

This is why non-negative feature activations matter: with strictly non-negative ground truth, any negative decoder output is necessarily an error, and ReLU can safely discard it. Together, bias and ReLU act as a denoising mechanism — bias shifts the interference below zero, and ReLU eliminates it.

### Scaling: it is exponential

In two dimensions, we observed 5 features packed at $72°$ minimum separation — $2.5\times$ the number of embedding dimensions. How does this scale with dimensionality?

The number of nearly-orthogonal directions that can coexist in a $d$-dimensional space grows **exponentially** with $d$.

This is a well-studied problem in combinatorial geometry known as **spherical codes**: given $d$ dimensions, how many unit vectors can be placed such that every pairwise angle exceeds some threshold $\theta_{\min}$? At $\theta_{\min} = 90°$, the answer is exactly $2d$ (the positive and negative direction along each axis). But as the angle threshold is relaxed even slightly below $90°$, the achievable count rises dramatically.

![Maximum number of unit vectors that can be simultaneously placed in a d-dimensional space (d = 3 to 15) such that every pair subtends an angle of at least α degrees. The x-axis runs from 90° (left) to 63° (right); the y-axis uses a linear scale. At 90° each dimension d can hold exactly 2d vectors (the cross-polytope); as the angle threshold decreases the achievable count rises in discrete steps, with higher-dimensional spaces (yellow) accommodating substantially more vectors than lower-dimensional ones (green). Data combines closed-form solutions for regular simplices and cross-polytopes with numerically optimal spherical codes from N. J. A. Sloane's tables (spherical-codes.org).](./plots/vectors_vs_angle_lin_y.png)

Concrete examples from optimal spherical code tables ([spherical-codes.org](https://spherical-codes.org/)):
* In $d = 3$ with a minimum angle of $63°$: up to **10 unit vectors** fit ($\sim 3.3\times$ the dimension).
* In $d = 15$ with the same threshold: up to **1,000 unit vectors** fit ($\sim 67\times$ the dimension).

No closed-form formula exists for the exact packing number in general, but numerical constructions and theoretical bounds consistently show this exponential growth.

A striking demonstration comes from 3Blue1Brown ([*How might LLMs store facts*, Chapter 7](https://youtu.be/9-Jl0dxWQs8?si=1JIOc0Yfg0T_H5iJ&t=1025)): it is possible to place **10,000 vectors in just 100 dimensions** while all pairwise angles remain between $89°$ and $90°$ — virtually orthogonal, despite outnumbering the dimensions by a factor of 100.

This near-orthogonality in high dimensions is a consequence of the **concentration of measure**, a fundamental property of high-dimensional geometry. A precise version is given by the **Johnson–Lindenstrauss lemma**: any set of $n$ points can be projected into $d = O(\log n \,/\, \varepsilon^2)$ dimensions while preserving all pairwise distances within $(1 \pm \varepsilon)$. Inverting this, in $d$ dimensions there exist $n = e^{\Omega(d \cdot \varepsilon^2)}$ vectors whose pairwise angles deviate from $90°$ by at most $\varepsilon$. The capacity for nearly-orthogonal representations is exponential in the dimension.

### What this means for neural networks

Superposition is one contributing explanation for how language models with embedding dimensions of a few thousand could represent a vastly larger number of features — potentially millions — with each pair of feature directions remaining nearly orthogonal. The interference between any two features stays proportional to the cosine of their angle (close to zero), and with the sparsity of real-world features, the expected cost of this interference remains manageable.

This is the core insight of the **superposition hypothesis**: neural networks may routinely represent far more features than they have dimensions, because:

1. **Features are sparse** — most are inactive at any given time, so interference rarely manifests.
2. **High-dimensional geometry is exponentially permissive** — it allows vastly more nearly-orthogonal directions than the dimension count would suggest.
3. **Nonlinearities suppress residual interference** — bias and ReLU discard small cross-talk.

Superposition is both a powerful representational strategy and a challenge for interpretability. If each dimension encodes a mixture of many features, understanding what a model represents from its activations becomes far harder than if features were cleanly separated. Disentangling superposition is one of the central problems in mechanistic interpretability research.
