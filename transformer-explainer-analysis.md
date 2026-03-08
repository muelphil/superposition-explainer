# Transformer Explainer — Technical Architecture Analysis
> Reference document for building a similar interactive visualization demo

---

## 1. SVG Backdrops for Visualizing Connections

### Architecture: Dual-Layer Absolute-Positioned SVG Overlay

The key insight is that all connection shapes ("sankey paths") are drawn on **two full-screen SVG elements** that are absolutely positioned (`left:0; top:0; width:100%; height:100%`) and overlaid on top of the entire HTML layout. The HTML DOM itself never moves — only the SVG overlay is redrawn. File: `src/components/Sankey.svelte`.

```html
<!-- svgBackEl — background paths, lower z-index -->
<svg class="sankey-back absolute left-0 top-0 h-full w-full" style="z-index: 11;" />
<!-- svgEl — foreground paths, higher z-index -->
<svg class="sankey-top absolute left-0 top-0 h-full w-full"  style="z-index: 12;" />
```

The parent `div` is `position: relative`, making these SVGs cover the full visualization area.

### Coordinate System: getBoundingClientRect + Scroll Offset

Coordinates are obtained **dynamically at draw time** by querying real DOM elements:

```typescript
const drawPath = async () => {
  // For each path definition (from CSS selector → to CSS selector):
  const sources = d3.selectAll(from).nodes() as Element[];
  const targets = d3.selectAll(to).nodes() as Element[];

  sources.map((src, i) => {
    const source = src.getBoundingClientRect();   // viewport-relative rect
    const target = targets[i].getBoundingClientRect();

    // Offset by scroll position to get document-absolute coords
    const scrollTop  = window.scrollY;
    const scrollLeft = window.scrollX;
    
    return pathGenerator(source, target, curveOffset);
  });
};
```

Because SVG coordinates are document-absolute but `getBoundingClientRect()` is viewport-relative, **scroll offsets are always added** to every coordinate (`source.right + scrollLeft`, `source.top + scrollTop`).

### Path Shape: Cubic Bezier "Ribbon" Paths

Connections are rendered as **closed filled shapes** (ribbons), not just lines. The default generator:

```javascript
// Creates a filled ribbon connecting source (right edge) → target (left edge)
`M ${source.right + scrollLeft}, ${source.top + scrollTop}
 C ${source.right + curveOffset}, ${source.top}
   ${target.left - curveOffset}, ${target.top}
   ${target.left},               ${target.top}
 L ${target.left},               ${target.bottom}
 C ${target.left - curveOffset}, ${target.bottom}
   ${source.right + curveOffset},${source.bottom}
   ${source.right},              ${source.bottom}
 Z`  // closes the shape
```

The **curveOffset** is dynamically scaled by distance between elements:
```typescript
const pathAdjustor = (source, target, curve) => {
  const distance = target.left - source.right;
  const curveOffset = distance > 100 ? curve : curve * (distance / 100);
  // Prevents over-shooting the curve when elements are close together
};
```

Special path types:
- **Stroke-only lines** (e.g., query/key to attention matrix): use `fill="none"`, draw a single SVG line with arc commands (`A`)
- **Shape ribbons** (most connections): use `fill` with gradient, `stroke="none"`

### SVG Gradients

Gradients are programmatically defined inside `<defs>` using D3 at mount time. A central `gradientMap` object (`src/constants/gradient.ts`) defines all named gradients using Tailwind color values at brightness 200:

```typescript
// Horizontal linearGradient (x1=0% x2=100%, flow left→right)
'purple-indigo': {
  0:   theme.colors.purple[200],   // stop at 0%
  100: theme.colors.indigo[200]    // stop at 100%
}
// With opacity control:
'transparent-purple': {
  0:   { color: theme.colors.purple[100], opacity: 0 },
  100: { color: theme.colors.purple[200], opacity: 1 }
}
```

Each gradient gets a `-last` clone (for the last token row, which is color-coded differently).

### Staying In Sync: ResizeObserver

The SVG is completely redrawn whenever the layout changes:

```typescript
resizeObserver = new ResizeObserver(() => {
  drawPath();       // Recompute all getBoundingClientRect() and redraw
  drawResidualPath();
});
document.querySelectorAll('.resize-watch').forEach(el => resizeObserver.observe(el));
```

Elements with class `resize-watch` mark the layout containers whose size changes matter.

