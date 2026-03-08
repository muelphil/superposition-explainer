# Superposition visualization

This project is about visualizing the superposition effect in embeddings in machine learning, based on an experiment. The experiment is detailed in EXPERIMENT.md.
A drafted simple app specification can be found in app-specification.md.
A analysis of another project called Transformer Explainer in the same educational visualization of machine learning space, detailing important implementation hints is located in transformer-explainer-analysis.md.

We now need to create the project. Contrary to the Transformer Explainer I want to use Vue.js for the implementation. I have initialized an empty Vite + Vue3 repository to achieve this.
Please make sure to put all css colors into variables at root level. Adhere to the same style defined in transformer-explainer-analysis.md.

I want to implement this app step by step. In the first implementation step, I want you to implement the basic app containing the Autoencoder visualization only.
The autoencoders value and training should all be defined in an extra Typescript service that gets injected into the component responsible for visualizing the Autoencoder. The AutoencoderView is responsible for visualization and user interaction only, not for setting training parameters, training itself, etc.

Please consult app-specification.md for a general idea on how to visually implement the autoencoder and what interactions it should allow.

Create the other components for the view, but populate them with just a grey background and a title that indicates when this component will hold later on.

Create MainView, AutoencoderView and the other views.






