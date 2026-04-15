# Autoencoder Visualization — Developer Guide

This guide describes how the blog's autoencoder visualization works and how to extend it: adding new reveal stages, blend-in/out effects, pulsating animations, tab control, and constraint overrides.

---

## Architecture Overview

```
AutoencoderSection.vue          ← owns all services, scroll logic, task lists
  ├── provides VizService        ← reveal stage, active tab, pulse flags
  ├── provides AutoencoderService
  ├── provides SelectionService
  ├── provides TaskEventBus
  └── AutoencoderVisualization.vue
        ├── AutoencoderView.vue  ← the AE diagram; has all reveal CSS
        ├── EmbeddingView.vue
        ├── WeightView.vue
        ├── TrainingConfigView.vue
        ├── TrainingStatsView.vue
        └── TrainingActionButtons.vue
```

The **VizService** is the single control point for the visualization state from the blog side. All reveal, tab, and pulse logic flows through it.

---

## VizService API (`src/services/VizService.ts`)

```ts
interface VizServiceType {
  // Which tab is visible in the bottom-right panel
  activeTab: Ref<'training' | 'statistics' | 'weights'>

  // Which statistics chart is shown inside the Statistics tab
  statsChart: Ref<'loss' | 'presence' | 'angle'>

  // Current reveal stage (drives cumulative CSS classes on ae-grid)
  revealStage: Ref<RevealStage>

  // Computed: all CSS classes up to and including the current stage
  // e.g. ['reveal-blank', 'reveal-input-output', 'reveal-embedding']
  revealClasses: ComputedRef<string[]>

  // Computed: non-cumulative class for the exact current stage
  // e.g. 'current-stage-embedding'
  currentStageClass: ComputedRef<string>

  // True when current stage index >= target stage index
  stageAtLeast(target: RevealStage): boolean

  // When true, bias/ReLU activation icons pulse with a glow animation
  biasReluPulse: Ref<boolean>

  // When false, the Start/Continue Training button is disabled
  continueTrainingEnabled: Ref<boolean>
}
```

---

## Reveal Stages

Stages are defined in `REVEAL_STAGES` (ordered, cumulative):

```ts
export const REVEAL_STAGES = [
  'blank',             // nothing visible
  'input-output',      // input + output neurons and their value fields
  'embedding',         // embedding neurons and their column header
  'encoder',           // encoder weights (connections) + Encoder heading + weights tab
  'decoder',           // decoder weights (connections) + Decoder heading + bias/ReLU icons
  'weights-view',      // (no new AE elements — used to navigate to the Weights tab)
  'bias-relu-highlight', // (no new elements — used to pulse bias/ReLU icons)
  'data',              // resample button + half-normal backdrop
  'training',          // training footer (start/stop buttons)
  'full',              // catch-all: anything with reveal-tgt-full class
] as const
```

**Key rule**: stages are **cumulative**. Reaching stage `encoder` also keeps everything from `blank`, `input-output`, and `embedding` visible. The CSS classes applied to `.ae-grid` always include all stages up to the current one.

### What happens at each stage transition (in AutoencoderVisualization.vue)

| Stage reached | Bottom row shown | Weights tab shown | Training tab/footer shown |
|---|---|---|---|
| `blank` … `embedding` | No | No | No |
| `encoder` … onwards | Yes | Yes | No |
| `training` … onwards | Yes | Yes | Yes |

---

## How to Blend Elements In/Out

### Step 1 — Mark the element with a `reveal-tgt-*` class

In `AutoencoderView.vue`, add the class to the element you want to gate:

```html
<div class="my-element reveal-tgt-encoder">...</div>
```

Use an existing stage target if appropriate, or add a new one (see below).

### Step 2 — Ensure the CSS hides it by default and reveals it at the right stage

All hiding/revealing CSS lives in the `/* ── Reveal stage gating ── */` section of `AutoencoderView.vue`. Every rule is gated behind `.ae-grid--reveal-mode` (only added in blog mode — the standalone main visualization is never affected).

**Default hide** (add to the grouped rule at the top of that section):
```css
.ae-grid--reveal-mode .reveal-tgt-my-stage {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.4s ease, visibility 0.4s ease;
}
```

