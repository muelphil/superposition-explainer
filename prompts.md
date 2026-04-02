This is okay but is lacking in several regards. The autoencoder visualization currently looks like a draft and not like a highly polished finished project.
The following issues are immediately apparent:
* The input values are not aligned with the input neurons. Input values, input neurons, output neurons and output values all need to be aligned. It would be best using a CSS grid for this
* The Embedding neurons need to be vertically centered. When using css grid this must somehow be achived useing multicell column for the embedding neurons, then using a grid for this that works differently
* The input value and output value texts need to use the same styling, they are currently differen size and font-weight
* The input values need to be displayed centered above the slider, the normal distribution functioning as a backdrop.
* Make the + and - signs less intrusive, using more muted colors and a pastell background colors for the buttons. 
* The neurons are not apparent enough, they have way too low contrast border, makign them invisible when they have white background color due to values close to 0
* initialize the inputs by sampling them randomly from a normal distribution in the service
* use light blue color for normal distribution area under the curve fill in the background of the input values.
* make the input and output values use 1rem
* display error under output values centered and conditionally on whether it is not 0
* drop the background border and color for the autoencoder component, it should be directly rendered on the background, no extra background or card styling, as opposed to the other components.

Looks better, but still a lot of issues:
* The input numerical value must appear **over** the slider on top of the normal distribution as a backdrop. There should not be a vertical blue line from the slider emerging -- this is unnecessary.
* The SVG connections dont fully connect anymore
* The network needs more spacing between the neuron columns, allowing more spacing 
* scrap the "Δ" symbol
* the embedding neurons should be spaced across their column using space-around instead of just a gap, spreading them out.

Slightly better. Now:
* .value-label: use bottom: 0px, no background color
* .dist-svg: hide the line of the graph, only use area under graph. Use linear gradient for area under graph, from light blue to white to orange
* similarly, color the slider background line with a gradient
* color the slider knob depending on the value, matching the neurons color
* .controls-row: make the buttons round and make them use light grey for both buttons, no greed/red color.


---

There currently appears to be a bug regarding the input dimension and embedding dimension. The + and - buttons are used to modify them. The buttons for the respective layer should only modify that layer. For embedding dimension, it can be 1-3, for input it can be 2-8. These limits should be clearly defined. Currently, the buttons effect multiple layers, which is incorrect. Please fix.

---

Can you review the training implementation to be correct? This should be cleanly implemented via gradient descent. Right now, with sparcity 1.0, importance 1.0, input dim 3 and embedding dim 3, the loss is not dropping to 0 (although it should, as the embedding dimension is equal to input dimension).

---

Changing Training parameters or layer dimensions should reset the training. Also, a total weighted loss should be displayed in the output column at the very bottom in the autoencoder. The min angle should only be computed for features that are present, features that are not present should be ignored.

---

Next, please implement the embedding space view using Three.js. It should have a mathematical look and feel. Hovering a vector should grey out the others. Make each vector have a different color. Three.js coordinate system should use transparent background color.

### Embedding visualization
* visualize the embedding vectors used to embed the input data
* embedding dimension is restricted to have dimension 1, 2 or 3.
* uses Three.js for visualization of a coordinate system with x,y and z depending on the dimension (2D: only x and y, 1D: only x)
    * axes should be visualized but non-intrusive. The main value lies in visualizing the different embedding vectors and their relationship to one another
* allows for dynamically showing vectors in the coordinate system, where vectors may be assigned different colors
* allows for triggering highlighting of specific vector, making the others greyscale and 0.5 opacity
* the dimension of the visualization should be equal to the dimension of the embeddings: 3D embeddings -> use 3D coordinate system
* centered on the coordinate system center
* users should be able to rotate the coordinate system by dragging and zooming using scroll wheel, though restricted to a maximum zoom out and in

---
Now, implement the Weight visualization that should be a matrix (Weights W) and the bias vector (if applicable). The matrix again should be shown in a mathematical way. Columns and rows should be annotated with input and embedding dimension including feature vector, embedding vector etc. It is
important that the user can hover the columns, rows and individual cells of the matrix to highlight them. For now, cells may use the same background color highlighting in orange and blue as the connections in the autoencoder visualization. Make it look mathematical, use vector brackets (square
brakets).

---

