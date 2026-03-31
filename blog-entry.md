


* What are features
* What are embeddings/ their goal
* LLM are trained end to end
* we will look at a small toy model to gain an understanding of how embeddings might work in the big models
* this is based on anthropics "toy model" paper and provides an interactive playground to test this out yourself

* what are autoencoders
* a simple toy model autoencoder (+formulaic description) 
  * symmetric decoder W^T
  * explain that we are using synthetic data
  * explain feature importance (loss function)

* mathematical writedown on bases
  * representing 2 features using basis -> requires linear coordinate system to solve
  * using orthogonal basis: no interference between the directions, easy computation per projection, energy dissolved additively (Signalzerlegung)
  * using orthonormal basis: maximally decoupled, coefficients are dot products and easy to interpret, lengths are retained, most importantly: the basis matrix is orthogonal, so Q^{-1} = Q^T
  * TODO: 3 visualizations of the bases, and a short example of basis transformation
  * TODO: change of basis example/ visualization
    * see https://www.youtube.com/watch?v=P2LTAUO1TdA as supplementary material
* you have already seen the W^T to decode something that was previously encoded
* in theory, when encoding only 2 features (with an embedding dim of 2), this would allow the autoencoder to encode features without any loss, by using an orthonormal basis
  * try it out!

As you can see, the 2 features are represented by 2 normalized, orthogonal vectors -- the loss is 0. This would also be possible by one-hot-encoding the features, representing the features with the standard orthonormal basis that aligns with the axes of the coordinate system -- very intuitivie

But we have a problem: embedding dimensions are limited. Modern llms use up to TODO latent dimensions, but this is not nearly enough to fully capture all concepts -- there are more words in the english dicitonary than latent dimension.

* lets try it out: 4 features, 2 emb dimensions (full sparcity) run the simulation


So the big question is: how do llms seemingly encode more features than embedding dimensions into latent space?

Two important concepts make this possible:
* RELU activation function




