**Stage reveal** (add a matching show rule):
```css
.ae-grid--reveal-mode.reveal-my-stage .reveal-tgt-my-stage {
  opacity: 1; visibility: visible; pointer-events: auto;
}
```

### Adding a completely new stage

1. Add the stage name to `REVEAL_STAGES` in `VizService.ts` at the correct position.
2. Add CSS rules as above in `AutoencoderView.vue`.
3. Map the stage in `blockRevealStage` in `AutoencoderSection.vue`.

---

## SVG Weight Connections (special case)

The bezier connection paths use `data-side="encoder"` / `data-side="decoder"` attributes. They are hidden with `!important` overrides to defeat inline opacity styles:

```css
/* hide */
.ae-grid--reveal-mode .vis-path[data-side="encoder"] { opacity: 0 !important; }

/* show (use 'revert' to fall back to the component's inline opacity) */
.ae-grid--reveal-mode.reveal-encoder .vis-path[data-side="encoder"] { opacity: revert !important; }
```

Both the visible masked paths (`.vis-path`) and the invisible hit paths (plain `path`) need to be targeted.

---

## The Half-Normal Backdrop (dist-svg)

The backdrop lives inside `InputValue.vue` as a child component. To hide/show it cross-component, use `:deep()`:

```css
.ae-grid--reveal-mode :deep(.dist-svg) { opacity: 0; visibility: hidden; }
.ae-grid--reveal-mode.reveal-data :deep(.dist-svg) { opacity: 1; visibility: visible; }
```

---

## Pulsating Animations

All `@keyframes` live in `AutoencoderView.vue`. Three currently exist:

| Animation | Keyframes name | Usage |
|---|---|---|
| Column heading slow pulse | `heading-pulse` | Draws attention to newly revealed columns |
| Bias/ReLU icon glow | `pulse-glow` | Highlights activation icons |
| Element pop-in | `reveal-pulse` | Defined but available for entrance bounces |

### Heading Pulse (continuous while block is active)

Driven by the `current-stage-*` class on `.ae-grid` (non-cumulative, changes with each scroll block). Applies only in reveal mode:

```css
.ae-grid--reveal-mode.current-stage-embedding .col-heading.reveal-tgt-embedding {
  animation: heading-pulse 2.4s ease-in-out infinite;
}
```

**To add a heading pulse for a new block/stage**, add a selector like this — the animation automatically stops when the user scrolls to a different block because `current-stage-*` changes.

### Bias/ReLU Glow Pulse

Driven by a boolean flag `vizSvc.biasReluPulse` in VizService. The flag is toggled in `AutoencoderSection.vue`'s range `apply`/`leave`:

```ts
// In apply():
vizSvc.biasReluPulse.value = id === 'bias-relu'

// In leave():
vizSvc.biasReluPulse.value = false
```

The CSS class `bias-relu-pulse` is added to `.ae-grid` when the flag is true:

```css
.ae-grid.bias-relu-pulse :deep(.act-icons) {
  animation: pulse-glow 1.5s ease-in-out infinite;
}
```

**To add a similar boolean-flag pulse for another element**:
1. Add a `Ref<boolean>` to `VizServiceType` and `createVizService()`.
2. Bind a CSS class in the `:class` of `.ae-grid` in `AutoencoderView.vue`.
3. Write the keyframes + selector rule in `AutoencoderView.vue`.
4. Set/clear the flag in `AutoencoderSection.vue`'s `apply`/`leave` callbacks.

### Writing New Keyframes

```css
@keyframes my-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.08); opacity: 0.85; }
}
```

Useful parameters:
- **Speed**: 1.5s = fast/urgent, 2.4s = medium, 3.5s+ = very slow/atmospheric
- **Scale range**: 1.04–1.07 = subtle, 1.10–1.15 = noticeable
- **Easing**: `ease-in-out` for smooth, `cubic-bezier(0.4, 0, 0.6, 1)` for more snappy

---

## Tab Control

The active tab in the bottom-right panel is controlled by `vizSvc.activeTab`:

```ts
vizSvc.activeTab.value = 'training'   // Training Config
vizSvc.activeTab.value = 'statistics' // Training Statistics
vizSvc.activeTab.value = 'weights'    // Weight Matrix
```

Set it inside a range's `apply()` callback in `AutoencoderSection.vue`. Which tab *buttons* are visible is governed by the reveal stage (see the table above).