### Residual Connection Lines

Residual connections are drawn as D3 `<line>` elements (not paths) with `stroke-dasharray="8,4"`, initially `opacity:0`. On hover they become visible and animated via GSAP.

---

## 2. Animations

### Two Categories

| Category | Tool | Trigger | Purpose |
|----------|------|---------|---------|
| Step-by-step data flow | **GSAP Timeline** | Model output ready | Show how data moves through transformer |
| Layout-changing expansions | **GSAP Flip** + CSS keyframes | Click on component | Expand/collapse detail views |
| Navigation transitions (blocks/heads) | **GSAP Timeline** + CSS keyframes | Prev/Next button | Paginate between blocks or heads |
| Element entry/exit | **Svelte `transition:fade`** | Reactive show/hide | Popovers, dim overlays |

### Step-by-Step Flow Animation (`src/utils/animation.ts` — `showFlowAnimation`)

This is the main pedagogical animation, ~590 lines. It plays when the model produces output. It uses a single GSAP timeline that composes every stage of the forward pass sequentially:

```typescript
const tl = gsap.timeline({
  onStart:    () => isOnAnimation.set(true),  // disable all buttons
  onComplete: () => isOnAnimation.set(false)  // re-enable buttons
});

// Stage 1: Embedding vectors fade in
tl.fromTo(tokenEmbedding, { opacity: 0 }, { opacity: 1, duration: 0.02 });

// Stage 2: Animate gradient stop positions on the SVG connector paths
// (gives the illusion of data "flowing" through the ribbon)
generateGradientAnimation(tl, gradientStop, { duration: 0.1, offset: { to: '100%' } });

// Stage 3: Animated SVG stroke-dashoffset on attention paths
path.style.strokeDasharray = path.getTotalLength();
path.style.strokeDashoffset = path.getTotalLength();
tl.to(path, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' });

// Stage 4: Scale-in attention matrix circles
tl.from(circles, { scale: 0, opacity: 0, stagger: 0.01, ease: 'power2.out' });
// ... MLP stages, output stages, etc.
```

**The key trick for "flowing" gradients**: GSAP animates the `offset` and `stop-color` attributes of SVG `<stop>` elements inside gradient `<defs>`. This makes the ribbon appear to fill with color from left to right, creating a data-flow effect with no actual DOM movement.

```typescript
const generateGradientAnimation = (tl, gradStop, options) => {
  tl.fromTo(gradStop,
    { attr: { offset: '0%', 'stop-color': 'rgba(255,255,255,0)' } },
    { attr: { offset: '100%', 'stop-color': 'rgba(255,255,255,0)' }, duration, ease }
  ).to(gradStop,
    { attr: { offset: '100%', 'stop-color': initialColor } },
    '-=50%'  // overlap with previous
  );
};
```

**Animation state flags** prevent re-triggering and disable interactive controls while playing:
```typescript
export const isOnAnimation           = writable(false);
export const isOnBlockTransition     = writable(false);
export const isExpandOrCollapseRunning = writable(false);

// Buttons check these:
<button disabled={$isOnAnimation || $isOnBlockTransition}>
```

### Layout-Changing Expansion: GSAP Flip

When clicking "Embedding" or "Attention" to expand them, `GSAP Flip` is used — it captures pre/post-layout states and animates the difference:

```typescript
import { gsap, Flip } from '~/utils/gsap';

const expandEmbedding = async () => {
  const state = Flip.getState('.embedding .token-column'); // snapshot BEFORE
  isEmbeddingExpanded = true;                              // mutate DOM state
  await tick();                                            // let Svelte re-render

  Flip.from(state, {          // animate FROM snapshot TO new position
    duration: 0.5,
    ease: 'power2.inOut',
    onComplete: () => isExpandOrCollapseRunning.set(false)
  });

  gsap.to('.embedding-detail', { opacity: 1, duration: 0.5, delay: 0.5 });
};
```

This is the cleanest approach: you change CSS/layout normally, Flip figures out what moved and animates it. No manual coordinate calculations.

### Block/Head Transitions: CSS Keyframes + Class Toggling

Switching between Transformer blocks uses pure CSS animations triggered by class manipulation:

```typescript
// In BlockTransition.svelte
container.classList.add('animate-forward');  // add class → triggers CSS keyframes
setTimeout(() => {
  container.classList.remove('animate-forward');
  isOnBlockTransition.set(false);
}, 800);
```

