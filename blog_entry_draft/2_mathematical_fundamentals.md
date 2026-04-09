## Mathematical Writedown on Bases
### Notation (for reference)
* $F = \mathbb{R}^n$ = feature space, where each coordinate axis corresponds to one interpretable feature
* $f_1, f_2, ..., f_n$ = conceptual/interpretable features, corresponding to the standard basis vectors of $F$
* $x = (x_1, ..., x_n)^T$ a vector in feature space, where $x_i$ is the activation strength of feature $f_i$
* $H =R^m$ = embedding space
* $w_1, ..., w_n$ = the embedding vectors / feature directions for the n features inside embedding space
* $W=[w_1 \cdots w_n]\in \mathbb{R}^{m\times n}$= matrix whose columns are the feature embedding vectors
* $y = (y_1, ..., y_m)^T\in H$ = embedded representation
* embedding:
* $$y=Wx=\sum_{i=1}^{n}w_ix_i$$

### Basic Idea
* Before diving into the autoencoder experiment, we will first review the geometric ideas needed to understand what the model is doing in embedding space.
* Our main question is not just how to embed features into a lower-dimensional space, but how to recover them again afterward. This becomes especially tricky once there are more features than embedding dimensions, because some amount of overlap becomes unavoidable.
* let’s start with the simplest possible case: two features $f_1$ and $f_2$, represented by a 2-dimensional feature vector with the feature activations $x=(x1,x2)^T$, embedded into a 2-dimensional embedding space
* In this toy setup, we model feature space as a coordinate system in R^n using the standard basis e_1, ..., e_n, where each basis $e_i$ cleanly corresponds directly to one feature $f_i$
* in this space, the coordinates themselves are already the feature activations x_i, so recovering the features is trivial: we simply read off the coordinates
* inside embedding space, each feature is represented by its own vector: $w_1$ for feature $f_1$, and $w_2$ for feature $f_2$
* to embed the feature vector $x=(x_1, x_2)^T$, we form a linear combination of the embedding-space feature vectors:
  $$y = x_1 w_1 + x_2 w_2 = Wx$$
* this is the key geometric picture to keep in mind: the feature activations become the coefficients, and the embedding vectors become the directions we combine
* in this 2D-to-2D example, the most intuitive choice would be to use the standard basis vectors of $\\mathbb{R}^2$ as the feature directions in embedding space as well. That would make embedding and recovery trivial.
* however, a learned model does not begin with such an intuitive geometric construction. It only adjusts its weights through iterative optimization to reduce loss, and may arrive at many different valid representations.
* Additionally, this ideal choice only works as long as we have at least as many embedding dimensions as features. Once we try to fit more features into fewer dimensions, this clean one-feature-per-axis picture breaks down — and that is exactly where superposition begins.
* So before looking at superposition, let’s take a step back and study what happens when the feature directions in embedding space are chosen arbitrarily. This will make it clearer why orthogonal and orthonormal directions are such a special case.

In the 2D-to-2D setup below, the two embedding vectors $w_1, w_2$ form a basis of the embedding space.  
Later, when we move to more features than embedding dimensions, the vectors $w_i$ are better understood as **feature directions** rather than a basis in the strict linear-algebra sense.

### Arbitrary Basis
* let us choose two arbitrary embedding vectors:
  $$w_1 = (1,2)^T,\quad w_2 = (2,1)^T$$
* these vectors are linearly independent, which is essential: if one were just a scalar multiple of the other, they would only span a line instead of the full 2D space
* in that case, different feature combinations could map to the same embedding, making exact recovery impossible
* In this square 2D example, these two vectors form a basis of the embedding space: any point in the 2D embedding space can be written as a linear combination of them
* embedding remains straightforward: we simply use the feature activations as coefficients of the embedding vectors
  $$y = x_1 w_1 + x_2 w_2 = Wx$$
* with our chosen feature directions $w_i$, this becomes
  $$W = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}, \qquad x = \begin{bmatrix} x_1 \\ x_2 \end{bmatrix}, \qquad y = Wx$$
