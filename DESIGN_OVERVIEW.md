# Design Overview

A reference for where fonts, colors, layout constants, and other design tokens are defined across the codebase. Organized by concern, not by file.

---

## Table of Contents

1. [Global Stylesheet](#1-global-stylesheet)
2. [Typography & Fonts](#2-typography--fonts)
3. [Color System](#3-color-system)
4. [Feature Color Gradient](#4-feature-color-gradient)
5. [Selection / Highlight Color](#5-selection--highlight-color)
6. [Three.js Scene Colors](#6-threejs-scene-colors)
7. [Hardcoded Colors (Not Yet Tokenized)](#7-hardcoded-colors-not-yet-tokenized)
8. [Layout Constants](#8-layout-constants)
9. [TypeScript Constants](#9-typescript-constants)
10. [KaTeX / Math Rendering](#10-katex--math-rendering)
11. [Component-Level Scoped Tokens](#11-component-level-scoped-tokens)

---

## 1. Global Stylesheet

**`src/style.css`** — loaded globally in `src/main.ts`.

This is the single source of truth for all CSS custom properties. Every component inherits these via `:root`. The KaTeX stylesheet is also loaded globally:

```ts
// src/main.ts
import './style.css'
import 'katex/dist/katex.min.css'
```

---

## 2. Typography & Fonts

Defined in **`src/style.css`** `:root`:

| Property | Value |
|---|---|
| `font-family` | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` |
| `font-size` | `17px` (root baseline) |
| `line-height` | `1.5` |
| `font-weight` | `400` |
| `font-synthesis` | `none` |
| `text-rendering` | `optimizeLegibility` |
| `-webkit-font-smoothing` | `antialiased` |

**Monospace** (used for numeric cell values in `WeightView`, debug bar in `MainView`):
```css
font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
```
Defined inline in component scoped styles — not a CSS variable.

**Math / LaTeX** (used in `WeightView`, axis labels, `ActivationIcons`, `InputValue`):  
KaTeX renders its own fonts (loaded via `katex/dist/katex.min.css`). Font size is controlled per-component via `:deep(.katex) { font-size: ... }`.

---

## 3. Color System

All semantic colors are CSS custom properties in **`src/style.css`** `:root`.

### Backgrounds

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-bg` | `#ffffff` | white | Panel backgrounds, modal |
| `--color-bg-secondary` | `#f9fafb` | gray-50 | Page background, cell grids |
| `--color-bg-stub` | `#e5e7eb` | gray-200 | Placeholder / empty views |

### Text

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-text-primary` | `#374151` | gray-700 | Body text, headings |
| `--color-text-secondary` | `#9ca3af` | gray-400 | Subdued labels, panel titles |
| `--color-text-label` | `#6b7280` | gray-500 | Row/col headers in WeightView, axis labels |
| `--color-text-title` | `#9ca3af` | gray-400 | (alias of secondary, reserved for titles) |

### Positive / Negative (weight & neuron encoding)

These are the core semantic colors used by the value→color interpolation in `WeightView`, `ActivationIcons`, and `AutoencoderView`.

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-positive` | `#fb923c` | orange-400 | Positive weight values |
| `--color-positive-light` | `#fed7aa` | orange-200 | Lighter positive tint |
| `--color-positive-strong` | `#ea580c` | orange-600 | Stronger positive emphasis |
| `--color-negative` | `#60a5fa` | blue-400 | Negative weight values |
| `--color-negative-light` | `#bfdbfe` | blue-200 | Lighter negative tint |
| `--color-negative-strong` | `#2563eb` | blue-600 | Stronger negative emphasis |
| `--color-neuron-zero` | `#ffffff` | white | Zero / neutral state |

The interpolation formula used in `WeightView.vue`, `ActivationIcons.vue`, and `AutoencoderView.vue` is implemented as `valColor(v)` / `neuronColor(v)` — **not** done via CSS, but in TypeScript, directly mirroring the above variable values. This is a known duplication: the RGB channel targets in the JS functions should stay in sync with the CSS variables.

### Error

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-error` | `#ef4444` | red-500 | Validation errors |
| `--color-error-light` | `#fee2e2` | red-100 | Error backgrounds |

### Interactive (buttons, progress, links)

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-interactive` | `#3b82f6` | blue-500 | Primary buttons, progress bar fill, active tabs |
| `--color-interactive-hover` | `#2563eb` | blue-600 | Hover state for interactive elements |
| `--color-interactive-disabled` | `#d1d5db` | gray-300 | Disabled button text |

### Borders

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-border` | `#e5e7eb` | gray-200 | Panel borders, cell grid, dividers |
| `--color-border-focus` | `#3b82f6` | blue-500 | Focus ring on inputs |

### Add / Remove buttons

| Variable | Value | Tailwind equiv. | Usage |
|---|---|---|---|
| `--color-add-btn` | `#22c55e` | green-500 | "+ neuron" button |
| `--color-remove-btn` | `#ef4444` | red-500 | "− neuron" button |

### Shadow

| Variable | Value | Usage |
|---|---|---|
| `--shadow-card` | `0 4px 6px -1px rgba(3,7,18,0.10), 0 2px 4px -2px rgba(3,7,18,0.06)` | Panel card shadow (`.panel` class in MainView) |

---

## 4. Feature Color Gradient

**`src/utils/featureColor.ts`** — the single source of truth for per-feature colors.

Feature vectors are colored on a **green → yellow** gradient, where `f₁` (highest importance) is green and `fₙ` (lowest) is yellow. This is used consistently across `AutoencoderView`, `EmbeddingView`, `InputValue`, and `EmbeddingLegend`.

```ts
const GREEN_RGB  = [34,  197, 94]   // #22c55e  — feature 1
const YELLOW_RGB = [234, 179,  8]   // #eab308  — feature n
```

**Exported functions:**

| Function | Return type | Usage |
|---|---|---|
| `featureColorCss(idx, n)` | `color(srgb-linear ...)` string | CSS `background` on swatches (gamma-corrected to match Three.js) |
| `featureColor(idx, n)` | `rgb(...)` string | General CSS use |
| `featureColorHex(idx, n)` | `#rrggbb` string | `InputValue` slider thumb |
| `featureColorRGB(idx, n)` | `[r, g, b]` normalized 0–1 | Three.js `new THREE.Color(r, g, b)` |

**Exported constants:**

```ts
export const EMBEDDING_POINT_COLOR     = '#a855f7'   // violet-500 — current embedding point (CSS)
export const EMBEDDING_POINT_COLOR_HEX = 0xa855f7    // violet-500 — same, for Three.js
```

---

## 5. Selection / Highlight Color

There is no CSS variable for the selection/highlight accent. It is hardcoded as **`#6366f1`** (indigo-500) in multiple places:

| File | Lines | Usage |
|---|---|---|
| `src/components/AutoencoderView.vue` | ~833–834 | `.selected-neuron` glow ring |
| `src/components/WeightView.vue` | ~386, ~432, ~488 | Selected row/col/cell border |
| `src/components/MainView.vue` | combined tab active indicator | via `--color-interactive` (blue-500, not indigo) |

> **Note:** The selection ring color (`#6366f1`) differs slightly from `--color-interactive` (`#3b82f6`). If a single selection token is ever desired, introduce `--color-selection: #6366f1` in `style.css`.

---

## 6. Three.js Scene Colors

Three.js cannot read CSS variables. All 3D scene colors are defined as hex literals (prefixed `0x`) in TypeScript files.

### `src/components/embeddingView/constants.ts`

```ts
AXIS_COLOR     = 0xd1d5db   // gray-200  — axis shaft and ticks
DIM_COLOR_HEX  = 0xadadad   // ~gray-400 — dimmed/inactive vector opacity
```

### `src/components/embeddingView/useEmbeddingScene.ts`

```ts
AXIS_HIGHLIGHT_COLOR      = 0x374151   // gray-700  — hovered axis (note: TODO too dark)
AXIS_LABEL_COLOR_DEFAULT  = '#6b7280'  // gray-500  — KaTeX label default color
AXIS_LABEL_COLOR_HIGHLIGHT= '#1f2937'  // gray-800  — KaTeX label hovered color
```

### `src/components/embeddingView/overlays/`

| File | Constant | Value | Tailwind equiv. | Meaning |
|---|---|---|---|---|
| `ProjectionLineOverlay.ts` | `POSITIVE_COLOR` | `0xfb923c` | orange-400 | Mirrors `--color-positive` |
| `ProjectionLineOverlay.ts` | `NEGATIVE_COLOR` | `0x60a5fa` | blue-400 | Mirrors `--color-negative` |
| `AxisGradientOverlay.ts` | `ORANGE` | `0xfb923c` | orange-400 | Mirrors `--color-positive` |
| `AxisGradientOverlay.ts` | `BLUE` | `0x60a5fa` | blue-400 | Mirrors `--color-negative` |
| `InterferenceLinesOverlay.ts` | `COLOR` | `0xef4444` | red-500 | Mirrors `--color-error` |
| `ReluRegionOverlay.ts` | `REGION_COLOR` | `0x9ca3af` | gray-400 | Inactive ReLU region surface |
| `ReluRegionOverlay.ts` | `SURFACE_COLOR` | `0x9ca3af` | gray-400 | ReLU boundary plane |
| `DropLineOverlay.ts` | `COLOR` | `0xd1d5db` | gray-200 | Drop lines to projection |
| `InputDirectionOverlay.ts` | `DOT_COLOR` | `0x6b7280` | gray-500 | Input direction anchor dot |
| `BiasPointOverlay.ts` | `color` | `0x4b5563` | gray-600 | Bias point sphere |

> **Pattern:** Three.js overlays that need to match CSS semantic colors (positive/negative/error) manually duplicate the `style.css` values. There is no runtime bridge. Keep these in sync manually.

---

## 7. Hardcoded Colors (Not Yet Tokenized)

These colors appear in component scoped styles and are not covered by CSS variables. Most follow the Tailwind **slate** palette (a cool-gray scale) and are used exclusively for the dark debug bar and button chrome.

### `src/components/MainView.vue`

| Color | Tailwind | Usage |
|---|---|---|
| `#f1f5f9` | slate-100 | Reset button background |
| `#e2e8f0` | slate-200 | Reset button hover |
| `#475569` | slate-700 | Reset button text; Stop Training hover |
| `#64748b` | slate-500 | Stop Training button background |
| `rgba(15,23,42,0.88)` | slate-900/88% | Debug bar background |
| `#94a3b8` | slate-400 | Debug bar text, deselect button |
| `#7dd3fc` | sky-300 | Debug bar coordinate highlights |
| `#e2e8f0` | slate-200 | Debug bar kind text on hover |
| `#334155` | slate-800 | Debug bar dividers, "none" state |
| `#64748b` | slate-500 | Debug bar label text |

### `src/components/AutoencoderView.vue`

| Color | Tailwind | Usage |
|---|---|---|
| `#6366f1` | indigo-500 | Selected neuron glow ring |
| `#d1d5db` / `#e2e8f0` | gray-200 / slate-200 | Connector lines, borders |
| `#f1f5f9` | slate-100 | Control row backgrounds |
| `#334155` | slate-800 | Row label text |

### `src/components/TrainingStatsView.vue`

| Color | Tailwind | Usage |
|---|---|---|
| `#22c55e` | green-500 | Min Angle chart line (defined in the `tabs` array, not CSS) |
| `#9ca3af` | gray-400 | SVG axis tick labels |
| `#d1d5db` | gray-200 | SVG tick lines |
| `#e5e7eb` | gray-200 | SVG axis base lines, grid |

---

## 8. Layout Constants

### From `src/style.css` `:root`

```css
--title-height:    2.5rem   /* panel title row height (reserved) */
--neuron-size:     2.2rem   /* default neuron circle diameter */
--neuron-size-min: 1.4rem   /* minimum neuron size at small scale */
--row-gap:         0.5rem   /* gap between neuron rows */
```

### From `src/components/MainView.vue` (scoped)

```css
--header-height: 3.25rem    /* sticky header height; used as padding-top on visualization */
```

Two-column layout split (not a variable):
```css
grid-template-columns: 65fr 35fr;   /* left (autoencoder) / right (embedding + controls) */
gap: 2rem;
```

### From `src/components/AutoencoderView.vue` (scoped)

```css
--row-height: 72px   /* height of each input/output feature row in the 11-column grid */
```

The grid itself uses **11 explicit columns** — do not use `column-gap`. Spacer columns carry the visual gaps:

```
col 1   inputs          (90px)
col 2   tight spacer    (1.2rem)   value ↔ neuron
col 3   input neurons   (--neuron-size)
col 4   wide spacer     (6rem)     SVG connection space (encoder)
col 5   embedding neurons
col 6   activation icons
col 7   activation icon spacer
col 8   wide spacer     (6rem)     SVG connection space (decoder)
col 9   output neurons  (--neuron-size)
col 10  tight spacer    (1.2rem)
col 11  outputs         (82px)
```

### From `src/components/TrainingStatsView.vue`

```ts
const VW = 400, VH = 110      // SVG viewBox (unitless)
const PL = 36, PR = 6         // left / right padding
const PT = 8,  PB = 22        // top / bottom padding
```

### From `src/components/embeddingView/constants.ts`

```ts
AXIS_LEN         = 1.3     // world-space axis line length
AXIS_LABEL_PERP  = 0.3     // perpendicular offset for axis end labels
CAMERA_FOV       = 45      // perspective camera field of view (degrees)
CAMERA_MIN_DIST  = 1.5     // minimum orbit zoom distance
CAMERA_MAX_DIST  = 14      // maximum orbit zoom distance
CAMERA_DAMPING   = 0.07    // OrbitControls damping factor
```

---

## 9. TypeScript Constants

### `src/services/AutoencoderService.ts` (exported)

```ts
INPUT_DIM_MIN = 2   // minimum number of input features
INPUT_DIM_MAX = 8   // maximum number of input features
EMB_DIM_MIN   = 1   // minimum embedding dimension
EMB_DIM_MAX   = 3   // maximum embedding dimension
```

### `src/services/AutoencoderService.ts` (internal)

```ts
HISTORY_INTERVAL = 20    // record history every N steps
MAX_HISTORY      = 400   // maximum history points kept
// Adam optimizer
beta1 = 0.9,  beta2 = 0.999,  eps = 1e-8
```

### `src/components/embeddingView/constants.ts` (exported)

All geometry/rendering constants for the Three.js scene. See §8 above for layout values. Additional:

```ts
ARROW_HEAD_MAX_LEN   = 0.17    // max arrowhead length (world units)
ARROW_HEAD_MAX_W     = 0.09    // max arrowhead width
ARROW_SHAFT_RADIUS   = 0.013   // shaft cylinder radius
VEC_HIT_RADIUS       = 0.075   // invisible hit mesh radius
DIM_OPACITY          = 0.35    // opacity of dimmed (non-hovered) vectors
AXIS_LABELS          = ['h_1', 'h_2', 'h_3']   // KaTeX formulae for axis ends
```

---

## 10. KaTeX / Math Rendering

### Utility: `src/utils/latex.ts`

Two exported functions:

```ts
// For Vue templates — use with v-html
renderLatexHtml(formula: string): string

// For imperative code (Three.js CSS2DObject labels)
createLatexElement(formula: string, style?: Partial<CSSStyleDeclaration>): HTMLDivElement
```

Both call `katex.renderToString` with `{ throwOnError: false, output: 'html' }`.

Components that need display-mode or custom options call `katex.renderToString` directly (e.g. `WeightView.vue`).

### Where KaTeX is used

| Component / file | Rendered content |
|---|---|
| `WeightView.vue` | Matrix titles **W**, **b**; row labels `h_k`; col labels `f_j`; encoder/decoder equations |
| `ActivationIcons.vue` | Bias labels `b_i` |
| `AutoencoderView.vue` | Neuron tooltips `I_i`, feature labels `x_i`, `\hat{x}_i` |
| `InputValue.vue` | Feature slider labels `f_i` |
| `EmbeddingLegend.vue` | Feature legend labels |
| `embeddingView/sceneHelpers.ts` | Axis end labels `h_1`, `h_2`, `h_3` (via `createLatexElement`) |
| `embeddingView/overlays/BiasPointOverlay.ts` | Bias point label `b_n` (via `createLatexElement`) |
| `embeddingView/overlays/ReluRegionOverlay.ts` | ReLU region label (via `createLatexElement`) |

### Font size convention

KaTeX font size is controlled per-use via `:deep(.katex)` in scoped component styles:

```css
/* Example from WeightView.vue */
.matrix-title :deep(.katex) { font-size: 1rem; }
.col-header   :deep(.katex) { font-size: 0.78rem; }

/* Example from ActivationIcons.vue */
.bias-label :deep(.katex) { font-size: 0.6rem; }
```

---

## 11. Component-Level Scoped Tokens

Some design decisions live only within a single component's `<style scoped>` block and have no global counterpart.

| Component | Token / pattern | Value | Note |
|---|---|---|---|
| `MainView.vue` | `--header-height` | `3.25rem` | Controls `padding-top` of visualization and sticky header height |
| `AutoencoderView.vue` | `--row-height` | `72px` | Height of each feature row in the 11-col grid |
| `WeightView.vue` | cell dimensions | `3rem × 1.9rem` | `min-width` / `min-height` of matrix cells |
| `BlogPost.vue` | prose `max-width` | `680px` | Reading column width for the blog article |
| `TrainingStatsView.vue` | SVG viewBox | `400 × 110` | Chart canvas coordinate space |

---

## Quick Reference: "Where do I change…"

| I want to change… | Edit this file |
|---|---|
| Page / panel background colors | `src/style.css` `:root` |
| Text colors | `src/style.css` `:root` |
| Positive/negative weight colors | `src/style.css` `:root` **and** sync the `valColor()` / `neuronColor()` JS functions in `WeightView.vue`, `ActivationIcons.vue`, `AutoencoderView.vue` |
| Feature vector colors (green→yellow gradient) | `src/utils/featureColor.ts` |
| Embedding point color (violet) | `src/utils/featureColor.ts` |
| 3D axis / overlay colors | `src/components/embeddingView/constants.ts` and individual `overlays/*.ts` files |
| Selection highlight color (indigo) | `AutoencoderView.vue`, `WeightView.vue` (hardcoded `#6366f1`) |
| Header height | `MainView.vue` scoped `--header-height` |
| Neuron row height | `AutoencoderView.vue` scoped `--row-height` |
| Dimension limits (min/max features) | `src/services/AutoencoderService.ts` exported constants |
| KaTeX font sizes | `:deep(.katex)` in the relevant component's `<style scoped>` |
| Global font family | `src/style.css` `:root` `font-family` |
