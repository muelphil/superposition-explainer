## Experiments

With the autoencoder defined, we can now put it to the test. The interactive model in the side panel lets you train the autoencoder and observe its learned representations in real time. The following experiments build progressively from a trivial setting to one that reveals a striking emergent pattern.

### Experiment 1: Two features in two dimensions

We begin with the simplest case: two features embedded in two dimensions. Since the embedding space has exactly as many dimensions as there are features, the model should be able to represent both without compromise.

- [ ] Run training and wait for convergence
- [ ] Check out the loss in the training statistics
- [ ] Check the angle between the two feature direction vectors in the training statistics
- [ ] Check the vector lengths in the weight view

> **Insight:** The model converges to an orthonormal basis — two perpendicular, unit-length feature directions. Reconstruction loss drops to zero. This is the ideal case from the geometric foundations: with enough dimensions, the model represents every feature without interference.

### Experiment 2: More features than dimensions

We now have four features to embed in only two dimensions — more features than the embedding space can accommodate orthogonally. But recall that our feature activations are strictly non-negative: a feature is either absent or present with positive strength. This means the negative direction along each embedding axis is never reached by any single feature. Could the model place additional features along these unused opposite directions, effectively doubling its capacity?

- [ ] Set importance $\alpha = 0.8$
- [ ] Run training
- [ ] Hover over each input neuron (ordered by descending importance) to observe which features are represented in embedding space
- [ ] For the features not represented, check their learned bias — compare it to the mean of the [half-normal distribution](https://en.wikipedia.org/wiki/Half-normal_distribution): $\mu = \sqrt{2/\pi} \approx 0.798$

> **Insight:** The model does *not* use opposite directions. Instead, it represents only the two most important features ($f_1$ and $f_2$) as an orthonormal basis and ignores the rest — their feature direction vectors collapse to near-zero length. Why not use the opposite directions? Because all features are always active: placing two features in opposite directions would be catastrophic, as their embeddings would partially cancel whenever both are active — which is always. For the ignored features, the model sets the bias to approximately the mean of the half-normal distribution. Since these features are always active with expected value $\mu$, statically outputting $\mu$ minimizes the average squared error without dedicating any embedding capacity.

### Interlude: Feature sparsity

In real neural networks, not all features are active at the same time. Consider the vast space of possible features: *is_plural*, *is_question*, *refers_to_Einstein*, *is_about_cooking*. For any given input, only a small fraction of all potentially useful features will be relevant. Most features are inactive most of the time — this property is called **sparsity**.

We model sparsity by introducing a parameter $S \in (0, 1]$ that controls the probability that each feature is active in a given training sample:

$$x_i = \begin{cases} |\mathcal{N}(0,1)| & \text{with probability } S \\ 0 & \text{otherwise} \end{cases}$$

When $S = 1.0$, every feature is always active (the dense case from above). As $S$ decreases, features become increasingly sparse — each one is active only a fraction of the time. Crucially, any two specific features are simultaneously active with probability $S^2$, which shrinks rapidly.

- [ ] Resample a few times using the resample button and observe the input vectors
- [ ] Decrease sparsity to $S = 0.2$ and resample again — notice how most feature activations are now zero

### Experiment 3: Sparsity changes the game

With sparsity, the same bottleneck — four features in two dimensions — may have a different solution. Now that features are rarely active at the same time, perhaps the opposite-direction strategy from before becomes viable.

- [ ] Set sparsity to $S = 0.1$ and run training
- [ ] Observe the feature directions in the embedding view — how many features are now represented?
- [ ] Activate individual features one at a time using the input sliders and observe the reconstruction
- [ ] Set all inputs to zero. Then increase the activations of two features whose directions point in opposite directions to $1.0$. Observe the embedding and the reconstruction error.

> **Insight:** With sparse features, the model now represents all four features, placing them in roughly opposite pairs. Features sharing an axis point in opposite directions: when only one is active, the decoder recovers it well. When both are active simultaneously, their contributions cancel in embedding space, causing significant error — but with $S = 0.1$, this co-activation happens only about $1\%$ of the time. The model accepts rare large errors in exchange for representing more features.
>
> Note that this is not yet breaking any geometric limit: the two pairs of feature directions remain orthogonal to each other. The model has simply exploited the non-negativity of feature activations combined with sparsity to use directions that were previously unavailable — doubling its effective capacity.

### Experiment 4: Beyond doubling

Exploiting opposite directions doubled the capacity from two to four features. Can the model go further — beyond what opposite directions alone provide? We now have five features in two dimensions.

- [ ] Set $\alpha = 1.0$ (equal importance)
- [ ] Run training and observe the feature directions in the embedding view
- [ ] Check the minimum angle between feature directions in the training statistics — compare it to $360° / 5 = 72°$

> **Insight:** The model distributes five feature directions evenly around the unit circle, spaced at approximately $72°$. Unlike the opposite-direction trick, where orthogonal pairs coexisted without mutual interference, **every pair of features now interferes** — no two directions are orthogonal. The model has accepted genuine cross-talk between all features in exchange for representing more of them. By spreading the directions as uniformly as possible, it minimizes the worst-case interference, and sparsity keeps the expected cost low.

This is qualitatively different from the previous experiment. The model is no longer just exploiting unused directions — it is actively trading reconstruction accuracy for representational capacity, accepting controlled interference between every pair of features. This behavior has deep geometric roots, and the next section gives it a name.
