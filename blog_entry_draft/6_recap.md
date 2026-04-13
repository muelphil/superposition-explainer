## Recap

This article traced a path from the dimensional bottleneck in neural network embeddings to the geometric phenomenon of superposition.

We began with the observation that neural networks must represent a vast, combinatorial space of features within embedding vectors of fixed and limited dimensionality. The mathematical foundations established that representing features as directions in embedding space naturally leads to the framework of the weight matrix $W$, its transpose $W^T$ for recovery, and the Gram matrix $W^TW$ as a measure of interference between feature directions. When features outnumber dimensions, perfect orthogonality is impossible, and some interference becomes unavoidable.

The toy autoencoder provided a controlled setting to study how a model navigates this constraint. Through progressive experiments, we observed that:

- With sufficient dimensions, the model learns an orthonormal basis — one direction per feature, zero interference.
- Under a dimensional bottleneck with dense features, the model sacrifices low-importance features entirely rather than accept constant interference.
- With sparse features, the model exploits opposite directions to double its capacity without introducing cross-talk between orthogonal pairs.
- With further pressure, the model distributes feature directions at non-orthogonal angles, accepting genuine interference in exchange for representing more features — the hallmark of superposition.

Superposition is a powerful representational strategy that leverages sparsity and the exponential capacity of high-dimensional geometry. It is also a fundamental obstacle for interpretability: when features overlap in activation space, understanding what a model internally represents requires tools — such as sparse autoencoders — to disentangle them.

The toy model studied here operates under simplifying assumptions: a linear encoder, synthetic data, tied weights, and a single layer. Real neural networks exhibit superposition in more complex forms, and active research continues to develop both theoretical understanding and practical tools for working with superposed representations. For further reading, we recommend the original *Toy Models of Superposition* paper (Elhage et al., 2022), the *Towards Monosemanticity* work on sparse autoencoders (Bricken et al., 2023), and the growing body of work in the VISxAI community on making these phenomena accessible through interactive explanation.
