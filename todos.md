# TODOs
* hover and selection for certain input features/ embedding features
    * hovering or selecting (clicking) certain input features or embedding features in the different views (autoencoder/embedding vectors/weights) should mark them selected in the service
    * hovering and selecting should store both origin (which view triggered the hover/select) and what was hovered/selected (input feature, embedding vector, single cell, ... and which)
    * all views listen to the selection and hover and based on what is selected/hovered and the origin of the selection/hover, they highlight the information themselves
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
  * Connection need to fully go into the neurons, they currently stop before them, target needs to be their center line, not the left/right border.
  * The view needs to be smaller in general, more reminiscent of tools like the transformer playground or the CNN explainer or Transformer Explainer, to fit on the screen
    * make input normal distribution more narrow
  * headers might be incorrect: encoder/decoder should be above the connections, not the neurons
  * X Neurons over + and - buttons
  * replace Input header with "Features"
  * input features need to be annotated with f1-f...
* Training Configuration
  * Experiment presets
    * There should be several experiment presets that should be loadable via buttons in the training configuration view, setting all parameters including input and embedding dimensions
* Embedding Vectors View:
  * make vectors thinker, replace x y z with h1 h2 h3 (matching weights W dimension)
  * it should be zoomed in so that the view shows only slightly more than the area spanned by the orthonormal vectors of the dimension (1,2,3 depending on embedding dimension)
  * needs a view reset button
* color (orange/blue) might need to be replaced, as the core thing in this visualization is the features in embedding space
* Training Statistics
  * Interference Statistic: show the weighted amount of interference produced by the embedding space vectors (remember RELU maskes negative interference)
    * compute interference per vectors for every other vector, then set interference for negative values to 0, compute average per vector, then compute total average across all vectors
* Weights view
  * feature vector length should be provided as tooltip

Future:
* input vector should be shown as a vector in embedding space as a sum of embedding feature vectors
* Autoencoder View
* increase max features to 12?


# What I still need to figure out
* role of RELU
* role of bias

