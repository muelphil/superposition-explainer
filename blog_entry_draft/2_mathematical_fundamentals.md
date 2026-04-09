## Geometric Foundations: Bases and Feature Representation

We want to understand how features are represented inside an embedding space — in particular, how they are embedded and how they can be recovered. This section develops the mathematical intuition that directly motivates the architecture of the toy autoencoder.

Consider $n$ features $f_1, \ldots, f_n$. A **feature vector** $x = (x_1, \ldots, x_n)^T$ lives in **feature space** $F = \mathbb{R}^n$, where each coordinate $x_i$ represents the activation strength of feature $f_i$. In feature space, features align with the standard coordinate axes, so reading off a feature activation is trivial: it is simply the corresponding coordinate.

The model maps $x$ into an **embedding space** $H = \mathbb{R}^m$, typically with fewer dimensions ($m < n$). Inside this space, each feature $f_i$ is represented by a learned **feature direction vector** $w_i \in \mathbb{R}^m$. These $n$ vectors form the columns of the **weight matrix** $W = [w_1 \;\; \cdots \;\; w_n] \in \mathbb{R}^{m \times n}$.

**Embedding with $W$** computes a linear combination of the feature direction vectors, weighted by the feature activations:
$$y = Wx = \sum_{i=1}^{n} x_i \, w_i$$ 

Each activation $x_i$ controls how much its direction $w_i$ contributes to the embedded representation $y \in \mathbb{R}^m$. This is the key geometric picture: the feature activations are the coefficients, and the feature direction vectors are the directions we combine.

**Recovery with $W^T$** reverses this process. To recover feature activations from $y$, we measure how aligned $y$ is with each feature direction by computing the dot product $w_i \cdot y$. The transpose $W^T$ computes all of these projections at once — the $i$-th entry of $W^T y$ is precisely $w_i \cdot y$:
$$W^T y = \begin{pmatrix} w_1 \cdot y \\ w_2 \cdot y \\ \vdots \\ w_n \cdot y \end{pmatrix}$$

Whether this actually recovers the true feature activations depends on the geometry of the feature direction vectors. Substituting $y = Wx$:
$$W^T y = W^T W \, x$$

The matrix $W^T W \in \mathbb{R}^{n \times n}$ is the **Gram matrix** of the feature directions. Its entries $(W^T W)_{ij} = w_i \cdot w_j$ are the pairwise dot products:
* The **diagonal entries** $w_i \cdot w_i = \|w_i\|^2$ are the squared lengths of the feature directions.
* The **off-diagonal entries** $w_i \cdot w_j$ ($i \neq j$) quantify the **cross-talk** between features: when nonzero, projecting onto one feature direction picks up contributions from others — this is **interference**.

If $W^T W = I$ (the identity matrix), then $W^T y = x$ exactly — perfect recovery with no interference and no scale distortion. The Gram matrix tells us precisely how far a given set of feature directions deviates from this ideal.

### The 2D example

To build this intuition concretely, we walk through three progressively structured choices of feature directions in a simple 2D example: two features $f_1$ and $f_2$, embedded into a 2-dimensional embedding space.
* Since the feature space $F$ and embedding space $H$ have the same dimensionality, we could represent the features in the embedding space identically by choosing $W$ as the identity mapping. In that case, the feature directions would directly align with the coordinate axes of the embedding space too, making both embedding and recovery trivial.
* However, a learned model does not begin with such a clean construction. It adjusts its weights through iterative optimization to reduce loss and may arrive at many different valid representations.
* Additionally, this ideal choice only works as long as we have at least as many embedding dimensions as features. Once we try to fit more features into fewer dimensions, the clean one-feature-per-axis picture breaks down.
* So let's study what happens when the feature directions are chosen arbitrarily, and then see why orthogonal and orthonormal directions are such a special case.

In the 2D-to-2D setup below, the two embedding vectors $w_1, w_2$ form a basis of the embedding space.  
Later, when we move to more features than embedding dimensions, the vectors $w_i$ are better understood as **feature directions** rather than a basis in the strict linear-algebra sense.

### Arbitrary Basis
* let us choose two arbitrary embedding vectors:
  $$w_1 = (1,2)^T,\quad w_2 = (2,1)^T$$
* these vectors are linearly independent, which is essential: if one were just a scalar multiple of the other, they would only span a line instead of the full 2D space
* in that case, different feature combinations could map to the same embedding, making exact recovery impossible
* In this square 2D example, these two vectors form a basis of the embedding space: any point in the 2D embedding space can be written as a linear combination of them
* embedding remains straightforward: we simply use the feature activations as coefficients of the embedding vectors
  $$y = Wx = x_1 w_1 + x_2 w_2$$
* with our chosen feature directions $w_i$, this becomes
  $$W = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}, \qquad x = \begin{bmatrix} x_1 \\ x_2 \end{bmatrix}, \qquad y = Wx$$
