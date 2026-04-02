# TODOs
* Hover and Selection System
    * it should trigger visualization in different components
        * No feature selected, but feature hovered:
            * Embedding Space Vector View: highlight vector, make other vectors greyscale, show relu regarding selected vector (hyperspace going through coordinate origin + bias value along the vector)
            * Weights: highlight corresponding column or row in the weights matrix
            * Autoencoder: highlight feature (input neuron), showcase effect on embedding (show values contributed to embedding space weights at the end of the connections going into the embedding neurons)
        * Feature selected, another feature hovered:
            * Embedding Space Vector View: highlight both vectors, project hovered vector on selected vector and show the result as inference -- red if positive inference, not masked by RELU, dark grey if negative inference, masked by RELU, put amount of inference and if masked as info, if close to 0 (<0.001) say no inference.
* Autoencoder View
    * Embeddings Space Neurons and Output Neurons require interactive visualization of their values being calculated
        * hovering them should show a tip tool element underneath that details the calculation and highlights relevant embedding space vectors
    * The view needs to be smaller in general, more reminiscent of tools like the transformer playground or the CNN explainer or Transformer Explainer, to fit on the screen
        * make input normal distribution more narrow, make it go from 0 to 2 only
* Training Configuration
    * Experiment presets
        * There should be several experiment presets that should be loadable via buttons in the training configuration view, setting all parameters including input and embedding dimensions
* color (orange/blue) might need to be replaced, as the core thing in this visualization is the features in embedding space
* Training Statistics
    * Interference Statistic: show the weighted amount of interference produced by the embedding space vectors (remember RELU masks negative interference)
        * compute interference per vectors for every other vector, then set interference for negative values to 0, compute average per vector, then compute total average across all vectors
* Weights view
    * feature vector length should be provided as tooltip

* maybe replace batch loss with "validation" data loss? (all combinations and their respective probabilities)
  * issue is that batch loss will have strong variation across batches
  * maybe not all, but so that 99% of cases are present

* improve visuals
  * can you instead of applying a border make it some outer glow?
* introduce compact mode?

* bias/RELU visualisierung

Future:
* input vector should be shown as a vector in embedding space as a sum of embedding feature vectors
* Autoencoder View
* increase max features to 12?

Linearkombination von Vektoren für Embeddings anzeigen

* add Embedding Vector View as Tab on Embedding Space visualization
  * show current embedding vector for input as linear combination of embedding vectors
* add gradient in the background of embedding vector to visualize what is classified and how much as that feature


# What I still need to figure out
* role of RELU
* role of bias


bug:


hovering weights directly not implemented/missing hover logic

e




---


https://fonts.google.com/specimen/Sora