We next need to implement a Hover and Selection System. This should be implemented as a separate service that is injected in all of the main visualization components (Autoencoder View, Embedding Space View, Weights View). In the view, hovering or selecting certain things should update the reactive selection and hover objects stored in the service. The View components should then react to it and highlight the thing joinly in all Views. Also include which view was origin of the hover/ selection.
We will implement the highlighting for each of the View components later. For now, we only need to implement:
* the service with the reactive refs for selection and hover to the SelectionTarget. The different things that should be selectable and hoverable for now are:
  * feature (think input/ input layer neuron) -- selected when clicking on the neuron
    * by hovering/clicking the associated input neuron in Autoencoder, the column in Weights view or the feature vector in embedding space view 
  * embedding (embedding neurons)
    * by hovering/ clicking the axes in Embedding View, the rows in weights matrix or the neurons in the embedding layer in the Autoencoder
  * output (think output layer neuron/ outputs)
    * by hovering/ clicking the output neurons
  * weight (singular weight, think weight connection in the autoencoder)
    * by hovering/ clicking the individual weights in the svg backdrop of the autoencoder or the weigth cells in W in the weights view

For debugging purposes, the current hover and selection info should be shown as a small bar with small height at the very bottom of the view height as sticky/ absolute positioned. This may make it necessary to import the service in a higher up component like MainView or even App for now. The info should include a small deselect button for now. 
Do only implement the highlighting/ selection logic via clicks and hovers right now, to not yet apply any visual styling indicating hovering or selection to the elements yet. We will apply these per component later on, as this takes great care of getting it right visually.
You may use incorrect/incomplete SelectionService.ts to correct it with the correct possible things that are selectable as basis, adjusting it to match the above description.

---


Great. Let's start reworking the Embedding Space View:
* replace the feature colors with a color gradient green to yellow, with green being the feature used for the most important/ first feature. Use src/utils/featureColor.ts. However, adjust the file so it also exports a function that will return a css color from the gradient for the feature, taking parameters `idx` and `amount_features` and returning a color-mix css color that mixes the yellow and green appropriatley. The beginning of the file should have 2 arrays of rgb values for green/yellow, then one variable each for the css rgb colors thereof, then used in the function color mix template.
* replace x, y, z with h_1, h_2 and h_3 for the axes where appropriate
* make sure that the font is looking crisp, the x,y,z labels look pixelated right now. Make axis labels use black font color.
* for the axes, put the arrow head, the axis line and the axes label closer to the center, maybe at 1.3 of the individual axes -- make this value configurable in the code. also put arrowheads on the end of the axes (in the other direction).

---

This is good, but:
* place the h_1, h_2, h_3 labels next to the axes arrows, not on top of them
* increase the initial zoom in three.js so that it automatically perfectly fits the coordinate system
* make the feature arrows slightly thicker -- make this change surgically, dont implement tons of new code or functions for this. Only extract the arrow head min/max values into constant variables that I can adjust and make them slightly higher.
* make sure that the color mix color space is correct in featureColor -- currently the three js and the css colors are not looking the same. The three js colors are the correct ones, the color mix css colors are wrong.

---

We last made great adjustments to the EmbeddingView.vue component, which uses Three.js to interactively show the Embedding Space Feature Vectors.
We will need to further advance it, but my concern is that the file is already very big (580 lines of code) and this is not modular/ easily adjustable.
Please review the EmbeddingView.vue component and think of ways on how to make this more modular, e.g. by creating a subfolder embeddingView and putting the component in there, then putting the constants into constants.ts, the styling into style.css, etc.
Also review if the code can generally by made easier; for example by reusing vectors and only changing their length/ direction, etc. Assume the role of an expert Three.js and Vue.js developer who cares about modularity and clean code and review the code on how to adjust it so that it is easily maintainable and adjustable. Create a plan on how to implement the changes.

---


Lets next update the MainView layout for desktop.
Right now, it has 2 rows: .top-row and .secondary-row. This is too much information at once. I want to restructure it: 
* divide main view into left and right
  * left: AutoEncoder component, taking up 65% of the width
  * right: 2 stacked rows, taking up the other 35%
    * first row: Embedding Space View
    * second row: combined view with 3 tabs: Training (showing the configuration inputs), Statistics and Weights
    * at the bottom of the combined view, there should be the Start Training Button and the progress bar (no matter which tab is selected)

---