```scss
// In +page.svelte <style>
@keyframes collapse {
  0%   { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}
@keyframes expand {
  0%   { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}

.animate-forward .block-steps.main { animation: collapse 800ms ease-in; }
.animate-forward .block-steps.next { animation: expand   800ms ease-in; }
```

Two identical `.block-steps` containers exist in the DOM: `.main` (current block) and `.next` (incoming block, hidden). During transition, one collapses and the other expands.

### Head Stack Carousel: GSAP on Stacked Cards

The multi-head stacked-card view uses GSAP to animate a deck of absolutely-positioned card divs. Each card has `x`, `y`, `scale`, `opacity`, `zIndex` computed from its stack position:

```typescript
headStyles = Array.from({ length: 12 }, (_, index) => ({
  x:       index * 5,                     // 5px offset per layer
  y:       index * 8,                     // 8px offset per layer
  scale:   1,                             // no scale change (headGap.scale = 0)
  opacity: Math.max(0.2, 1 - index * 0.1),
  zIndex:  12 - index
}));

// Forward transition:
tl.to(restHeads, {
  x: (i) => headStyles[i].x,
  y: (i) => headStyles[i].y,
  opacity: (i) => headStyles[i].opacity,
  stagger: { from: 'end', amount: 0.06 }  // ripple from back to front
});
tl.to(firstHead, { scale: 1.4, opacity: 0, duration: 0.4 }); // "throw" top card away
```

On `onComplete`, the DOM element is actually moved (`container.appendChild(firstHead)`) so the logical order matches the visual order.

### Residual Hover Animation

On hover of a residual connection, a GSAP tween runs indefinitely to animate `strokeDashoffset`, making the dashed line appear to flow:

```typescript
gsap.to(paths.nodes(), {
  strokeDashoffset: -50,
  duration: 1,
  repeat: -1,
  ease: 'none'    // linear — constant speed
});
```

---

## 3. Tech Stack (Beyond Framework)

| Layer | Technology | Role |
|-------|-----------|------|
| **Animation (complex)** | **GSAP 3.12** + Flip plugin | Timelines, DOM animations, layout transitions |
| **SVG / Data Vis** | **D3.js v7** | SVG path drawing, data binding, color scales, transitions |
| **UI Components** | **Flowbite-Svelte 0.46** | Pre-built UI components (Cards, Popovers, Tooltips, Buttons, Icons) |
| **Styling** | **Tailwind CSS v3** + **SCSS** | Utility classes + custom component styles with `theme()` function |
| **Math Rendering** | **KaTeX 0.16** | Render LaTeX math formulas in popover explanations |
| **ML Inference** | **ONNX Runtime Web 1.23** | Run GPT-2 directly in browser (WebAssembly) |
| **Tokenization** | **@xenova/transformers 2.17** | Tokenize input text using GPT-2 tokenizer in browser |
| **Build** | **Vite 5 + SvelteKit 2** | Dev server, code splitting, static adapter |
| **Extras** | `classnames`, `bignumber.js`, `@neoconfetti/svelte` | CSS class composition, precision math, confetti effect |

### GSAP Flip Plugin
The Flip plugin is the most important GSAP addition — it enables layout-aware animation where you change the CSS layout and Flip automatically animates the elements from their old to new positions. Critical for expand/collapse behaviors.

### D3 Usage Pattern (non-React style)
D3 is used **imperatively** to draw SVG, not as a data-binding framework. This is the correct pattern alongside a reactive frontend:
- `d3.select()` / `d3.selectAll()` for DOM selection
- `.data().join('path')` for data-driven SVG element creation
- `.attr('d', pathString)` to set the path geometry
- `.transition().duration(ms).style('opacity', v)` for smooth hover fades
- Color interpolation: `d3.interpolate(color1, color2)(t)`

---

## 4. Key Insights for Building a Similar Visualization

### Insight 1: Never Move HTML for Connections — Use SVG Overlays
The most important architectural decision. Don't try to draw connections using CSS borders, HTML elements, or canvas — use **two full-screen SVG overlays** (one front, one back for z-ordering). Recalculate all coordinates using `getBoundingClientRect()` + scroll offsets whenever anything changes. This completely decouples layout from connection rendering.

