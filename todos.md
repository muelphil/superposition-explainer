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

There is one more small bug to fix: sparsity is defined as how sparse the input is, but the autoencoder currently inverts it -> high sparsity s = high probability of sampling values. This is incorrect. High sparsity s should mean few active features (many zeros) — i.e. low feature representation per sample. Please fix this by inverting s and setting hardcoded default values to 1.0-s.

---

Here is a list of small bugs to fix:
* AutoencoderView.vue
  * the InputValue components should not use $f_i$ as labels, but $x_i$ for feature activations. They also should not change color on hover or use cursor:pointer, as they are no longer selectable.
* EmbeddingsLegend.vue
  * should not use $f_i$ as labels, but $w_i$ for feature direction vectors
* WeightsView.vue
  * b is incorrect, needs to be labeled b^T
  * the katex shown in this view is weird please review if it is correct -- it should look italic, but it all looks like its wrapped in \text{}
* Training Button (MainView/Autoencoder Visualization)
  * but these in a small wrapping component (maybe TrainingActionButtons)
  * The Start button needs several labels: "Start Training" (no prior training or reset was pressed), "Pause Training" (pauses training, user can modify stuff while paused, same functionality as Stop Training right now), "Continue Training" (Training was paused and was not reset)
* StatisticsView.vue (or maybe the service)
  * The statistics should not reset after the user pauses the training, only after they press reset
  * for every time the user paused the training, the training plot should show a vertical dashed line at the step the training was paused, when continuing

---

Let's improve the TaskListDisplay and TasksLists logic:
* The Insight block should always render, even before the user has completed the task. However, the goal is that the insight is "hidden", so the concrete text should have some spoiler overlay in the vain of reddit text spoilers -- the user can see the text bricks but they are overlayed. Hovering insights (div inside the insights blocks) should show an overlay stating that the task above needs to be finished to unlock the insights.
* Allow for small notes in the TaskListDisplay tasks that are displayed in smaller font in cursive underneath the task -- i.e. for "Run training until convergence" a note saying "Note: The experiment will automatically pause when convergence is reached. Convergent behavior may take some time to show up, consider resting the experiment if it takes long and rerunning it."
* The tasklist logic is not working properly. Currently, it is possible to fulfill tasks, without the prior tasks that they depend on being fulfilled. This should not be possible.


---


We will next need to prepare for porting the blog in the Autoencoder blog section.
Two things must be implemented for this to work. We will start with the first one:
* The AutoencoderViews settings (what options are available, how many neurons are used) must be definable by what paragraph is currently active. This should allow for setting Autoencoder config (amount of neurons) and settings visible/accessible in the training config (i.e. sparsity, importance, advanced options.) 
  * Review the current implementation and check what needs to be adjusted to make this possible.
  * After rewriting them implementation, as proof of concept:
    * for the first paragraph, set the dimensions of the autoencoder to 2 input neurons and 2 embedding space neurons (statically) and disable Sparsity and advanced options (set sparsity to 0.2, learning rate to 0.015, batch size to 64)
    * for the third paragraph, set the dimensions of the autoencoder to 2 embedding neurons and let the user select between 2-4 input neurons

Make sure this change implements a clean, easy to use high level api, so that it is easy to define per paragraph (best via ids) what they are changing in the implementation. Please be aware that we will also use this concept in the Bases Visualization section, where the visualization on the right will changed based on the currently active paragraph.

For this reason, first thoroughly assess the current structure and possible implementation options, to find the best clean high level option to define changes per paragraph in the visualization, and attach the autoencoder settings/config in the Autoencoder Section to it.

---

We will next need to implment the concept of a task list for this blog entry. Tasks lists should be displayed as sort of todo lists in the paragraph. There can be multiple tasks lists in different paragraphs, but max 1 task list per paragraph. If the paragraph containing a task list  is active, the task lists should monitor the visualization. If the user takes actions or the training reaches a point that satisfy the task, this should check the task.  

There needs to be a definable tasks for the autoencoder section, here is an example:

## List of tasks
- [ ] set input neurons to 4
  - (should check if user set input neurons to 4, or they are already at 4; if the user changes it back, it should return to unchecked)
- [ ] run training 
  - (should check when training converged and stop traininng. It is necessary to allow for custom assessment of whether training has converged, as it is different for different configurations. Here, it is considered converged if all vectors are roughly of length 1 and roughly 90deg to one another for 10 subsequent trained batches; this should not uncheck -- once the user completed this task, it stays checked)