Lets next advance and improve the Autoencoder Component visualization and UX. Lets start by adjusting the weight visualization:
* Replace the weights, which are currently one filled line by dashed lines. While training is in progress, the dashes of the lines should appear to be moving forward, by animating the stroke-dashoffset
* The dashes need to cleanly be cut off at the neuron. They are currently starting/ stopping at the beginning/end of neurons (left or right side of neurons), but they should be going in an being cut off from the circle using clipPath/mask
* make the spread of the lines going into the neurons dependent on the neurons size
* scale the neurons size so that the area is scaling linearly with the importance of the neuron
* make the .dist-svg svgs width be dependent on the container. Currently, when decreasing .input-value width, the slider and svg backdrop do not correctly scale with it
* make the sliders/ backdrop normal distribution colors use the individual feature colors instead of orange (see `src\utils\featureColors`)
* Place the +/- buttons  beneath Encoder/ Embedding with a neuron count label on top (so small label (i.e. "5 neurons", directly underneath the 2 small buttons +/-))
* Equally, put the total loss above the outputs, directly under the "Output" header

---

This is okay, but you ignored some constraints and we need to make some adjustments:
* put the neuron +/- input directly under the Encoder/Embedding header
* Make the weights only dashed during traing, remove the dashes by disabling `stroke-dasharray` when not training
* put a small button with a reload under the input that will sample new input values
* when clicking the input features number, when it is non 0, make it 0, when it is 0, sample from the distribution for a value, basically making it a toggle between on and off.
* put a small label above the total loss "weighted loss"
* directly under the decoder header put Bias/RELU
* This way, under each header of the autoencoder architecture there is something for info or configuration

---

* dont show progress bar
* remove steps concept, just put reset and start/stop training next to each other
* reset training statistics when the weights reset
* reset weights button in training configuration

* RELU+ bias


---

Let's integrate latex rendering. Preferably use KaTeX to render latex. The latex should be rendered in 3 places:
* in the EmbeddingLegend showing the different features f_1, ..., f_n
* In the EmbeddingView specifically in the Three.js render of the coordinate system replacing the h_1, h_2, h_3 AXIS_LABELS -- this requires rendering as svg within Three.js and will require extra care
* In the Autoencoder in the InputValue components left of the .value-label span, render the feature as f_1, f_2, ... for every input


---

I would like you to adjust the Headers so that they are technically correct.
Regarding the bias/RELU representation I would like you to implement the following approach:
* show the bias/ RELU as 2 small vertically stacked elements left of the individual output neurons
* they should have the same height for all neurons, independent of the scale applied to the output neuron due to the learning rate
* the 2 small icons should have a light slightly rounded border and a small gap between them
* the bias icon should contain a KaTeX rendered b and have a background color equal to the color seen in the WeightsView for the biases
* the Relu icon should contain a small svg representation of a relu graph/function. The svg should in the best of cases be a separate svg file that I can adjust to my liking later on.
* If the RELU function is did not change the output (input non-negative), the relu icon should have an opacity of 0.5, otherwise 1.0

---

This is good but needs 2 adjustments:
* Make the icons width: 19px; height: 19px; instead of 26px
* I reviewed it and the opacity makes it hard to read. Both icons should be fully opaque. When relu is changing the output (non-negative input into relu) the left side of the grap of the relu icon should change colors from the dark grey to blue representing negative values. This may be achieved via css classes and adjustment of the css icon 

---

I dislike that how the icons are currently included is messing up the grid symmetry. The width of the column with the gap icons should be of the same width as the icons itself (19px). Keeping the gap-act column for later reintroduction, it should be set to 0 width. There should be a gap introduced
right of the input neurons that is of the same width as act-icons + gap-act (may be hard coded if necessary), so that it is symmetric again

---

Lets move on to the EmbeddingView. Lets start with small adjustments.
* Please readjust the default 3D coordinate system camera view so that the angles between all three axis in the render is identical and the length of the axis appears identical (camera needs to be at the same distance from all 3 axis arrows)
* Please adjust it so that the view is only turnable in 3D, not in 2D or 1D

---

We next need to implement the reactive focusing and highlighting logic for the view components, that provide visual cues when certain things are hovered/ selected.
I would like to start with the AutoencoderView.
When certain things are hovered or selected, it should mainly affect the neurons and weights.
When a feature/embedding/output is hovered, this needs to make all other neurons that are not associated with that feature semi-transparent. Neurons and weights should be rendered in lower opacity for these.
For a feature, the neurons that should not be made semi-transparent it's the associated input and reconstructed output neuron and all embedding neurons as well as all weights that are between these neurons.
Likewise for the hovered outputs.
For the embedding neurons, highlight the embedding neurons and all input/output neurons that are connected to this embedding neuron.
A selected feature/emb/output should be visualized by having a different border or outline around the neuron. It should clearly indicate the neuron is selected, without totally rearranging the view.

