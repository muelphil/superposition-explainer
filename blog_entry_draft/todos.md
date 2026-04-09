# TODO
* orthogonal != min angle of 90 degree to one another, but to each other, be clear about this in the post and dont use "orthogonal" lightly
* explain that we are only considering presence of features, sparsity allowing for negative vectors representing individual, but sparse features
    * full range (negative to positive makes sense for a subset of features, but not for all and not even for many
    * for many features, presence alone is important

* see https://chatgpt.com/c/69a9a9b6-796c-832c-a76c-f780c90a0b84
    * we should include W^TW better -- this does require early on explanation of why W^T though

* TODO: change of basis example/ visualization
    * see https://www.youtube.com/watch?v=P2LTAUO1TdA as supplementary material
    * > The transpose $W^T$ computes **all raw projections at once**.

optional: show effect of high correlation


Add:
4. Add one sentence explicitly linking to autoencoders

Right now the final transition is good, but I’d make the bridge slightly more concrete:

* In the toy autoencoder, the encoder uses $W$ to compress feature activations into embedding space, and the decoder uses $W^T$ to try to read them back out again. The sections above explain why this is such a natural choice in the idealized orthonormal case — and why it becomes imperfect once features must share directions.

* Consider one explicit numerical recovery example -- visualization on the right! (+ calculation)

So I strongly recommend adding one “future-looking” clarifier somewhere near the end:

* _In the full superposition setting, $W$ will no longer be square. The transpose is then no longer a true inverse. Instead, it becomes a natural “readout” operator inspired by the orthonormal-basis case — and the failure of exact orthogonality is exactly what creates interference between features._


### Current

* features / embeddings
* why embedding dimension matters
* compare possible features vs dimensions
* raise question
* introduce autoencoder
* formulaic description
* bases
* interactive experiment

### Recommended

* features / embeddings
* why embedding dimension matters
* compare possible features vs dimensions
* raise question of superposition
* **introduce toy autoencoder at high level only**
* **bases / geometry section**
* **then formal model equations + loss + sparsity + importance**
* interactive experiment