### Insight 2: ResizeObserver Is the Synchronization Mechanism
Your SVG overlay is only correct at the moment it's drawn. You need `ResizeObserver` on all key layout containers to redraw paths whenever the layout reflows. Without this, any window resize, font load, or dynamic content will desync the connections from the nodes.

### Insight 3: Dual Temp/Actual State Pattern for Animated Transitions
When a user action triggers an animated transition, update a `*Temp` store first (for UI display) and only update the actual state store **inside `onComplete`**. This prevents visual glitches and ensures the animation always runs to completion before the layout re-renders with new data. Example:
```
User clicks "Next Block" →
  blockIdxTemp = 5  (used by pagination display)
  → GSAP animation starts
  → onComplete: blockIdx = 5  (used by data/SVG rendering)
```

### Insight 4: GSAP Flip Is the Right Tool for Layout Animations
When expanding/collapsing sections that change the overall grid layout, **do not calculate positions manually**. Use GSAP Flip: capture state before the DOM change, apply the DOM change, then call `Flip.from()`. This handles all the coordinate math automatically and works with any CSS layout system (grid, flexbox, etc.).

### Insight 5: Gradient Animation as Data Flow Visual
To show "data flowing" through a connection ribbon, animate the **SVG gradient stop positions** via GSAP (animating the `offset` attribute and `stop-color`). This creates a wave of color sweeping across the ribbon without any DOM movement. The ribbon shape itself stays static.

### Insight 6: CSS Custom Properties as the Layout Bridge
The vector/cell height is one computed value that must be consistent across every column. Store it as a CSS custom property on the root element (`--vector-height: Xpx`) and derive all other measurements from it (`calc(var(--vector-height) / 12)`). This makes the entire layout respond coherently when the number of tokens changes.

### Insight 7: Semantic Color Coding
Assign colors by concept, consistently everywhere (SVG paths, vector bars, matrix cells, popover highlights):
- Query = Blue family
- Key = Red family
- Value = Green family
- Attention output / MLP = Purple → Indigo → Blue