---

This is not bad, but there are some minor issues:
* selection has precedence over hover. When something is already selected, don't simply apply hover logic.
* Where obvious, add special logic for when something is selected and something else is hovered additionally; e.g. if a input/feature is selected and a embedding neuron is hovered, additionally make all other embeddings transparent so that only the input neuron, the selected embedding neuron and the associated output neuron are highlighted including their connecting weights.
  * This will be a reoccurring general pattern, that there needs to be complex combinations of selection & hover and different visualizations will need to be shown for combinations of these. I suppose it would be good to define a standard approach for this, perhaps via Vues reactive API with computed combining things. However, one needs to be careful to not make it too complicated. Make it clean, legible, functioning and efficient. 

---

Can you now look into the WeightView Component? Please hook it up to the selection/hover logic. First think about what should be highlighted when -- feature hover should also highlight the associated bias, but bias hover should only highlight the bias.
When you seasoned about what needs to highlight when what is selected, please hook it up to the selection/hover logic.

---


We next need to tackle the visualization of different hovered and selected properties in the EmbeddingView. This is the most concerning part, as the Three.js visualization of the coordinate system is already complex. For visualization of the different hovered/selected properties, this would add a lot of logic to the code, that we already had to split into the several files in /src/components/embeddingView/.
Additional objects may include: 
* Interference: red dotted line
* relu: surface/ area
* bias blue/orange offset of the relu
* grey dotted line parallel to embedding space vectors during input hover/modification
* orange/blue line along the axes, plus dotted grey line tracing it to the vectors

It would be very important to be able to abstract the low level logic away and also attach the visualization of different objects to reactive properties provided by the AutoencoderService, to make it reactive. Hovering/selection may introduce these objects, during hovering they need to reactively update to changes in weights/ inputs. Before implementing any of these, can you please review the embedding space view component and scripts and assess how well modularized and abstracted everything is? We need to prepare for implementing a lot of hover/selection based visualization. Review, improve where obvious, build a plan where not obvious, so we can discuss and implement it afterwards.


---

Lets shift attention to the EmbeddingView, which is a Three js visualization of the features in embedding space.
Lets start by implementing the first "overlay". Remember, the goal is to show visual indicators when certain elements of the application are hovered or selected in the EmbeddingViews Three js visualization. We have previously modularized and cleaned up the embedding view directory to implement new visual indicators cleanly. In the best of cases, there should be one function that is responsible for deciding what visual indicators to show and what not to show and then only calls function to use the indicators. Please read the src/components/embeddingView/overlays/README.md for more info.

Lets start by implementing the first overlay. When the user hovers an input, please show a dashed, light grey line that runs parallel to the embedding space vector that the input represents (simply take it from weights), but the line must not go though the coordinate origin, but through the inputs representation in vector space (currently visualized by a purple dot). What is important is that the dashed line does not obfuscate the inputs embedding representation (purple dot), nor the selected or other vectors.
Additionally, as already implemented, the other feature vectors in embedding space (that are not associated with the selected input) should be greyed out.

It must be clean, modular, precise. The introduced objects should update when the vectors or the view updates. When you are done, update the README.md in overlays, explaining where to find what (the logic that decides what overlay/visual indicators to show based on selection/hover) and a high level explanation of how it works.

---

This is not bad, however requires a small update:
The dashed line should not move with the input. Lets reformulate.
The dashed line should start where the input representation would be if the hovered features input was 0 and all other features were unchanged.
Display a small grey dot in that place. Start the dashed line there in the positive direction of the feature.
Remember, this should only happen when input is hovered, not when features (neurons) are hovered.
Make the dashed line a little bit thicker. The grey dashed line needs to extend so that it covers the visible screen, so make it long.

---

Lets continue with the visual cues displayed on hover/selection.
I would next like to test something out; we will likely remove the visualization later, this is about checking if the idea can be realized:
When hovering an embedding dimension, please not only highlight the embedding dimension in the embedding space visualization by making it darker, but also display a gradient in the background.
The gradient should go from blue (negative values) to white (0) to orange (positive values), the same way as the weights are visualized in the Autoencoder view.
The tricky part is that this needs to be shown as a background/backdrop and it must also work in 3D.
The likeliest solution might be using a big sphere, texturing it on the insight and using ray marching to determine the color of the individual pixels.
Think about how to implement this first, implement it in a separate new Overlay class that I can plug in or remove easily. This is mostly about checking if it is possible and how it looks, especially in 3D. 
Remember, it must be reactive to camera changes.


