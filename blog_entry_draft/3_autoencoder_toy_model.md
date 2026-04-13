## The Toy Autoencoder

The clean encode/decode symmetry of an orthonormal basis — embed with $W$, recover with $W^T$ — is the geometric intuition behind the architecture of our toy autoencoder. In this section, we define the model formally.

### Architecture

The autoencoder uses a linear encoder and a nonlinear decoder with tied weights, mapping an $n$-dimensional feature vector through an $m$-dimensional embedding and back:

**Encoder.** The encoder computes the embedding $y$ as a linear combination of feature direction vectors $w_i$, weighted by the feature activations $x_i$:
$$y = Wx$$

where $W \in \mathbb{R}^{m \times n}$ is the weight matrix whose columns $w_1, \ldots, w_n$ are the learned feature direction vectors in embedding space.

**Decoder.** The decoder projects the embedding $y$ onto each feature direction — measuring how much $y$ aligns with each $w_i$ — and applies a bias and ReLU nonlinearity:
$$\hat{x} = \text{ReLU}(W^T y + b)$$

where $b \in \mathbb{R}^n$ is a learned bias vector. The transpose $W^T$ computes the dot product of $y$ with every feature direction at once: the $i$-th entry of $W^T y$ is $w_i \cdot y$.

**Full forward pass.** Substituting $y = Wx$:
$$\hat{x} = \text{ReLU}(W^T W x + b)$$

The Gram matrix $W^T W$ reappears: its off-diagonal entries determine how much cross-talk (interference) occurs between features during reconstruction. If $W^T W = I$, recovery would be exact (up to the bias and ReLU). The model's task during training is to find feature directions that balance reconstruction accuracy against the unavoidable interference when $m < n$.

**Why tied weights?** Using $W^T$ as the decoder is directly motivated by the geometry of orthonormal bases. In the ideal case where the columns of $W$ are orthonormal, $W^T$ is the exact inverse — encoding and decoding are perfectly symmetric. Even when orthonormality is not achievable (because there are more features than dimensions), the tied-weight structure provides a natural inductive bias toward this geometric ideal.

**Bias and ReLU.** The decoder includes a learned bias $b$ and a ReLU activation. Their significance will become clear in the experiments. In brief, they allow the model to compensate for interference when features must share dimensions.

### Synthetic training data

We generate synthetic feature vectors $x \in \mathbb{R}^n$ directly in feature space rather than training on real text, where token statistics, linguistic structure, and optimizer dynamics would all be entangled. Each coordinate of $x$ cleanly represents one disentangled feature, isolating the geometric compression problem from all other aspects of learning.

Feature activations are sampled from the **half-normal distribution** $|z|$ where $z \sim \mathcal{N}(0, 1)$:
$$x_i = |\mathcal{N}(0, 1)|$$

This yields strictly non-negative activations, reflecting that we model features in terms of **presence and strength** rather than polarity. A feature is either absent ($x_i = 0$) or present with some positive activation. Concepts that might seem to require negative values — such as "negative sentiment" — are instead represented by their own distinct feature (e.g., a separate $f_\text{negative\_sentiment}$) rather than as a negative activation of a "positive sentiment" feature.

### Training objective

In a large language model, internal representations must support a very large number of potentially useful features learned from vast amounts of training data. These features are not equally important: some encode information that is much more consequential for producing the correct next-token prediction than others. In practice, this relative importance is not manually specified, but emerges implicitly during training from how strongly different features affect predictive performance.

To emulate this in the toy model, the autoencoder is trained to minimize the reconstruction error between $x$ and $\\hat{x}$, while weighting some input features more heavily than others. We therefore introduce **feature importance** weights $I_i$, which scale each feature’s contribution to the loss:

$\mathcal{L}(x, \hat{x}) = \sum_{i=1}^{n} I_i \, (x_i - \hat{x}_i)^2$

The importance weights follow an exponential decay schedule controlled by a parameter $\\alpha \\in (0, 1\]$:

$I_i = \alpha^{i-1}$

Feature $f_1$ has importance $I_1 = \alpha^0 = 1$ (highest); each subsequent feature matters less by a factor of $\alpha$. This creates unequal pressure during training: when embedding capacity is limited, the model is incentivized to preserve more important features more faithfully, while tolerating larger reconstruction errors on less important ones.

Training proceeds by sampling batches of synthetic feature vectors, computing the weighted loss, and updating $W$ and $b$ via gradient-based optimization (Adam).

