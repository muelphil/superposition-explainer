


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
    * motivate this as basically projecting the input onto the bases, measuring the length of the projection
  * TODO: 3 visualizations of the bases, and a short example of basis transformation
  * TODO: change of basis example/ visualization
    * see https://www.youtube.com/watch?v=P2LTAUO1TdA as supplementary material
* you have already seen the W^T to decode something that was previously encoded
* in theory, when encoding only 2 features (with an embedding dim of 2), this would allow the autoencoder to encode features without any loss, by using an orthonormal basis
  * try it out!

As you can see, the 2 features are represented by 2 normalized, orthogonal vectors -- the loss is 0. This would also be possible by one-hot-encoding the features, representing the features with the standard orthonormal basis that aligns with the axes of the coordinate system -- very intuitivie

But we have a problem: embedding dimensions are limited. Modern llms use up to TODO latent dimensions, but this is not nearly enough to fully capture all concepts -- there are more words in the english dicitonary than latent dimension.

* lets try it out: 4 features of varying importance, 2 emb dimensions (sparsity=1.0) run the simulation.
  * What do you notice?
  * What role does importance I of the vectors play? Check which features are embedded, and which ones are ignored
  * Check the bias used for the features that are unused in embedding space -- compare it to the [mean of  the half-normal distribution](https://en.wikipedia.org/wiki/Half-normal_distribution)

-> the 2 lesser important features will vanish and receive a bias of ~0.8, matching the mean of the half-normal distribution we are sampling from

## Sparsity
* features in the embeddings are highly sparse
* imagine all different sort of features: is sweet, is red, is car, is female, is Einstein, can jump, has e as second letter, ...
* many of these will not be represented in the embedding space at the same time; moreover, most of the features will be 0 most of the time -- this is called sparsity
* in the autoencoder we can model this by employing sparsity in our synthetic training data
  * with a sparcity s, each vector has a chance of s to be sampled from the half-normal distribution, otherwise it is 0
* let's try it again and see how this affects the outcome
1. run training with sparsity=0.2 -> all 4 vectors are represented
2. Now, activate different inputs individually and observe the reconstruction error
3. Set all features to 0; then, using the slider, increase the input for 2 features that are pointing in opposite directions to 1.0 and observe what happens in the embedding view. What do you notice? What happens regarding the weighted loss, when these two features are activated at the same time?

TODO: maybe correlate 2 features directly, train again, see how it changes

Great! This doubled the amount of features we can encode as long as there is high sparsity of features -- but doubling is not good enough.



So the big question is: how do llms seemingly encode more features than embedding dimensions into latent space?

Lets use an experimental approach and try to explain the bahaviour after having observed it.
1. create yet one more input neuron -- totaling 5 features to be encoded in 2 latent embedding dimensions
2. using a sparsity of s=0.15, train the model
3. what do you perceive? Check out the statistics regarding the min angle -- compare this to splitting the full 360deg into 5


## Superposition

The behaviour you just observed is called "Superposition". 


Two important concepts make this possible:
* RELU activation function























---

optional: show effect of high correlation