---

Lets continue with the visual cues displayed on hover/selection.
When a feature is selected and an embedding dimension is hovered (or the other way around), grey out the other features,
and show a projection of the feature vector onto the embedding axis, visualized through a continuous line on the axis and a dashed line from the vector arrow onto the axis.
The dashed line should be light grey. The continuous line should be --color-positive:        #fb923c; when postive and --color-negative:        #60a5fa; when negative.
The dashed line and continuous lines must be shown on top of the axes/ the other vectors, to be visible. 


---
copilot --resume=03109b87-4286-4c93-b597-d7089602eeb4



# Ideas
* make the input vector as a whole selectable/hoverable
* hovering embedding dimensions should highlight h_1/h_2/h_3 values, potentially also blend out vectors and put a gradient (blue -> white -> orange in the background)
* 


# TODOs
* remove training steps fully (instead define stop conditions or free runs until you stop)
* hovering features should also apply opacity to other inputvalue inputs
* correlate features and show how dimensions change when correlation is active
  * in theory, feature vectors that are correlated should be (more) orthogonal than ones that arent
* only show compass when view changed
* gradients in the background -- this will be very hard
  * rays?

Thats great! In the autoencoder view can you make it so that when the .value-label is clicked, it doesn't instantly toggle the feature on or off, but instead transitions the value from 0 to 1 (and from any other non 0
value to 0) over 1 second? If the user clicks again while the transition is still running, it should simply end the transition early, setting it to the target value. (i.e. 0->1, the user clicks again after 0.2 second
when the value is at 0.2 it stops the transition and sets the value to 1)



loss as interference -- W^TW entries

---

Let's next visualize the decoding. Importantly, hovering or selecting the output neurons should not visualize the same thing as the input neurons. If an output neuron is selected, this should not put a border around the input neuron. Make feature input selection disabled for now (but keep hover effect). In the next step we will visualize the output neurons in the embedding view, after you made sure that all these selectable/hoverable targets are not interchanged without me telling you explicitly.

----

Let's next visualize the decoding. When hovering/ selecting an output neuron, we need to visualize:
* the vector
* the Bias
* the RELU
* the interference

To do so:
* highlight the vector associated with the output neuron
* put the bias as a dot onto the vector, write b_n in latex beside it (similar to the h_1, h_2, h_3)
* put a line/surface orthogonal to the vector through the bias
* put a grey background color in the area that gets ignored by RELU and label this area
  * use the AxisGradientOverlay as potential reference for coloring the part that is ignored by RELU
* for vectors whose tip is outside the RELU area (vectors causing interference), put a red dotted line (cylinder) from the tip of those vectors onto the surface/line going through the bias. The red dotted line is representing the amount of interference caused.


---


This is great already but needs several small adjustments:
* when an output neuron is selected, please only half-grey out the vectors that are causing interference, so that the user can still see the which feature vectors cause interference
* also only apply half the full opacities to these input values/neurons/output neurons/loss in the autoencoder
* when hovering/selecting an output, shelve the current input and instead put as input the vector that has the input associated with the selected output neuron set to 1, all others to 0. restore user provided input afterwards. 
* make the red interference dashed cylinder thicker
* move the RELU = 0 label further out. maybe replace with "Masked by RELU" for clearer communication
* the bias dot should not have the same color as the vector, instead make it a dark grey. us existing colors, dont use new ones if possible
* hover should have priority over select. If an output neuron is hovered, it should show the bias/relu/interference info for that hovered neurons feature vector; currently, when a output neuron is selected and another one is hovered, it will always show the info for the selected one.

---

Better, but still not perfect.
* hovering the inputs should always make the associated vectors be shown in color; i.e. when an output neuron is selected, hovering over input neurons or the embedding legend features, this should make the hovered feature vectors show up in color, even when greyed out by the output neuron selection
* again, when hovering or selecting an output neuron, the features that are associated with vectors that are causing interference should not be fully greyed out -- the vectors causing interference should still be in color. The legend should also grey out the vectors that are not causing interference. 
* the bias dot needs to be rendered over the vector
* please review mathematically, if the bias needs to be multiplied or divided by the length of the associated feature vector. Explain your decision. My concern is that if the feature vector is not of length 1, multiplying with that vector is not a length retaining projection onto the vector.
* While the output neuron is selected, it should be possible to hover embedding space axes.

