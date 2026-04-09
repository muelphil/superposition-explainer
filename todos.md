# TODOs

* Hover and Selection System
    * it should trigger visualization in different components
        * No feature selected, but feature hovered:
            * Weights: highlight corresponding column or row in the weights matrix
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

TODOs 02.04.2026:

* interaction with weights: hovering weights directly not implemented/missing hover logic
* font families + central styling
* svg backdrop weight connections coloring
* neuron selection css
* BIG: Interference Visualization
* input/output neuron colors -- align with features (perhaps make this a setting?)
* rework Settings Modal visualization
* implement more statistics as necessary
* cursor: pointer on vector hover
* f1-f5 hover color change removal
* move weights panel to embedding space panel
* show bias amount on hover (i.e. importance)
* invert sparsity to be correct
*

---
I agree with the recommended rewrite -- only a high level introduction of toy autoencoder (based on Anthropic’s Toy Models of Superposition), then formal introduction later.
The writedown 2) is not bad, but it needs several adjustments:
* in general, it is too long and repeats itself several times, i.e. when stating what features could be.
* it should start by explaining what an embedding is and embed this into machine learning
  * otherwise "neuron" reference in features does not make sense
  * embeddings section should first vaguely state, that the embedding is supposed to capture various information about the text, without referencing features
* Introduce the concept of features only in "The apparent mismatch: far more possible features than dimensions", explaining what features are, that they might not align, that researchers has made efforts to uncover features (see Neuronpedia) and the apparent mismatch
* drop "Rough scaling intuition" section -- only state that it roughly contributes quadratically to model size
* drop "Concrete model-size intuition" section fully -- this will be shown in a plot
* keep the important information in the sections, but drop vague blog post esque questions, i.e. "One naive answer would be: “it cannot; it must simply forget most of them”"
* Do not introduce Superposition yet -- this will only be introduced later in the article, readers should explore and find this phenomenon themselves
  * do not use the word superposition
* the whole "Why use a toy model?" needs shortening: only introduce autoencoders on a high level
  * introduce autoencoders as models that learn to reconstruct their input
  * by using a smaller dimension in intermediate layers we can explore how machine learning models are capable of compressing a large amount of features in a much lower dimension. 
* Replace the "Before the experiment: the geometric prerequisite" section with the rough target of laying out the mathematical fundamentals that motivate the architecture of the toy model autoencoder
* do no introduce autoencoders on a formal level yet.
* do not reference orothagonal/orthonormal bases yet -- all of this is to be explored in 2_mathematical_fundamentals.

In general, keep the important, educational beneficial information, remove duplication, drop sections as stated above, using clear, educational, scientific, concise, precise language.



* embeddings
* why embedding dimension matters
* what are features + compare possible features vs dimensions  mismatch
* raise question of how models can capture features despite mismatch
* introduce toy autoencoder at high level only
* bases / geometry section
* then formal model equations + loss + sparsity + importance of autoencoders
* interactive experiment



---

"Stop Training" should not clear statistics -- only put a vertical line in there.