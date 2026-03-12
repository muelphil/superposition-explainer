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



    * hover and selection for certain input features/ embedding features
    * hovering or selecting (clicking) certain input features or embedding features in the different views (autoencoder/embedding vectors/weights) should mark them selected in a new service, that gets injected into all the views
    * all views should be able to select/hover things (i.e. Embedding Vector view should be able to select a feature vector by clicking the vector and hovering one by hovering the vector)
    * for debugging purposes, the current hover and selection info should be shown as a small text at the very bottom of the main view
