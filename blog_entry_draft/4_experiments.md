## Experiments

With the autoencoder defined, we can now explore how it learns to compress features. The interactive model in the side panel lets you configure the architecture, train the model, and observe its learned representations in real time. The following experiments build up progressively — from a trivial setting to one that reveals a striking emergent pattern.

### Experiment 1: Two features in two dimensions

We begin with the simplest case: $n = 2$ features and $m = 2$ embedding dimensions. Since the embedding space has exactly as many dimensions as there are features, the model can in principle represent both without compromise.

- [ ] Set the number of features to 2 and the embedding dimension to 2
- [ ] Set sparsity $S = 1.0$ (all features always active) and importance $\alpha = 1.0$ (equal importance)
- [ ] Run training and wait for convergence
- [ ] Observe the loss in the training statistics panel
- [ ] Observe the angle between the two feature direction vectors in the embedding view
- [ ] Check the vector lengths in the weight view

> **Insight:** The model converges to an orthonormal basis — two perpendicular, unit-length feature directions. The Gram matrix $W^TW$ approaches the identity, and reconstruction loss drops to zero. This is the ideal case from the geometric foundations: with enough dimensions, the model can represent every feature without interference.

### Experiment 2: More features than dimensions

Now we increase the number of features beyond the embedding capacity: $n = 4$ features in $m = 2$ dimensions. With all features always active ($S = 1.0$), the model cannot avoid overlap.

- [ ] Increase the number of features to 4
- [ ] Set importance $\alpha = 0.8$, keeping $S = 1.0$
- [ ] Run training
- [ ] Hover over each input neuron (ordered by descending importance) and observe which features have nonzero direction vectors in embedding space
- [ ] For the features that are not represented in embedding space, check their learned bias — compare this value to the mean of the [half-normal distribution](https://en.wikipedia.org/wiki/Half-normal_distribution): $\mu = \sqrt{2/\pi} \approx 0.798$

> **Insight:** The model cleanly represents only the two most important features ($f_1$ and $f_2$) using an orthonormal basis and completely ignores the two least important ones — their feature direction vectors collapse to near-zero length. For the ignored features, the model sets the bias to approximately the mean of the half-normal distribution. Since these features are always active with expected value $\mu$, statically outputting $\mu$ minimizes the average squared error. This is the best the model can do without dedicating any embedding capacity to these features.

### Feature sparsity

In real neural networks, not all features are active at the same time. Consider the vast space of possible features: *is_plural*, *is_question*, *refers_to_Einstein*, *is_about_cooking*. For any given input, only a small fraction of all potentially useful features will be relevant. Most features are inactive most of the time — this property is called **sparsity**.

We model sparsity by introducing a parameter $S \in (0, 1]$ that controls the probability that each feature is active in a given training sample:

$$x_i = \begin{cases} |\mathcal{N}(0,1)| & \text{with probability } S \\ 0 & \text{otherwise} \end{cases}$$

When $S = 1.0$, every feature is always active (the dense case from above). As $S$ decreases, features become increasingly sparse — each one is active only a fraction of the time. This means that any two specific features are simultaneously active with probability $S^2$, which shrinks rapidly.

- [ ] Resample a few times using the resample button to observe the input vectors
- [ ] Then decrease sparsity to $S = 0.1$ and resample again — notice how most feature activations are now zero

### Experiment 3: Sparsity changes the game

With sparsity, the same bottleneck problem — four features in two dimensions — may admit a fundamentally different solution.

- [ ] Keep $n = 4$, $m = 2$, $\alpha = 0.8$
- [ ] Set sparsity to $S = 0.1$ and run training
- [ ] Observe the feature directions in the embedding view — how many features are now represented?
- [ ] Activate individual features one at a time using the input sliders and observe the reconstruction
- [ ] Now set all inputs to zero. Then manually increase the activations of two features whose directions point in roughly opposite directions to $1.0$. Observe the reconstruction and the loss.

> **Insight:** With sparse features, the model now represents all four features — placing them in roughly opposite pairs. Features paired along opposite directions share the same axis: $f_1$ might point along $+e_1$ and $f_3$ along $-e_1$. When only one of them is active, the decoder recovers it accurately. When both are active simultaneously, their contributions partially cancel in embedding space, causing significant reconstruction error. But with $S = 0.1$, this co-activation happens only about $S^2 = 1\%$ of the time — a rare event that contributes little to the expected loss. The model accepts occasional large errors in exchange for representing more features overall.

### Experiment 4: Beyond doubling

Opposite directions doubled the number of representable features from 2 to 4. Can the model go further?

- [ ] Increase to $n = 5$ features, keep $m = 2$
- [ ] Set $S = 0.1$ and $\alpha = 1.0$ (equal importance)
- [ ] Run training and observe the feature directions in the embedding view
- [ ] Check the minimum angle between feature directions in the training statistics — compare it to $360° / 5 = 72°$

> **Insight:** The model distributes five feature directions evenly around the unit circle, spaced at approximately $72°$ apart. No pair of feature directions is orthogonal — every pair has nonzero interference. But by spreading the directions as uniformly as possible, the model minimizes the worst-case pairwise cross-talk. The minimum angle of $72°$ is less than the $90°$ required for zero interference, so some reconstruction error is always present. Yet the model has found a configuration where the benefit of representing all five features outweighs the cost of this interference — because features are sparse enough that multi-feature co-activations are rare. The resulting arrangement is the vertices of a regular pentagon inscribed in the unit circle, which is the configuration that maximizes the minimum pairwise angle in 2D.

What you have observed — the model representing more features than it has dimensions by accepting controlled, geometrically minimized interference — is a fundamental phenomenon. The next section gives it a name and examines why it scales far beyond what these small examples suggest.