The active statistics chart within the Statistics tab:

```ts
vizSvc.statsChart.value = 'loss'      // Loss curve
vizSvc.statsChart.value = 'presence'  // Feature presence
vizSvc.statsChart.value = 'angle'     // Minimum angle
```

---

## Scroll-Block System

Defined in `AutoencoderSection.vue`.

### Named Block IDs

```ts
const BLOCK_IDS = [
  'intro',
  'architecture', 'embedding', 'encoder', 'decoder',
  'weights-view', 'tied-weights', 'bias-relu',
  'data', 'training',
  'exp1', 'exp2', 'interlude', 'exp3', 'exp4',
] as const
```

`blockIdx('encoder')` returns the zero-based index. All ranges and reveal maps use this — never hardcode indices.

### Adding a Text Block in the Template

```html
<div class="text-block" :data-block-index="blockIdx('my-block')">
  <p>Content that triggers a reveal when scrolled into view.</p>
</div>
```

Add `'my-block'` to `BLOCK_IDS` at the correct position, and add an entry to `blockRevealStage`.

### Paragraph Ranges

Each `ParagraphRange` defines what happens when a scroll region becomes active:

```ts
{
  from: blockIdx('intro'),   // first block index in range (inclusive)
  to:   blockIdx('training'), // last block index (inclusive)
  apply: (activeIndex: number) => {
    // Called whenever the active block changes within this range.
    // activeIndex is the raw block index.
    const id = BLOCK_IDS[activeIndex]
    vizSvc.revealStage.value = blockRevealStage[id] ?? 'full'
    vizSvc.activeTab.value = 'training'
    // ... set constraintSpec, restore AE state, etc.
  },
  leave: () => {
    // Called when the user scrolls outside this range.
    rangeStates[0] = svc.saveState()   // save AE weights/config for later
  },
}
```

### AE State Save/Restore

Each experiment range has a corresponding `rangeStates[n]` slot:

```ts
const rangeStates: (AeSnapshot | null)[] = [null, null, null, null, null]
```

On `apply`, if a snapshot exists it is restored; otherwise the AE is initialized fresh. On `leave`, the current state is saved. This preserves the user's training progress when they scroll back.

---

## Dimension & Control Constraints

Set inside a range's `apply()`:

```ts
constraintSpec.value = {
  inputDim: 3,          // fix input dimension to 3
  embeddingDim: 2,      // fix embedding dimension to 2
  hiddenControls: ['sparsity'],  // hide the sparsity slider
}
```

Setting `constraintSpec.value = undefined` removes all constraints (experiments section).

---

## `ae-grid--reveal-mode` Isolation

**Critical**: every CSS hiding/revealing rule must be prefixed with `.ae-grid--reveal-mode`. This class is added to `.ae-grid` **only** when `VizService` is injected (blog context). The standalone main visualization at the top of the page never receives this class, so it is completely unaffected by all reveal CSS.

```html
<!-- In AutoencoderView.vue template — reveal-mode only in blog -->
:class="[
  { 'ae-grid--reveal-mode': vizSvc != null },
  vizSvc?.currentStageClass.value,
  ...(vizSvc?.revealClasses.value ?? [])
]"
```

Do **not** write rules like `.ae-grid .reveal-tgt-*` — they will bleed into the main visualization.

---

## Quick Reference: Files to Edit

| Task | File(s) |
|---|---|
| Add/rename a reveal stage | `src/services/VizService.ts` → `REVEAL_STAGES` |
| Add a new reveal target element | `AutoencoderView.vue` → template (add class) + style (hide + show rules) |
| Map a block to a reveal stage | `AutoencoderSection.vue` → `blockRevealStage` |
| Add a new named text block | `AutoencoderSection.vue` → `BLOCK_IDS` + template |
| Add a pulsating animation | `AutoencoderView.vue` → `@keyframes` + selector; `VizService.ts` → new `Ref<boolean>` |
| Control which tab is active | `AutoencoderSection.vue` → `apply()` callback: `vizSvc.activeTab.value = ...` |
| Show/hide bottom row panels | `AutoencoderVisualization.vue` → `stageAtLeast(...)` computed refs |
| Change AE dimensions per section | `AutoencoderSection.vue` → `constraintSpec.value = { inputDim, embeddingDim }` |