Tasks need to allow for defining dependencies between tasks and optional tasks, and when they are resolved and dont unresolve anymore (i.e. after training converged, checkbox for training does not change anymore).
There should also be a definition of when the task list is resolved (i.e. user has solved all necessary tasks to pass the experiment).

Please again assess the current implementation and reason about how this should be implemented cleanly. My current guess (baseline) is that the implementation would be cleanest using:
* a class for tasks lists, where taskslist can be specified as a list of tasks, each with an id, dependencies and a task target (which dependencies need to be resolved for it to fully resolve)
* implementing emits for every action taken in the interactive visualization, i.e. in the Autoencoder view, that fires i.e. when configuration is changed or during training after every batch. The task list then listens to these events and updates based on them.

Review this approach and improve it where you see fit, so that it allows for clean and easy definition of task lists displayed in paragraphs.
Then implement it and put one task list in a fitting paragraph in the Autoencoder section. Underneath the task lists, there should be an "Insights" box, that only shows info text once the task list is fully resolved.

---

Please use vue3-katex to display latex inline/display mode. See BasesSection.vue for reference on how to do that.

Great! It's now time to port the blog entry draft to the website. Currently, the blog post lives in BlogPost.vue and child components.
The blog post is meant to feature interactive visualizations on the side for different parts of the blog entry.
Currently, these two sections are the
1. mathematical writedown on bases (2_mathematical_fundamentals.md), corresponding to the BasesSection.vue child component in BlogPost.vue. This is meant to show a visualization of the bases and the solution on the right side. The visualization is in BasesVisualization.vue and is currently underexplored -- its only a dummy which we will implement later.
2. autoencoder definition and experimentation (3_autoencoder_toy_model.md and 4_experiments.md), corresponding to AutoencoderSection.vue. The visualization in AutoencoderVisualization.vue shows the main experiment setup, which the user can interact with. The autoencoder architecture will first be revealed step by step (during 3_autoencoder_toy_model.md) and then used for experimentation in 4_experiments.md subsection. For the experimentation, I have already implemented the tasklists workflow that is to be used for the experiments -- defining tasks the user has to solve and (optionally) showing insights when the tasks are solved. These should directly be ported from the task lists defined in experiments.md. More may follow later.

Please check out the architecture/implementation of BlogPost.vue, child components, taskslists and active div.text-block s.
Use text-block wraps for active blocks that effect the visualization only where it is already absolutely clear from the text -- i.e. in the experimentation section. For all others, I will wrap them later and define the behaviour of the visualizations myself. Dont do this without me.

Plan the move, be precise and thorough, ask if anything is still unclear, then execute the port of the draft into the BlogPost.vue component and child components, without altering the text/ staying true to the draft. The only thing you should change is that the paragraphs written as bullet points for drafting can now just be paragraphs, no bullet point lists.



# Post Blog Entry Draft Port to the App

Great! Let's start fixing issues and bugs that came up during porting, starting with the AutoencoderSection.

## General issue with the current task list implementation
* The current task list implementation was not fully written with the variety of tasks in mind
* it currently uses vues reactivity system to assess task completion -- this works for some, but not for all
* I would highly encourage replacing the implementation that is dependent on the reactivity system in vue
  * instead, put a central event emitter in the AutoencoderVisualization component and inject it into the AutoencoderService too
  * it should fire on all relevant events (i.e. after a training step was completed, when a user navigated somewhere, etc, based on the current set of tasks)
  * the task lists task that are eligible to solve for the user (not waiting for other dependencies) should then subscribe to the eventemitter
  * if an event fires (i.e. training set complete) it also needs access to the AutoencoderService to check whether convergence conditions are met
  * this also requires a new AutoencoderVisualizationService, that holds which views are active, so that the task can check if a certain view is already active
  * this requires a careful, clean and precise rewrite
  * possible events are `sparsity-changed`, `importance-changed`, `user-navigation` (use the AutoencoderVisualizationService to check for where navigation is), `input-neuron-hovered` (needs to be emitted from AutoencoderView.vue, if an emitter is injected into it) 
* Weights/Training should reset when going to the next experiment
* Keep in mind that the implementation of the task list must be generic enough to also work for other sections if needed. Instantiation of task lists requires providing it the emitter (active items subscribe to them) and other objects (such as the services to check for fulfillment of tasks once in the beginning and then whenever certain events occur)

