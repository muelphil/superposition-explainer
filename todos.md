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

We next need to work on the blog section of the website. I have written a blog draft in markdown but do not yet want to integrate it into the website, before the implementation basis is not yet set.

The blog post is special in that it will have 2 sections where on the right side of the blogpost there will need to be interactive visualizations. Our main goal is setting the basis for these interactive visualizations. Please modify src/components/BlogPost.vue for this, added more components in a blogpost subfolder.

The structure should be as following:
* Blog post header
* some paragraphs without visualization on the right
* "Mathematical Fundamentals" section: paragraphs with "Bases" visualization on the right
* some paragraphs without visualization on the right
* "Autoencoder" section: paragraphs with "AutoEncoder" visualization on the right
* some paragraphs without visualization on the right

The requirements are as follows:
* use css to make the paragraphs with and without the side nav the same size. Use e.g. css grid, in any case the most appropriate standard way to implement this
* modularize the 2 section of the blog post with the visualizations on the side ("Mathematical Fundamentals" and "Autoencoder") into separate components
* use paragraph tags in these sections. The scroll of the page should determine which paragraph is currently "active" (i.e. in the middle of the page). The visualization needs to respond to this.
* highlight the active paragraph for now with a very delicate light blue color
* "Bases" visualization: implement as custom component, using a global service for state management, which is a vertical stack of 1. a 2D coordinate system (for now use svg for this and show a simple dummy coordinate system) and 2. math in katex (for now simple show $x=1$).
  * As the user scrolls through the paragraphs of the section, x should be the index of the active paragraph in the section +1 (as dummy, we will create the actual interactive visualization later)
* "Autoencoder" visualization: display the autoencoder from the MainView in the side panel vertically stacked: AutoEncoder View, EmbeddingSpace View, Combined View.


---

Lets next focus on the Autoencoder visualization in the blog.
* First, implement a .compact class you can apply to the autoencoder view. This class should make margins and paddings in the autoencoder view more compact.
* Do not put a border on the AutoencoderView (currently done via .ae-viz-panel), only on the other two views., The autoencoder view does not need a border.
* Make the autoencoder vis on the right side min 512px wide, put the embedding view and the combined view (training, statistics, weights) next to each other (300px for embeddingView and ~200+px for combined view)
* Reflect this in the grid definition: vis in right column should be min 512px, but should be allowed to grow

---

After reviewing everything, I actually found that I do not like the way the blog width behaves. We unfortunatley will need to rework it.

Make the blog sections calc(1200px - 4rem) wide, consistent with the main.app-content.
For the blog sections that have visualizations on the right, make them calc(1400px - 4rem) wide.
To achieve this, width needs to be applied per blog section.
The outer blog should not use css grid. Only the 2 containing sections with visualizations on the side should use css grid.
The visualizations in the 2 sections with vis should both specify min and max width. The rest of the width should be used by the blog paragraphs on the left.





---

"Stop Training" should not clear statistics -- only put a vertical line in there.
