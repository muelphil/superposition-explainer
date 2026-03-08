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



