# README.md

## Project Goal

Build a **single-page educational visualization app** (Vue.js) that introduces the **three types of bases in 2D**:

1. **Arbitrary basis**
2. **Orthogonal basis**
3. **Orthonormal basis**

The app should be structured like a **mini blog post / explorable explanation**, not like a sandbox or toy editor.

The goal is to visually and intuitively teach:

- what a basis is,
- how a vector can be represented in different coordinate systems,
- why **arbitrary (skewed) bases** require solving a **coupled linear system**,
- why **orthogonal bases** decouple the coordinate recovery problem,
- why **orthonormal bases** make coordinate recovery especially elegant via **dot products / projections**, motivating the use of **matrix transpose** in later sections of a larger blog post.

This is an **introductory section** that should stand on its own and be educationally strong, while serving as a conceptual bridge toward later discussions of **superposition** in LLM toy models.

---

## Constraints / Requirements

### Functional Requirements

- Build a **single-page app** inside the existing blank Vue.js project.
- Use **modular components** (do not place everything into one huge component).
- The app should feel like a **blog post with embedded interactive visualizations**, not like a dashboard.
- Interaction should be **limited, intentional, and educational**:
    - toggles / tabs / small step buttons / replay animation
    - no free dragging of vectors unless absolutely justified
    - no “infinite parameter space” sandbox
- The visualizations should be **2D coordinate system based**, showing the basis vectors as the axes of the coordinate system.
- Use **LaTeX rendering** for formulas (preferably KaTeX).
- Include **small animations** where they add clarity (e.g. projection lines appearing, decomposition arrows appearing, coefficient reveal).

### Educational Requirements

The visualization must clearly communicate:

#### Arbitrary basis
- The basis vectors are linearly independent but not orthogonal.
- A target vector can still be represented in that basis.
- However, **the coordinates are coupled**.
- A naive perpendicular projection onto a skewed axis is **not enough** to recover the coefficient.
- To recover coefficients, we need to solve a **linear system**:
    - visually and/or mathematically show:
        - `W c = x`
        - or an equivalent 2x2 linear system
- This should be presented as:
    - “coordinates interfere” / “coefficients are coupled”

#### Orthogonal basis
- The basis vectors are perpendicular, but not necessarily unit length.
- The key educational message:
    - **orthogonality removes cross-talk / interference between coordinates**
- Show that coefficients can now be recovered **independently**:
    - `c_i = (x · w_i) / ||w_i||²`
- Avoid framing this as “still solving a system, but slightly easier”
- Instead frame it as:
    - “each coefficient can be computed independently”
    - “projection isolates the coordinate, up to scale correction”

#### Orthonormal basis
- The basis vectors are perpendicular **and** unit length.
- Show that:
    - `c_i = x · w_i`
    - in matrix form: `c = W^T x`
- This is the clean payoff.
- Emphasize:
    - no coupling
    - no scale correction
    - direct projections = coordinates

### Visual Requirements

- Show the **same target vector** in all three coordinate systems (or equivalent corresponding vector).
- The basis vectors should visually act like the **axes of the local coordinate system**.
- The standard / global coordinate system should remain understandable.
- Prefer a clean educational aesthetic:
    - no clutter
    - strong labels
    - subtle animation
    - avoid overuse of controls

---

## Recommended Tech Stack

The implementation may combine tools where useful. The exact split is up to the coding agent.

### Recommended libraries
- **Vue 3**
- **KaTeX** (or vue wrapper) for math rendering
- **D3** and/or **SVG** for 2D coordinate system visuals
- **Three.js** only if it meaningfully improves layered rendering or animation

### Strong recommendation
For this specific project, **SVG + D3 (or SVG with Vue only)** is likely the simplest and best fit for:
- crisp 2D coordinate systems
- arrows
- dashed projection lines
- labels
- transitions
- responsiveness

Three.js is acceptable, but **do not force 3D** unless it materially improves the result.  
This is fundamentally a **2D educational geometry visualization**.

KaTeX should be used for:
- small inline formulas
- displayed equations in each panel
- formula callouts next to the visualizations

---

## High-Level UX Concept

The app should read like a **short explorable article section**.

Suggested structure:

1. **Title + short intro**
    - Introduce the problem:
        - “How do we recover coordinates of a vector in a custom basis?”
    - Explain why this matters:
        - later connection to using a matrix and its transpose

2. **Main comparison section**
    - Either:
        - **3 side-by-side panels** (desktop) / stacked panels (mobile)
    - Or:
        - **1 shared visualization with tabs/steps**
    - The three basis types:
        - Arbitrary
        - Orthogonal
        - Orthonormal

3. **Each basis section should include**
    - visual coordinate system
    - target vector
    - decomposition / projections
    - short explanation
    - compact math panel

