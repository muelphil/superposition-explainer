# Specification of the App

This Repository will implement a Web App for visualizing the superposition phenomenon in embeddings. To achieve this, the app will allow for defining and visualizing a tiny autoencoder with inputs, an encoder, the embeddings, a decoder and the outputs visualized.
Users will then be able to train the autoencoder in its specific configuration on synthetic data in browser and see how the embeddings emerge and how individual features are embedded.

## TechStack 
* HTML5
* Typescript
* Vue.js

## The Experiment
see EXPERIMENT.md

## The Views
The App is composed of different views, visualizing different things. The views must be captured by components, making it easy to rearrange them later based on responsiveness. Using a MainView component for the task of positioning, housing the other components is highly encouraged.

### Autoencoder
* visualizes the different neurons and layers of the tiny autoencoder
* allows the user to adjust the input and embedding dimension before training
* allows the user to visualize training and its effects

#### Autoencoder Visualization
* uses plain HTML5 for the elements of the neural network
* uses svg backdrop to visualize the connections between the neurons 
* Network is going left to right:
  * inputs: numeric values, with a normal distribution as background and a slider directly on the x-axis of said distribution. Make this a custom reusable input component.
  * input neurons: a vertical array of neurons, visualized as circular elements, that must vertically align with the elements of the input vectors. The importance of the neurons as defined in the EXPERIMENT.md file, should be visualized by making neurons with less than 1.0 importance slightly smaller, up to a defined minimum (maybe around 0.6 in scale) for close to 0.
  * embedding layer: again, neurons, but showing their numeric value inside them (different to input and output neurons)
  * output neurons: as many as there are input neurons
  * outputs: again, a vertical vector of numeric values
* Hint: For implementing this, use nested grids for things that are required to align, such as the numeric input values and the input neurons.
* For the input neurons and embedding layer neurons, there must be another faded neuron underneath with dotted border and a plus inside, allowing the user to add that neuron. Similarly, the last present neuron must have a small red circle with a - in it in the upper right corner, allowing removal of the neuron/ reduction of embedding dimension.
* The connections of the neurons must be implemented via the SVG backdrop, connecting the neurons. Higher absolute weights should be visualized with thicker connections. Negative weights should be blue, while positive ones should be orange.
* Neurons should be colored respective to their value: white for close to 0, fading to orange for positive and to blue for negative values. 
* Each of the parts of the autoencoder requires a heading at the top

### Embedding visualization
* visualize the embedding vectors used to embed the input data
* embedding dimension is restricted to have dimension 1, 2 or 3.
* uses Three.js for visualization of a coordinate system with x,y and z depending on the dimension (2D: only x and y, 1D: only x)
  * axes should be visualized but non-intrusive. The main value lies in visualizing the different embedding vectors and their relationship to one another
* allows for dynamically showing vectors in the coordinate system, where vectors may be assigned different colors
* allows for triggering highlighting of specific vector, making the others greyscale and 0.5 opacity
* the dimension of the visualization should be equal to the dimension of the embeddings: 3D embeddings -> use 3D coordinate system
* users should be able to rotate the coordinate system by dragging 

### Weight visualization
* responsible for showing the weights of the model
  * Weights W as a matrix
  * Bias b as a vertical vector
* it should use the same styling for matrix and vectors from Autoencoder Visualization inputs/ outputs
* when hovering the matrix, it should highlight the columns corresponding to the embedding vectors used to encode the input
  * highlighting means a colorful backdrop behind the column.

### Training Configuration
* allows for setting training parameters
* "start/ stop training" button to perform training
  * during training, changes to training configuration are disabled.
  * for each batch, the first input vector of the batch should be put into the autoencoder visualization 
  * the absolute difference of the predicted output and the ground truth should be shown right of the output vector in the autoencoder visualization

### Training View
* Shows statistics as graphs, one at a time, selectable
  * training loss
  * amount of embedding directions
  * average of the minimum angle per vector to any other vector 
* 