* what is more interesting is the reverse direction: given the embedded vector $y$, how do we recover the original feature activations $x\_1$ and $x\_2$?
* A natural first guess is to recover the feature activations by “projecting back” onto each feature direction separately, i.e. by taking dot products with the same vectors $w_i$.

* Mathematically speaking, suppose
  $$y = x_1 w_1 + x_2 w_2$$ (Embedding)

* then trying to recover $x_1$ by using the raw projection onto $w_1$ (using the dot product with $w_1$) would result in:
  $$y \cdot w_1 = x_1 (w_1 \cdot w_1) + x_2 (w_2 \cdot w_1) = x_1 ||w_1||^2 + x_2 (w_2 \cdot w_1)$$

* However, as the feature vectors $w_1$ and $w_2$ are not orthogonal ($w_2 \cdot w_1 \neq 0$), the coordinates are coupled: reading out one feature by projection is contaminated by the other.
* The cross-term $x_2 (w_2 \cdot w_1)$ is the interference term: even though we are measuring along $w_1$, feature activation $x_2$ still contributes to the projection
* geometrically, if we move $y$ only in the direction of $w_1$, the raw projection onto $w_2$ changes as well
* So even though feature activation $x_2$ has not changed, a naive projection-based readout would incorrectly suggest that it has.
* As a result, to recover the true feature activations, we must account for both basis vectors at once by solving the full linear system (or equivalently by multiplying with $W^{-1}$)

In this toy example, recovering the true feature activations requires solving the full coupled linear system, or equivalently multiplying by $W^{-1}$:
$$
x=W^{-1}y
$$


### Orthogonal Basis
* Let's fix this shortcoming by placing our feature direction vectors orthogonal to one another using $w_1=\begin{pmatrix}1\\2\end{pmatrix}, w_2=\begin{pmatrix}-1\\0.5\end{pmatrix}$
* These two vectors now form an orthogonal basis of the 2D embedding space.
* As basis vectors $w_i$ are orthogonal, their dot-product (by definition) becomes 0. Using this in the previous equation leaves us with:

$$y \cdot w_i =  x_i ||w_i||^2$$

* and we can easily recover the individual feature activation values $x_i$ by dividing by the squared length of each basis vector:

$$x_i = \frac{y \cdot w_i}{||w_i||^2} $$

* In matrix form we can write the projections onto the feature directions $w_i$ as the multiplication with the matrix $W^T$:
  $$W^T y = \begin{pmatrix} x_1||w_1||^2  \\ x_2||w_2||^2  \end{pmatrix}$$ // TODO

$$W^T y = W^TWx = $$

As


* Projecting the embedding y onto the embedding vectors $w_i$ will no longer result in interference, coordinates are decoupled.
* Orthogonality eliminates cross-talk: each coefficient can be recovered independently via projection.

### Orthonormal Basis
* We can simplify the situation even further by normalizing the orthogonal vectors so that
  $$||w_1|| = ||w_2|| = 1$$
* this gives us an orthonormal basis: perpendicular directions with unit length.

This makes retrieving the embedded feature vector even easier, as the scale correction disappears entirely:
$$W^T y = \begin{pmatrix} x_1\cdot 1^2  \\ x_2\cdot1^2  \end{pmatrix} = x$$

* With unit-length perpendicular axes, the dot product with each embedding vector directly gives us the corresponding feature activations in feature space — no coupling, no scale correction.
* In this square 2D example, an orthonormal basis makes the transpose equal to the inverse: $W^T = W^{-1}$
* this makes both embedding and recovery maximally simple: encode with $W$, decode with $W^T$

* This clean encode/decode symmetry is the geometric intuition behind why the toy autoencoder uses a weight matrix and its transpose: it mirrors the idealized behavior of an orthonormal basis.
* later, when we try to represent more features than there are orthogonal directions available, this symmetry remains — but exact orthonormality becomes impossible, and the model is forced into compromise geometries

![](./plots/basis_types.png)