4. **Optional final summary strip**
    - A compact comparison table / cards:
        - Arbitrary → coupled system
        - Orthogonal → independent projections + scale correction
        - Orthonormal → direct projections / transpose intuition

---

## Preferred Interaction Model

This should be **low interaction** and **guided**.

### Good interaction patterns
- Tabs: `Arbitrary | Orthogonal | Orthonormal`
- Small “Step” buttons: `Show decomposition`, `Show projection`, `Show formula`
- “Replay animation” button
- Optional tiny toggles:
    - `Show naive projection`
    - `Show correct recovery`

### Avoid
- free dragging of basis vectors
- too many sliders
- turning it into a general-purpose linear algebra playground
- camera controls if Three.js is used

The app should feel **intentional and curated**.

---

## Core Educational Storyboard

This is the key logic the implementation should follow.

### 1. Arbitrary Basis Panel / Scene

#### Visual goals
- Show two **skewed** basis vectors `w1`, `w2` as the basis axes
- Show a target vector `x`
- Show that `x = c1 w1 + c2 w2`

#### Animation ideas
- Animate:
    1. target vector appears
    2. decomposition arrows appear sequentially
    3. optional “naive perpendicular projection” appears as dashed lines
    4. indicate that the naive projection does **not** directly give the coordinates

#### Math panel
Show one of:
- `W c = x`
- and/or explicit 2x2 system

Potential displayed formulas:
- `x = c_1 w_1 + c_2 w_2`
- `W c = x`
- `c = W^{-1} x` (only if square basis matrix framing is used)

#### Key educational caption
- “In a skewed basis, the coordinates are coupled.”
- “The apparent shadow onto one axis is influenced by the other axis.”
- “To recover the coefficients, both coordinates must be solved together.”

---

### 2. Orthogonal Basis Panel / Scene

#### Visual goals
- Show two **perpendicular but unequal-length** basis vectors `w1`, `w2`
- Show the same target vector `x`
- Show perpendicular projection lines onto each basis vector

#### Animation ideas
- Animate:
    1. dashed perpendicular to `w1`
    2. highlight projected segment on `w1`
    3. dashed perpendicular to `w2`
    4. highlight projected segment on `w2`
    5. show that each projection isolates a coefficient (up to scale)

#### Math panel
Use the **decoupled dot-product equations**, not another generic linear system.

Show:
- `x · w_1 = c_1 ||w_1||^2`
- `x · w_2 = c_2 ||w_2||^2`

Then:
- `c_1 = (x · w_1) / ||w_1||^2`
- `c_2 = (x · w_2) / ||w_2||^2`

#### Key educational caption
- “Orthogonality removes cross-talk between coordinates.”
- “Each coefficient can be recovered independently.”
- “Projection isolates the coordinate, but the axis length still matters.”

This is the **main benefit** of orthogonal over arbitrary.  
This distinction must be visually and textually obvious.

---

### 3. Orthonormal Basis Panel / Scene

#### Visual goals
- Show two **perpendicular unit-length** basis vectors `w1`, `w2`
- Same target vector `x`
- Show projections again, but now the projected lengths are directly the coefficients

#### Animation ideas
- Reuse the orthogonal panel’s projection animation
- Then simplify the math / labels:
    - remove the divide-by-norm-squared step
    - reveal that projection length = coefficient

#### Math panel
Show:
- `c_1 = x · w_1`
- `c_2 = x · w_2`

Then the matrix form:
- `c = W^T x`

Optionally also show reconstruction:
- `x = W c`

#### Key educational caption
- “With unit-length axes, the projections are the coordinates.”
- “No coupling, no scale correction.”
- “This is why the transpose becomes the natural readout operator.”

This is the bridge to later sections.

---

## Recommended Component Architecture

This should **not** be implemented as one monolithic component.

### Suggested component structure

- `App.vue`
    - top-level layout
- `components/BlogSectionHeader.vue`
    - title + intro text
- `components/BasisComparisonLayout.vue`
    - overall container for the three basis sections
- `components/BasisPanel.vue`
    - reusable panel wrapper for each basis type
- `components/CoordinateSystemViz.vue`
    - reusable visualization component for a basis scene
    - configurable by props:
        - basis type
        - vectors
        - whether to show projections
        - whether to show naive projection
        - whether to animate decomposition
- `components/MathBlock.vue`
    - KaTeX wrapper for display equations
- `components/ExplanationCard.vue`
    - short textual explanation / takeaway block
- `components/ReplayButton.vue`
    - optional reusable control
- `components/SummaryComparison.vue`
    - optional final compact comparison table/cards

### Utility / logic files
- `src/lib/linearAlgebra.ts`
    - vector operations
    - dot products
    - norms
    - 2x2 solve
    - projection helpers
    - basis presets