---

* please implement a quadratic matrix in the selection/hover service of booleans, where columns/rows are selection targets (output, feature, input, bias, relu, ...). The cells indicate whether when the first target in the dimension is selected, if the second can be hovered/ if hovering should have an effect. I.e. output-feature cell being true means that while an output is selected, a feature may be hovered for an effect; output-output being True means while one output is selected, another may be hovered to overwrite. This should make the logic in useOverlayManager easier and also useEmbeddingScene easier. 
* please use a surface for the relu area instead of the axis gradient approach -- it doesnt look good.
* please rotate the "Masked by RELU" text so that it is parallel to the surface line of this relu surface; if it is more upside down, rotate it around an additional 180 degree so that it is readable by the user.
* please put a lighter grey border around "Masked by RELU" text, so that it is always visible. Again, reuse colors.

---

* Please again review the bias and the interference visualization is correct. My iss


---

show feature vector and length when hovering the input feature or the embedding legend.


---

* in 2D this looks good enough, in 3D its rough
* please unrestrict the camera, currently in 3D its not fully unrestricted regarding movement
* please make sure in the EmbeddingView that hover events (on embedding axes and feature vectors) are only fired when the mouse is not down (i.e. when the user is not currently rotating)
* make sure (in the quadratic matrix) that when output is selected, embedding axes cannot be hovered
* find a fix for the problem that the surface separating the area where relus is masking due to negative output, and the area that is untouched is visually hard to separate in 3D, as it is just one continuous color. Maybe apply a special texture with a grid? Maybe restrict the user from going under the relu surface with the camera (this would require rotating upon hover/selection of output neurons onto the vector that is selected)?


---

better but still not good.
* the texture is confusing and hard to look at. Make it just a light grey surface again, that should have some higher opacity so that you see from which side you look at it. The "Masked by RELU" text should still be rendered on top, not obfuscated by the area.
* In 3d, can you instead make the relu surface just not a full endless surface, but a circular cutout of a surface with a radius of maybe 1.2, centered on the bias point?
* the constant focus on the vector in 3D is annoying and doesnt work well. It points the camera directly at the vector so you only see the top, which basically hides the vector. It also restricts movement incorrectly, I can still go under the relu surface in 3D.
* the "Masked by RELU" text was supposed to be parallel to the relu surface line. I.e. in 2d, it should be rotated so that it is always parallel to the line separating the relu mask area from the non relu mask area. 

---

* make it fade out more abruptly (gradient not so far spread) and use a lighter grey for the surface.
* review the positioning of the "masked by relu" label, specifically in 3d. The rotation code specifically is making the text rotate into the area. In 2D its working correctly.
* make the red dashed interference line continuous instead of dashed



---

I want to slowly move on from the visualization from now. The app contains a visualization, but the goal is that it also contains a writedown/ blog entry, similar to Transformer explainer under the explainer.
Please create a component with the blog entry. For now, it should only contain a title, a subtitle and 2 authors. For the contents, use Lorem ipsum (~8 min read blog entry).
Put the component underneath the main visualization.
Make sure that:
* the main view visualization is using 100vh, using padding top to make room for the header
* the header (containing the "Superposition Visualization" headline) should be sticky, same background-color as the background, using a fade to the bottom (last 5%) 
* the blog post underneath

---

I am aiming to next do a visual redesign of the app. This will require a lot of refactoring. Please go over the files and prepare everything for the refactor, by making sure that colors and font-families are generally using css variables defined on :root or in case of the embeddingView and its overlays colors that are defined in constants (overlays should not define their own colors, they need to be in constants). 

---

Here comes the hard part: The goal is that when the user scrolls down to the blog entry, the superposition visualization moves with the scroll, by:
* consensing the autoencoder view (using smaller margins)
* putting the autoencoder view and the embedding space view stacked as a side panel to the right side of the blog entry. They should take up space roughly 50/50 for now.

It would be cool if its possible to animate the autoencoder view and the embedding space view moving down in their new position as the user scrolls. At the top, they should still be present in the full vh visualization and only move into the side panel and condense when the user scrolls. Please review what html/css tricks are necessary and how to approach this/ if this is even doable. Let me test it out afterwards.