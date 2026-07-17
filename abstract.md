# Title Suggestions

1. **Superposition Explainer: A Browser-Based Explorable for the Geometry of Embedding Spaces**
2. **Superposition Explainer: Visualizing Feature Overcompression Through Guided Experimentation** *(recommended)*
3. **Superposition Explainer: An Interactive Narrative on Sparse Representations in Underparameterized Autoencoders**
4. **Superposition Explainer: Real-Time Visualization of Feature Embeddings in Sparse Neural Networks**
5. **Superposition Explainer: A Guided Visual Study of how Neural Networks Encode More Features Than Dimensions**

---

# Superposition Explainer: Visualizing Feature Overcompression Through Guided Experimentation

Feature superposition, the phenomenon by which neural networks encode more features than latent dimensions, is a foundational concept in mechanistic interpretability. We present *Superposition Explainer*, an interactive, browser-based tool that teaches this concept through guided experimentation. Based on the "Toy Models of Superposition" paper by Anthropic (Elhage et al., 2022), our tool runs a live autoencoder model locally in the user's browser, empowering users to observe and interact with the model in real time as it learns to compress sparse data into a lower-dimensional embedding space.

Our tool helps users understand superposition by integrating a neural architecture overview with a dynamic 3D visualization of the embedding space. As the model trains, users can adjust parameters such as feature count, latent dimensions, and data sparsity, then observe how the learned feature vectors rearrange geometrically to minimize interference. A scroll-driven narrative guides learners through progressive experiments, from a simple baseline where each feature gets its own dimension, to increasingly compressed regimes where the emergent geometry of superposition becomes visible.

Unlike static tutorials, our explainer combines the accessibility of a blog-style format with the depth of an interactive laboratory. Task-based checkpoints ensure learners engage with the underlying mathematics rather than passively observing animations. The tool requires no installation or special hardware and runs entirely in the browser, broadening access to a concept that is otherwise difficult to grasp. Our open-sourced tool is available at https://philipmueller.dev/superposition-explainer/ (Fallback Mirror: TODO).