# Copilot Instructions

## Commands

```bash
npm run dev        # Vite dev server (hot reload)
npm run build      # Production build (also used for type-checking — fix TS errors here)
npm run preview    # Preview production build locally
```

There are no test or lint scripts. Use `npm run build` to catch TypeScript errors before committing.

## Architecture

Single-page Vue 3 + TypeScript app. One shared service drives everything; components are pure display/input.

```
MainView (creates & provides AutoencoderService)
├── AutoencoderView     — 9-column CSS grid, SVG Bezier connections, input sliders
├── EmbeddingView       — Three.js WebGL (1D/2D/3D axes, ArrowHelper vectors, OrbitControls)
├── WeightView          — W matrix + b bias heatmap with hover highlighting
├── TrainingConfigView  — training parameter form + start/stop
└── TrainingStatsView   — SVG line charts (loss / feature presence / min angle)
```

**Service is the single source of truth.** `MainView` calls `createAutoencoderService()` and `provide('autoencoderService', svc)`. Every child component accesses it with:
```ts
const svc = inject<AutoencoderServiceType>('autoencoderService')!
```
Never pass service state as props — always use inject.

**Math model:** `h = Wx` (encoder, no activation), `x̂ = ReLU(Wᵀh + b)` (decoder, tied weights). Features are non-negative (`Math.abs(randn())`). Loss: `L = Σ Iᵢ(xᵢ − x̂ᵢ)²` where `Iᵢ = α^i` (feature importance decay). Adam optimizer.

## Key Conventions

### Service API
`AutoencoderService` exposes:
- **Reactive refs**: `W` (`m×n`), `b` (`n`), `currentInput`, `currentEmbedding`, `currentOutput`, `currentError`, `loss`, `step`, `isTraining`
- **History arrays**: `lossHistory`, `featurePresenceHistory`, `minAngleHistory` (recorded every 20 steps, max 400 points)
- **Dimension setters**: `setInputDim(n)`, `setEmbeddingDim(m)` — each only touches its own dimension (no cross-constraint), both call `stopTraining()` + `initialize()`
- **Config changes** via `updateConfig(partial)` — always calls `resetTraining()` first
- **Limits**: `INPUT_DIM_MIN=2`, `INPUT_DIM_MAX=8`, `EMB_DIM_MIN=1`, `EMB_DIM_MAX=3` (exported constants)
- `W` is indexed `W[k][j]`: k = embedding row (0…m−1), j = input column (0…n−1)

### Color system
All theme tokens live in `src/style.css` as CSS custom properties. The value→color mapping used consistently across all components:
- **Positive → orange** `#f97316` / `--color-positive`
- **Negative → blue** `#3b82f6` / `--color-negative`
- **Zero → white** `#ffffff`

For inline RGB interpolation (e.g. neuron backgrounds, matrix cells), interpolate linearly between white and the target color. Never hard-code colors that duplicate a CSS variable.

The 8-color palette for embedding feature vectors: `['#f97316','#3b82f6','#22c55e','#ec4899','#a855f7','#06b6d4','#eab308','#6366f1']`

### AutoencoderView grid
9 explicit columns — do **not** use `column-gap`. Spacer columns carry the visual gaps:
```
col 1  inputs (90px)
col 2  tight gap (1.2rem)       — value↔neuron
col 3  input neurons (--neuron-size)
col 4  wide gap (6rem)          — SVG connection space
col 5  embedding neurons
col 6  wide gap (6rem)
col 7  output neurons
col 8  tight gap (1.2rem)
col 9  outputs (82px)
```
Rows: `auto repeat(n, var(--row-height)) auto` (header + n data rows + controls). `--row-height: 72px`.

SVG connections are an absolutely-positioned overlay; coordinates come from `getBoundingClientRect()` relative to the grid container. Redrawn via `ResizeObserver` + deep watcher on `W`.

### EmbeddingView (Three.js)
- Transparent background (`alpha: true`, `setClearColor(0,0,0,0)`)
- Feature vectors are **columns of W**: `v_i = W[:, i]`
- Hover works via invisible `CylinderGeometry` hit meshes + `Raycaster` in the animation loop — do not use DOM events for 3D hover
- On dimension change: full scene rebuild (`init()`). On weight change: set `needsVecUpdate = true` flag, applied in next animation frame
- 1D: disable orbit rotation. 3D: camera at `(1.9, 1.5, 3.1)`

### Vue patterns
- All components use `<script setup lang="ts">`
- Derived values → `computed()`, never recalculate in template
- DOM element arrays → `:ref="(el) => refArray[i] = el as HTMLElement"`
- `reactive()` only for the config object in service; everything else is `ref()`
- `readonly()` wraps config in service — mutations go through explicit setters only

### Panel layout (MainView)
- **Top row**: `autoencoder-section` (flex-1, no card) + `embedding-panel` (fixed 260px) side by side
- **Bottom row**: `weight-panel` (flex-1, overflow-x: auto) + `training-config-panel` + `training-stats-panel`
- `AutoencoderView` has **no card wrapper** — renders directly on the gray-50 page background
- All other panels use `.panel` class: white bg, 1px border, 10px radius, box-shadow
