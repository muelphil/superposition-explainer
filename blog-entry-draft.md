# Unfinished Patchy Incomplete Draft
## Embedding Vectors/ Latent Space
* What are features
* What are embeddings/ their goal: numeric vectors capturing semantic ...
* LLM are trained end to end

* highlight embedding space size (latent dimension) as a core parameter that determines model size
  * TODO figure out for GPT-3.5, what the relationship is -- i.e. quadratic? etc
  * maybe give the user a slider modifies embedding space size and visualizes resulting model size
  * important for both model size and computational efficiency

Trend: <https://chatgpt.com/c/69ce9603-14d8-8329-8cb8-cffee6eec5e3>
* 7–8B models are very often 3072–4096
* 13–20B often 5120–6144
* 70B often 8192
* 175B-class dense models often 12288
![Total parameter count of a GPT-style dense decoder transformer as a function of its embedding / model dimension d_model, for five prominent architecture families. Parameter count is approximated as P ≈ 12·L·d² + (V + n_ctx)·d, where L is the number of transformer layers, V the vocabulary size, and n_ctx the context length. The y-axis uses a logarithmic scale. Because P grows quadratically with d, even modest increases in embedding dimension incur a steep cost in parameters. Reference points mark the published widths of GPT-3 175B, LLaMA-2 70B, GPT-2 XL, LLaMA-2 7B / Mistral 7B, and BERT-Large.](./plots/model_size_depending_on_emb_dim.png)


-> put this into contrast:
* Oxford Dictionary lists approximately 171,476 english words in current use https://en.wikipedia.org/wiki/List_of_dictionaries_by_number_of_words (english only! Missing complex relationships)
* As of early 2026, there are over 7.14 million articles in the English Wikipedia.

* explain the idea of embeddings
    * TODO: maybe visualize this as one numerical vector in the center, and tons of different features around them -- consult neuronpedia.

![Visualization showing a numeric vector in the middle representing an embedding vector capturing semantics, surrounding by numerous possible features (i.e. is_person, has_petals, is_male, is_scientist, is_plural) captured surrounding the vector, connecting to the vector via lines, indicating the vector captures them](./plots/latent_space.png)

* TODO: Note that LLMs are trained end to end, and while researchers have identified certain individual features, we do not fully know what the language models learn/ what features are present in embedding space and how closely they align with human semantic conception of the world

## A simple Autoencoder
* we will look at a small toy model to gain an understanding of how embeddings might work in the big models
* this is based on anthropics "toy model" paper and provides an interactive playground to test this out yourself

* what are autoencoders and what is their goal
* a simple toy model autoencoder (+formulaic description) 
  * symmetric decoder W^T
  * explain that we are using synthetic data
  * define loss function
  * explain feature importance (loss function)



