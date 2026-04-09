# Experiments
## 2-2 Autoencoder example
* Lets put this to the test in theory, when encoding only 2 features (with an embedding dim of 2), this would allow the autoencoder to encode features without any loss, by using an orthonormal basis

Try it out!
- [ ] Run Training
- [ ] Check out the loss in the statistics view
- [ ] Check out the angle between the 2 feature vectors in the statistics view
- [ ] Check out the vector lengths in the weights view

> **_Insight:_**  The model uses an orthonormal basis of the 2D space to represent the features in embedding space, resulting in lossless embedding of the features. 


## Embedding 4 features using 2 dimensions -- fail
But we have a problem: embedding dimensions are limited and we have many more features.

Try it out:
- [ ] Increase embedding dimension to 4 and alpha (importance hyperparameter) to 0.8
- [ ] Run training
- [ ] What role does importance I of the vectors play? Hover the input neurons (descending by importance) to check which features are represented
- [ ] Check the bias used for the features that are unused in embedding space -- compare it to the [mean of  the half-normal distribution](https://en.wikipedia.org/wiki/Half-normal_distribution)

> **_Insight:_**: The model sacrifices representation of the two lesser important features to represent the other two losslessly. The model uses the bias of the lesser important features, that are not represented, to minimize their average reconstruction error, by statically setting their reconstruction to the mean of the sampled half-normal distribution.

## Sparsity
Introduction of the sparsity concept:
* features in the embeddings are highly sparse
* imagine all different sort of features: is sweet, is red, is car, is female, is Einstein, can jump, has e as second letter, ...
* many of these will not be represented in the embedding space at the same time; moreover, most of the features will be 0 most of the time -- this is called sparsity
* in the autoencoder we can model this by employing sparsity in our synthetic training data
    * with a sparsity s, each vector has a chance of s to be sampled from the half-normal distribution, otherwise it is 0
      * provide updated mathematical definition/ formula of the sampling here!
* let's try it again and see how this affects the outcome

- [ ] resample a few times using the resample button on the left -- then, decrease the sparsity to 0.2 and resample again, observing the effect of the sparsity parameter 
- [ ] Set sparsity to 0.8 and run training
- [ ] Now, activate different inputs individually and observe the reconstruction error
- [ ] Set all features to 0; then, using the slider, increase the input for 2 features that are pointing in opposite directions to 1.0 and observe what happens in the embedding view. What do you notice? What happens regarding the weighted loss, when these two features are activated at the same time?

> **_Insight:_**: TODO (feature representation in opposite directions cancel each other out when represented at the same time; due to sparsity, features that have high "anti"-correlation may be represented with the same direction but different sign; as they rarley appear at the same time (emulated here by sparsity), the loss their joint activation produces barley happens, allowing the model to represent all features)

(TODO: maybe allow user to correlate 2 features directly, train again, see how it changes)

Great! This doubled the amount of features we can encode as long as there is high sparsity of features -- but doubling is not good enough.

## Embedding even more features

So the big question is: how do llms seemingly encode even more features into latent space?

Lets use an experimental approach and try to explain the behavior after having observed it.
- [ ] create yet one more input neuron -- totaling 5 features to be embedded in 2 latent embedding dimensions
- [ ] set sparsity to s=0.85, importance alpha to \alpha=1.0, train the model
- [ ] Observe the pattern? Check out the statistics regarding the min angle -- compare this to splitting the full 360deg into 5


