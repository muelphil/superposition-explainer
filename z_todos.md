# TODOs

* Rework of the selection/hover based visualizations in EmbeddingView, WeightView and AutoencoderView
  * TODO make explicit
* Plots need to be updated to use plotting library
* Blog post content revision
* TaskLists
  * Convergence conditions are not fully accurate
* Embedding Space Bias clipping needs to be integrated somehow...
* References
  * spherical-codes.org needs scientific reference
* Settings revise or removal
* span on the bottom of the frontpage hinting at the blog post beneath
* Logo
* tooltip fixes
* more text-blocks for the bases section showing more intermediate visualization?
* more context on the bottom of the bases visualization
* color caching for speed -- very likely necessary!
* selection/hover cleanup (i.e. selection border on neurons) + visualizations
* Optional:
  * Responsive Design
  * visualization for the intro section of the blog post
  * make 0.0 values light gray in the autoencoder
* read time


# 12.06.2026
* improve visuals of blog
  * font family
  * drastically reduce blog 1 col width
  * active blog post -- maybe use glowing background glass distortion effect?
* smaller vis for orthonormal/orthogonal section, more math underneath explaining
* instead of brightness transition/animation for encoder/decoder weights, use training animation with dots/dashes
* remove emdashes ("The three feature direction vectors...")
* checkbox UI
* resample button is not scale animating
* Make sentences less confusing
  *  Each coordinate of $x$ cleanly represents one disentangled feature, isolating the geometric compression problem from all other aspects of learning.
* remove task checkboxes inset 
* make Interlude: Feature Sparsity tasks more clear (they might be confusing to users, also because the task 1 is set to undone, eventhough the second was correctly done based on it)
* Experiment 3: Sparsity Changes the Game convergence pause is not set correctly -- experiment pauses when the vectors are still not orthogonal
* task font size is too small, make as big as the rest of the blog entry
* let convergence run much longer to make it also feel like convergence to users
* implement both log and normal diagram view for Minimum Pairwise ...

# 17.06.2026
* check that the tasks all work as intended
* convergence doesnt work.
* rewrite parts of the blog to align better with the vision -- requires rereading it all

* scroll appears to be damaged -- the left bar on the active ones doesnt work correctly.
* 27
* references clickable links
* hover input neurons showing importance is off on mobile :/

# Optional
* review math visualization (Gent Matrix)

# done
* remove hover on output neurons showing relu thingy
* disable scroll on embeddingview in the blogpost AE vis
* active paragraph visuals
* use blue for all plots in statistics view (uses different colors now but eliminated green)
* change font
* review hover/selection thing (remove selection entirely?)
* review opacity on other neurons when hovering one (its too heavy!)
* make text blocks clickable
* 