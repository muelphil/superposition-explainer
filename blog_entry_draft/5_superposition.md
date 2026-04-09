## Superposition

The behavior you just observed is called "Superposition", meaning that dimension pattern can simultaneously encode multiple overlapping features/concepts, rather than each concept having its own clean, separate direction. Here, we were able to show how the model was able to represent 5 features in just 2 dimensions.

You will notice that the 5 feature direction vectors representing the individual features in embedding space are all roughly of length 1 and bias across features is roughly the same. This is both due to

Assuming the bias is exactly the same across the features and the feature directions are all of length 1, we can neatly visualize why this bias was chosen. In the following plot, we assume only feature $f_1$ to be active, all $f_i$ to be normalized and bias to be same across all features.
// TODO: include plot of superposition with marked bias and interference for one feature

Here you can see that the bias is chosen to nearly cancel out the interference caused by projection of the other feature vectors onto $f_1$. The small feature vector still 

## It's exponential
While it might first appear trivial to go from 2 dimensions

* we now visualized the emergence of superposition for an embedding dimension size of 2
* we saw how the model was fitting 5 vectors into a 2d space, by not placing the vectors so that their minimum angle to one another was lower than 90 degrees, causing some interference -- reconstruction loss was non-zero but stayed fairly low
* now the question is: how does this behave in higher dimension?
* the exciting answer is: It scales exponentially!

![Maximum number of unit vectors that can be simultaneously placed in a d-dimensional space (d = 3 to 15) such that every pair subtends an angle of at least α degrees. The x-axis runs from 90° (left) to 63° (right); the y-axis uses a linear scale. At 90° each dimension d can hold exactly 2d vectors (the cross-polytope); as the angle threshold decreases the achievable count rises in discrete steps, with higher-dimensional spaces (yellow) accommodating substantially more vectors than lower-dimensional ones (green). This illustrates why superposition—representing more features than available dimensions—becomes increasingly viable as dimensionality grows. Data combines closed-form solutions for regular simplices and cross-polytopes with numerically optimal spherical codes from NA. Sloane’s tables (spherical-codes.org).](./plots/vectors_vs_angle_lin_y.png)

* reference to https://spherical-codes.org/ + explanation of the plot
    * mention there is no closed form to determine this
* as you can see, in 3d and with a min threshold angle of \alpha = 63deg between vectors we can fit 10 vectors (~3.3x the dimension)
* by tripling the dimensions to 15D, we can already fit 1000 vectors (~66x the dimension) with the same threshold angle between all of them
* [How might LLMs store facts | Deep Learning Chapter 7](https://youtu.be/9-Jl0dxWQs8?si=1JIOc0Yfg0T_H5iJ&t=1025)
    * In this video, 3B1B shows via experimentation, that it is possible to fit 10.000 vectors into a space of dimension of only 100D, while all vectors maintain an angle between 89 and 90 degrees to one another (almost orthogonal to one another!)
* John-Lindenstrauss Lemma
* This all ties into how topology behaves in high dimensions.