* what is more interesting is the reverse direction: given the embedded vector $y$, how do we recover the original feature activations $x_1$ and $x_2$?
* A natural first guess is to recover the feature activations by "projecting back" onto each feature direction separately, i.e. by taking dot products with the same vectors $w_i$. In matrix form, this is exactly what $W^T$ does — it computes all raw projections at once.

* Mathematically, expanding a single dot product:
  $$y = x_1 w_1 + x_2 w_2$$ (Embedding)

* then trying to recover $x_1$ via the dot product with $w_1$:
  $$w_1 \cdot y = x_1 (w_1 \cdot w_1) + x_2 (w_2 \cdot w_1) = x_1 \|w_1\|^2 + x_2 (w_2 \cdot w_1)$$

* However, as the feature vectors $w_1$ and $w_2$ are not orthogonal ($w_2 \cdot w_1 \neq 0$), the coordinates are coupled: reading out one feature by projection is contaminated by the other.
* The cross-term $x_2 (w_2 \cdot w_1)$ is the interference term: even though we are measuring along $w_1$, feature activation $x_2$ still contributes to the projection.
* Geometrically, if we move $y$ only in the direction of $w_1$, the raw projection onto $w_2$ changes as well. So even though feature activation $x_2$ has not changed, a naive projection-based readout would incorrectly suggest that it has.

* The Gram matrix $W^T W$ makes this interference structure explicit:
  $$W^T W = \begin{bmatrix} w_1 \cdot w_1 & w_1 \cdot w_2 \\ w_2 \cdot w_1 & w_2 \cdot w_2 \end{bmatrix} = \begin{bmatrix} 5 & 4 \\ 4 & 5 \end{bmatrix}$$
* The off-diagonal entries ($= 4$) are the source of the cross-talk. Because $W^T W \neq I$, recovery via $W^T$ alone does not return the true activations.

As a result, to recover the true feature activations, we would need to account for both basis vectors at once by solving the full linear system, or equivalently multiplying by $W^{-1}$ ($x=W^{-1}y$)

### Orthogonal Basis
* Let's fix this shortcoming by placing our feature direction vectors orthogonal to one another using $w_1=\begin{pmatrix}1\\2\end{pmatrix}, w_2=\begin{pmatrix}-1\\0.5\end{pmatrix}$
* These two vectors now form an orthogonal basis of the 2D embedding space.
* As basis vectors $w_i$ are orthogonal, their dot-product (by definition) becomes 0. Using this in the previous equation leaves us with:

$$y \cdot w_i =  x_i \|w_i\|^2$$

* and we can easily recover the individual feature activation values $x_i$ by dividing by the squared length of each basis vector:

$$x_i = \frac{y \cdot w_i}{\|w_i\|^2} $$

* In matrix form, $W^T$ again computes all projections at once. Since the feature directions are orthogonal, the Gram matrix $W^T W$ becomes diagonal — the off-diagonal cross-talk terms vanish:
  $$W^T W = \begin{bmatrix} \|w_1\|^2 & 0 \\ 0 & \|w_2\|^2 \end{bmatrix} = \begin{bmatrix} 5 & 0 \\ 0 & 1.25 \end{bmatrix}$$
* This gives us:
  $$W^T y = W^T W x = \begin{pmatrix} \|w_1\|^2 \, x_1 \\ \|w_2\|^2 \, x_2 \end{pmatrix}$$
* Projecting the embedding $y$ onto the embedding vectors $w_i$ no longer results in interference — the coordinates are fully decoupled.
* Orthogonality eliminates cross-talk: each coefficient can be recovered independently via projection. The only remaining artifact is a per-feature scale factor $\|w_i\|^2$.

### Orthonormal Basis
* We can simplify the situation even further by normalizing the orthogonal vectors so that
  $$\|w_1\| = \|w_2\| = 1$$
* this gives us an orthonormal basis: perpendicular directions with unit length.

This makes retrieving the embedded feature vector even easier, as the scale correction disappears entirely. The Gram matrix becomes the identity:
$$W^T W = I$$

$$W^T y = \begin{pmatrix} x_1\cdot 1^2  \\ x_2\cdot1^2  \end{pmatrix} = x$$

* With unit-length perpendicular axes, the dot product with each embedding vector directly gives us the corresponding feature activations in feature space — no coupling, no scale correction.
* In this square 2D example, an orthonormal basis makes the transpose equal to the inverse: $W^T = W^{-1}$
* this makes both embedding and recovery maximally simple: encode with $W$, decode with $W^T$

* This clean encode/decode symmetry is the geometric intuition behind why the toy autoencoder uses a weight matrix and its transpose: it mirrors the idealized behavior of an orthonormal basis.
* later, when we try to represent more features than there are orthogonal directions available, this symmetry remains — but exact orthonormality becomes impossible, and the model is forced into compromise geometries

![](./plots/basis_types.png)