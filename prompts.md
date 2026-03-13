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
* 