In the following, I will provide concrete problems per Experiment, that also highlight shortcomings with the current TaskList implementation. Use it as reference to plan a rewrite and update to the implementation, then implement the changes. Be strategic, plan this via todo list items. Ask if you have any questions.

## Experiment 1
* All 3 tasks after convergence are automatically solved, although the user did not do anything for it.
* The convergence condition is not correct -- it needs to be exactly 90deg between the vectors and both vectors being exactly 1 long
* "Check out the loss in the training statistics"
  * This should require the user to open up the "Statistics" View and specifically the "Loss" -- it requires implementing an even that is fired when the user opens that and checking in the beginning if it is already opened
* "Check the angle between the two feature direction vectors in the training statistics"
  * Similarly it requires the user to open the min angle statistic in the statistic view
* Check the vector lengths in the weight view
  * requires the user to navigate to the weights view
* only when all tasks after convergence are complete, is the full task complete

## Experiment 2
* "Set importance α = 0.8"
  * rename this to "lower importance alpha to maximally 0.8"
  * make sure it only is checked if the user is at max 0.8, not above
  * make the step 
* "Run training and wait for convergence"
  * the convergence condition is not correct, should be:
  * w_1 and w_2 having length > 0.97 and < 1.03 and having angle >89deg <91deg
  * w_3 and w_4 having length < 0.05
* "Hover over each input neuron to observe which features are represented in embedding space"
  * should only trigger when the user hovers the first input neuron -- this requires an extra event
* "For unrepresented features, check their learned bias — compare to μ = √(2/π) ≈ 0.798"
  * include "in the Weights View"
  * should only trigger when the user has navigated to the weights view
  * this is missing the reference to this being the mean of the half normal distribution. Please make this only a reference to the [mean of the half normal distribution](https://en.wikipedia.org/wiki/Half-normal_distribution) and include the link to wikipedia

## Interlude: Feature Sparsity
* "Resample a few times using the resample button and observe the input vectors" should only trigger when the user has clicked the resample button 3 times -- the task should track and display how many times the user has pressed it (i.e. 1/3)
* split "Decrease sparsity to S = 0.2 **in the training config**" and "resample — notice how most feature activations are now zero" into 2 tasks, the second resample task again requiring to sample 3 times

## Experiment 3
* "Set sparsity to S = 0.1 and run training" is incorrect, needs to be "S=0.9"
* "Observe the feature directions in the embedding view" is missing "Rerun the training -- Observe the ..."
* "Activate individual features one at a time using the input sliders and observe the reconstruction" needs events on inputvalue change via slider or via click on the number (see InputValue.vue)
* "Set all inputs to zero, then increase two features with opposite directions to 1.0 — observe the embedding and error" should only trigger when the inputs of opposite facing vectors are roughly 1.0 while the other feature activations are set to 0

## Experiment 4
* Check the minimum angle between feature directions **in the statistics view** — compare to 360°/5 (ditch 360/5)
  * should only fire when the user accesses the statistics view with specifically the min angle open

## Other
* Tasks should use katex for math rendering -- replace plain text tasks with html that has to be inserted via v-html




Issues:
* Convergence is broken for experiment 2
* "For unrepresented features, check their learned bias — compare to μ = √(2/π) ≈ 0.798" -- this is missing the reference to this being the mean of the half normal distribution
  * Tasks need to specify where to look, i.e. in the Weights View
* "Resample a few times using the resample button and observe the input vectors" is checked from the beginning (not good)
* "Decrease sparsity to S = 0.2 and resample — notice how most feature activations are now zero" is incorrect (increase to 0.8 would be correct) -- needs to wait for resampling
* "Set sparsity to S = 0.1 and run training" again, wrong!
* Experiments should reset inbetween
* Convergence missing for Experiment 4
* "This is qualitatively different from the previous experiment." needs to go underneath
* "A striking demonstration comes from 3Blue1Brown (How might LLMs store facts, Chapter 7): it is possible to place 10,000 vectors in just 100 dimensions while all pairwise angles remain between $89^\circ$ and $91^\circ$ — virtually orthogonal, despite outnumbering the dimensions by a factor of 100." is not well written....
  * while clinging onto the orthogonality constraint, in 100 dimensions you would only be able to represent 100 vectors, slightly softening the constraint to the vectors having 89 to 91 degrees to one another (nearly orthogonal, very low interference), he shows via experimentation that it is possible to fit 10.000 vectors in the same space. If this grows exponetnially, think about how much can be fit in 12.288 dimensional vectors.