Use Tailwind color `[200]` (very light) for filled ribbon shapes (they'll be semi-transparent and soft), and `[300]` for stroke/border elements that need more presence.

### Insight 8: `svg { overflow: visible }` Is Essential
The global reset `svg { overflow: visible }` is critical. Without it, SVG elements that extend beyond their bounding box (common with overflow, absolute positioning, and `getBoundingClientRect()`-based coordinates) will be clipped.

### Insight 9: Two Identical Block Containers for Transition
For paginated transitions (block 1 → block 2 → ...) where content changes completely, keep **two identical containers** in the DOM at all times (`.main` and `.next`). The hidden one renders the incoming content. On transition, CSS keyframes collapse one while expanding the other. This avoids complex enter/leave animations on individual elements.

### Insight 10: Analytics-Driven Interaction Design
The project tracks `visibility-show` / `visibility-hide` events with durations on every popover and expansion. This is how you know which explanations users actually read. Build this in from the start.

---

## 5. Style Files & Style Summary

### Where to Find the Style Files

| File | Contents |
|------|----------|
| `src/styles/app.css` | Tailwind directives only (`@tailwind base/components/utilities`) |
| `src/styles/global.scss` | Global resets: `svg { overflow: visible }`, base `font-size: 17px`, no focus outline |
| `src/styles/variables.scss` | **All SCSS z-index variables** (see table below) |
| `tailwind.config.js` | Custom cyan palette + Flowbite plugin, responsive breakpoints disabled |
| `src/routes/+page.svelte` `<style>` | **Main layout CSS**: grid, step/column/vector/cell global classes, keyframe animations |
| Individual `.svelte` `<style lang="scss">` | Component-scoped styles, use `theme('colors.*')` to access Tailwind values |

---

### Style Summary Prompt (for a coding agent)

Use the following as a prompt block when instructing an AI to build a UI in the same style:

---

**Transformer Explainer Visual Style Specification**

**Theme**: Clean, minimal, light background (white / gray-50). No dark mode. Educational/scientific aesthetic — precise, readable, no decorative clutter.

**Typography**:
- Base font size: `17px` (set on `:root`). All measurements in `rem`.
- Font: System sans-serif stack (Tailwind default). No custom web fonts.
- Labels: `0.9rem`, `color: gray-700`. Token labels floated left of vectors.
- Column titles: `0.9rem`, `color: gray-400`. Transitions to `gray-600` on hover.
- Subtitle/helper text: `0.8rem`, `color: gray-400`, centered above columns.
- Math (KaTeX): small, `0.6rem`–`0.8rem` in popovers.

**Color Palette** (Tailwind defaults, `[200]` shade for fill shapes, `[300]–[400]` for prominent elements):
- Background: `white` / `gray-50`
- Text primary: `gray-700`
- Text secondary: `gray-400`
- Query: `blue-200` (fill shapes), `blue-300` (borders/strokes)
- Key: `red-200` (fill shapes), `red-300` (borders/strokes)
- Value: `green-200` (fill shapes), `green-300` (borders/strokes)
- Attention output / residual: `purple-200`–`purple-300`
- MLP 1st layer: `indigo-200`
- MLP 2nd layer: `blue-200`
- Predicted token: `purple-600`
- Interactive highlight: `blue-500` / `blue-600`
- Disabled: `gray-200`–`gray-300`

**Layout**:
- Full-viewport horizontal scroll layout (`min-width: 1300px`). No responsive breakpoints.
- CSS Grid at top level: `grid-template-columns: auto 3.5fr 0.5fr 0.5fr`
- Each "step" column uses `grid-template-rows: var(--title-height) 1fr` (title row + content row)
- Vector bars: `width: 12px`, `height: var(--vector-height)` (computed dynamically, `12px`–`30px` range)
- Cell rows: `height: var(--vector-height)`, `display: flex`, `align-items: center`, `gap: 1rem`
- All columns: `display: flex; flex-direction: column; gap: 0.5rem`

**Key CSS Custom Properties** (set on root container):
```css
--vector-height: 20px;    /* computed from available height / token count */
--title-height: 80px;     /* 5rem */
--content-height: Xpx;    /* remaining height */
```

**Z-Index System** (SCSS variables, use as reference):
```
101  Vectors, operations
102  Column titles
201  Multi-head selector title
300  Above-column content
400  Transformer block bounding box
800  Dim overlay
850  Partial dim overlay
900  Expanded content
998  Popovers, expanded dim
999  Top bar, tooltips
1000 Textbook/tutorial sidebar
```

**Borders & Shadows**:
- Vector bars: solid colored div, no border, no shadow
- Bounding boxes (hover): `border: 2px dashed gray-300` (inactive), `2px dashed blue-400` (active). `border-radius: 0.5–1rem`
- Cards / popovers: `background: white; border: 1px solid gray-200 / f9fafb; box-shadow: 0 4px 6px -1px rgba(3,7,18,0.15), 0 2px 4px -2px rgba(3,7,18,0.08)`
- Head stack cards: `background: white; border: 1px solid #f9fafb; box-shadow: (same as above)`

**SVG Connection Ribbons**:
- Filled closed bezier shapes (no stroke, `fill: url(#gradient-id)`)
- Opacity constants: Embedding `0.8`, Attention head `0.8`, Attention back `0.5`, MLP `0.4`, Logit `0.5`
- Gradients: horizontal `linearGradient`, always `x1=0% y1=0% x2=100% y2=0%`
- Colors at `[200]` brightness, occasionally `[300]`
- Hover: paths in group transition to opacity `0.6`–`1.0` via D3 transition

**Interaction States**:
- Hover on a component: show `2px dashed` bounding box, fade in connection ribbons
- Click on a component: open weight popover card (white card, positioned absolutely via `getBoundingClientRect`)
- Expanded state: dimming overlay fades in (`opacity ~0.5 white`), expanded content gets `z-index: 900`
- Active operation (residual, layer norm): icon fades out, SVG line fades in; animated `stroke-dashoffset` on hover

**Transitions**:
- State changes: `transition: opacity 0.2s` or `all 0.2s`
- Expand/collapse: GSAP Flip, `duration: 0.5s, ease: power2.inOut`
- Block transitions: CSS keyframes `scaleX 0→1 / 1→0`, `800ms ease-in`
- Flowing data animation: GSAP timeline, ~2–3s total, sequential fade-ins + gradient animations

**Popover / Overlay Cards**:
- Built on Flowbite `<Card>` / `<Popover>` components
- Header: `bg-gray-100 border-b border-gray-200 px-3 py-2`; title `font-semibold text-gray-900`
- Body: `text-sm font-light text-gray-500`
- Math equations inside: KaTeX rendered, small font
- Mini matrix heatmaps: `d3.interpolate(color[100], color[400])` for cell coloring

---