- `src/lib/basisPresets.ts`
    - arbitrary basis vectors
    - orthogonal basis vectors
    - orthonormal basis vectors
    - target vector / coefficients
- `src/lib/animation.ts`
    - optional animation timing helpers

---

## Data / Math Design Recommendations

Use **fixed, hand-chosen examples** for maximum clarity.

This is not a generic linear algebra tool.

### Suggested approach
Pick one target vector and one coefficient pair that works nicely in all three basis setups.

For each panel:
- choose basis vectors
- derive a target vector from chosen coefficients:
    - `x = c1 w1 + c2 w2`

This ensures the decomposition is exact and visually meaningful.

### Recommended examples
- **Arbitrary basis**
    - skewed, clearly non-orthogonal
- **Orthogonal basis**
    - perpendicular, visibly different lengths
- **Orthonormal basis**
    - standard unit axes or a rotated orthonormal basis

### Important
The examples should be chosen so that:
- the vector is not too close to any axis
- projections are visually readable
- decomposition segments are distinct
- labels do not overlap badly

---

## Rendering Guidance

### Prefer SVG for the coordinate systems
For this kind of educational 2D visualization, SVG is likely the best choice.

Benefits:
- sharp lines and text
- easy arrows / markers
- easy dashed projection lines
- easy responsive scaling
- easy layering
- easier integration with Vue + D3

### Possible rendering layers
For each visualization:
1. background grid (subtle)
2. global / standard frame (optional)
3. basis axes
4. target vector
5. decomposition vectors
6. projection lines
7. highlighted projected segments
8. labels / coordinate callouts

### Styling
- keep the design minimal and blog-friendly
- use subtle motion and highlighting
- avoid overly saturated / toy-like visuals
- support desktop well, but ensure mobile remains readable

---

## Animation Guidance

Animations should clarify, not distract.

### Good animation sequence
For a panel:
1. basis axes appear
2. target vector appears
3. decomposition appears
4. projection lines appear
5. formula highlights update in sync

### Recommended timing
- short, smooth transitions
- 300–900ms range
- no excessive motion
- allow replay

### Good enhancement
Synchronize:
- visual highlight of a basis vector
- matching formula term highlight
- matching coefficient label

This creates strong educational value.

---

## Copy / Content Guidance

The coding agent should **not** invent the full final blog post content.

Provide:
- short placeholder explanatory text
- concise captions
- formula labels
- section headings

The implementation should be structured so that:
- copy can easily be revised later
- colors / branding / final prose can be adjusted later
- formulas can be updated later

Avoid hard-coding excessive final editorial text.

---

## Accessibility / Responsiveness

### Accessibility
- clear contrast
- semantic headings
- keyboard accessible tab controls
- replay buttons accessible by keyboard
- avoid hover-only critical information

### Responsive behavior
- desktop:
    - 3 columns or 2 + 1 depending on space
- tablet/mobile:
    - stacked panels
    - visualizations remain legible
    - formulas wrap gracefully

---

## Implementation Priorities (Order of Work)

Recommended development order:

1. Set up KaTeX rendering
2. Create basic page layout
3. Implement reusable SVG coordinate system component
4. Implement arbitrary basis panel
5. Implement orthogonal basis panel
6. Implement orthonormal basis panel
7. Add small synchronized animations
8. Add summary comparison strip
9. Polish layout / spacing / responsiveness

---

## Success Criteria

The result is successful if a reader can quickly understand:

1. **A basis is a way to describe a vector using custom axes**
2. **In a skewed basis, coordinates interfere and must be solved together**
3. **In an orthogonal basis, coordinates decouple**
4. **In an orthonormal basis, projections directly give the coordinates**
5. **This motivates why matrix transpose is a natural readout in the special orthonormal case**

And the page should feel:

- educational
- polished
- modular
- blog-post-like
- not overengineered
- easy to extend later into the larger superposition article

---

## Optional Stretch Goals

If time permits, consider one or two of these:

- a tiny toggle in the arbitrary panel:
    - `Show naive projection`
    - to explicitly demonstrate why it fails
- synchronized formula term highlighting on hover / animation step
- a final “bridge” card explaining:
    - “When there are more features than orthogonal directions, some interference becomes unavoidable.”
    - keep this minimal; do **not** build the full superposition visualization here
- a lightweight shared state that allows:
    - replay all panels in sequence

---

## Important Non-Goals

Do **not** turn this into:

- a full linear algebra teaching app
- a generic basis editor
- a freeform draggable sandbox
- a 3D camera playground
- the full LLM superposition visualization

This is specifically an **introductory, highly curated educational section**.

---

## Final Note

The implementation should prioritize:

- **clarity over flexibility**
- **educational sequencing over parameterization**
- **modular code over one-off hacks**
- **visual intuition over mathematical density**

The final app should feel like a polished, interactive section of a thoughtful technical blog post.