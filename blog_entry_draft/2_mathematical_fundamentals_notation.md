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