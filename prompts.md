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