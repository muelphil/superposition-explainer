
## 2-2 Autoencoder example
* Lets put this to the test in theory, when encoding only 2 features (with an embedding dim of 2), this would allow the autoencoder to encode features without any loss, by using an orthonormal basis

Try it out!
* input dimension and vector dimension 2
* run training
* observe min vector angle and vector length

As you can see, the 2 features are represented by 2 normalized, orthogonal vectors -- the loss is constant 0. This would also be possible by one-hot-encoding the features, representing the features with the standard orthonormal basis that aligns with the axes of the coordinate system -- very intuitive


## Embedding 4 features using 2 dimensions -- fail
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
    * with a sparcity s, each vector has a chance of s to be sampled from the half-normal distribution, otherwise it is 0 (mathematical definition/ formula!)
* let's try it again and see how this affects the outcome
1. resample a few times using the resample button on the left -- then, decrease the sparsity to 0.2 and resample again, observing the effect of the sparsity parameter
2. run training with sparsity=0.2 -> all 4 vectors are represented
2. Now, activate different inputs individually and observe the reconstruction error
3. Set all features to 0; then, using the slider, increase the input for 2 features that are pointing in opposite directions to 1.0 and observe what happens in the embedding view. What do you notice? What happens regarding the weighted loss, when these two features are activated at the same time?

TODO: maybe allow user to correlate 2 features directly, train again, see how it changes

Great! This doubled the amount of features we can encode as long as there is high sparsity of features -- but doubling is not good enough.

## Embedding even more features

So the big question is: how do llms seemingly encode more features than embedding dimensions into latent space?

Lets use an experimental approach and try to explain the behaviour after having observed it.
1. create yet one more input neuron -- totaling 5 features to be encoded in 2 latent embedding dimensions
2. using a sparsity of s=0.15, train the model
3. what do you perceive? Check out the statistics regarding the min angle -- compare this to splitting the full 360deg into 5


## Superposition

The behaviour you just observed is called "Superposition", meaning that dimension pattern can simultaneously encode multiple overlapping features/concepts, rather than each concept having its own clean, separate direction.




Two important concepts make this possible:
* RELU activation function




## It's exponential
* we now visualized the emergence of superposition for an embedding dimension size of 2
* we saw how the model was fitting 5 vectors into a 2d space, by not placing the vectors so that their minimum angle to one another was lower than 90 degrees, causing some interference
* now the question is: how does this behave in higher dimension?
* the exiting answer is: It scales exponentially!

![](./plots/vectors_vs_angle_lin_y.png)

* reference to https://spherical-codes.org/ + explanation of the plot
    * mention there is no closed form to determine this
* as you can see, while in 3d and with a threshold angle of \alpha = 63deg we can fit 10 vectors (~3.3x the dimension), by tripling the dimensions to 15D, we can fit 1000 vectors (~66x the dimension)
* [How might LLMs store facts | Deep Learning Chapter 7](https://youtu.be/9-Jl0dxWQs8?si=1JIOc0Yfg0T_H5iJ&t=1025)
    * In this video, 3B1B shows via experimentation, that it is possible to fit 10.000 vectors into a space of dimension of only 100D, while all vectors maintain an angle between 89 and 90 degrees to one another (almost orthogonal to one another!)
* John-Lindenstrauss Lemma