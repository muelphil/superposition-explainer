# Superposition Toy Model Visualization

The [Toy Models of Superposition](https://transformer-circuits.pub/2022/toy%5Fmodel/index.html) post by Anthropic researchers, also released as a paper Elhage et al., 2022 provides a visualized walkthrough of the concept. Especially the visualizations may be very helpful in introducing this concept. A post by Axel Sørensen, [Toy Models of Superposition: Simplified by Hand](https://www.lesswrong.com/posts/8CJuugNkH5FSS9H2w/toy-models-of-superposition-simplified-by-hand) (2024), further breaks the concept down and showcases this on a simple example, making it very tangible.

This provides documenation on the experiment done by Axel Sørensen.

---

# 1. Purpose

* Implement a minimal **toy model demonstrating feature superposition** as described in
    * Anthropic toy model work and
    * Axel Sørensen.
* Model shows how **features > latent dimensions** leads to **shared representations** depending on sparsity.
* Visualization plots **feature embedding vectors** derived from the model weight matrix.

---

# 2. Synthetic Dataset

* Data vectors:

[
x \in \mathbb{R}^n
]

* Feature activation:

[
x_i =
\begin{cases}
\mathcal{N}(0,1) & \text{with probability } S \
0 & \text{otherwise}
\end{cases}
]

* Parameters:

    * (n): number of features
    * (S): feature sparsity
    * samples generated on-the-fly (infinite dataset)

---

# 3. Model Architecture

Linear autoencoder with tied weights.

Forward pass:

[
h = W x
]

[
x' = \text{ReLU}(W^T h + b)
]

Full mapping:

[
x' = \text{ReLU}(W^T W x + b)
]

Parameters:

[
W \in \mathbb{R}^{m \times n}
]

[
b \in \mathbb{R}^{n}
]

Where:

* (n): number of features
* (m): latent dimensions (neurons)

Constraint:

[
m < n
]

---

# 4. Training Objective

Weighted reconstruction loss:

[
L = \sum_{i=1}^{n} I_i (x_i - x'_i)^2
]

Feature importance schedule:

[
I_i = \alpha^i
]

Typical range:

[
0 < \alpha < 1
]

---

# 5. Training Procedure

* Optimization: stochastic gradient descent or Adam
* Data sampled per step from synthetic generator
* Typical training configuration:

Parameters:

* steps: (10^4)–(10^5)
* batch size: (10^2)–(10^3)

Update parameters:

[
W, b \leftarrow W, b - \eta \nabla L
]

---

# 6. Feature Embedding Representation

Each feature (i) corresponds to a column of the weight matrix.

[
v_i = W[:, i]
]

Properties:

* (v_i \in \mathbb{R}^m)
* represents embedding direction of feature (i)

Visualization:

* plot vectors (v_i) in latent space.

---

# 7. Sparsity Effects

Behavior depends on feature activation probability (S).

Dense regime:

[
S \approx 1
]

* few features represented
* vectors approximate orthogonal basis.

Sparse regime:

[
S \ll 1
]

* multiple features share dimensions
* vectors distribute to minimize interference.

Condition enabling superposition:

[
m < n
]

and

[
S \text{ sufficiently small}
]

---

# 8. Superposition Metrics

Feature presence:

[
|v_i|^2
]

Interpretation:

* large value → feature encoded
* near zero → feature ignored.

Feature interference:

[
\sum_{j \ne i} (\hat{v}_i \cdot v_j)^2
]

where

[
\hat{v}_i = \frac{v_i}{|v_i|}
]

Large value indicates shared representation.

---

# 9. Data Generation Volume

* Dataset is procedurally generated.
* Effective number of samples:

[
N \approx \text{steps} \times \text{batch size}
]

Typical magnitude:

[
10^6 – 10^7
]

Memory cost: constant.

---

# 10. Browser-Compatible Implementation

Feasible approaches:

### Tensor library

Use:

* TensorFlow.js

Capabilities:

* GPU acceleration
* automatic differentiation.

---

### Custom matrix implementation

Use:

* plain arrays or
* math.js.

Required operations:

* matrix multiplication
* transpose
* ReLU
* gradient updates.

---

# 11. Interactive Parameters

Expose adjustable variables:

Feature sparsity:

[
S \in (0,1]
]

Feature count:

[
n
]

Latent dimensions:

[
m
]

Training steps or learning rate.

---

# 12. Visualization Requirements

Plot vectors:

[
v_i = W[:, i]
]

Constraints:

* 2D latent space recommended:

[
m = 2
]

Visualization system options:

* D3.js
* Three.js

Rendering:

* origin anchored vectors
* color-coded by feature index.

---

# 13. Training Visualization

During training expose:

[
W(t)
]

Procedure:

* periodically read current weight matrix
* recompute vectors (v_i)
* update plot.

Animation frequency:

[
1–10 \text{ updates/sec}
]

---

# 14. Core Phenomenon Demonstrated

Superposition occurs when:

[
m < n
]

and

[
S \text{ small}
]

Result:

* multiple features encoded in overlapping directions
* geometry emerges minimizing feature interference.

---

# 15. Minimal Implementation Scope

Minimum viable configuration:

[
n = 5
]

[
m = 2
]

[
S \in [0.01, 1]
]

Train until convergence and visualize vectors (v_i).
