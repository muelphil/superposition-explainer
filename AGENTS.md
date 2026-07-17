# AGENTS.md

## Project at a glance

Interactive web explainer + blog post on **feature superposition in vector embeddings**, based on Anthropic's "Toy Models of Superposition". Targeting IEEE VisXAI workshop submission.

Vue 3 + TypeScript + Vite + Three.js, single-page app. No build framework quirks beyond standard Vite.

## Commands

```bash
npm run dev        # Vite dev server (hot reload)
npm run build      # Production build; also your type-check (no separate tsc or lint)
npm run preview    # Serve production build locally
```

There are **no** test, lint, or formatter scripts. Treat `npm run build` as the only pre-commit gate — it runs the full Vite build + TypeScript type check. Fix TS errors from the build output. `vue-tsc` is installed but not wired into `package.json`.

### Deployment
- `vite build` outputs to **`docs/`** (not `dist/`), base path `/superposition-explainer/`
- `.gitlab-ci.yml` copies `docs/` → `public/` for GitLab Pages
- Branch `gh-pages` is used for GitHub Pages (check `.gitlab-ci.yml` for CI mirror)

## Architecture

```
MainView.vue  ← creates and provides all services
├── AutoencoderView        ← 13-column CSS grid, SVG connections, input sliders
├── embeddingView/         ← Three.js WebGL scene (1D/2D/3D), ArrowHelper vectors
│   ├── EmbeddingView.vue  ← container: canvas + legend + controls
│   ├── useEmbeddingScene  ← scene init, camera, OrbitControls, animation loop
│   ├── useOverlayManager  ← BiasPointOverlay, ReluRegionOverlay
│   ├── constants.ts       ← all Three.js geometry/color/render constants
│   └── sceneHelpers.ts    ← axis, label, arrow geometry factories
├── WeightView             ← W matrix + bias heatmap, column hover highlight
├── TrainingConfigView     ← training parameter form
├── TrainingStatsView      ← SVG line charts (loss, feature presence, min angle)
├── TrainingActionButtons  ← start/stop/reset buttons
├── SettingsModal          ✅ settings overlay
├── BlogPost               ← scroll-driven blog post with interactive tasks
│   ├── BasesSection       ← blog segment: basis visualization
│   ├── AutoencoderSection ← blog segment: autoencoder walkthrough
│   ├── CoordinateViz      ← per-section embedding visualizations
│   ├── MappingDiagram     ← encoder/decoder mapping visualization
│   └── tasks/             ← step-by-step task definitions
└── InputValue, ActivationIcons, AppLogo  ← shared sub-components
```

**Services** (all in `src/services/`):
- `AutoencoderService` — training loop, weights, Adam optimizer, history. Injected as `'autoencoderService'`.
- `SelectionService` — cross-component selection state. Injected as `'selectionService'`.
- `SettingsService` — persistent settings (e.g. show/hide embedding point).
- `VizService` — visualization helpers for blog post tasks.
- `BasesService` — basis vector state for the BasesSection.

All services use factory functions (`createXxx()`) and Vue `provide`/`inject`. Never pass services as props.

### Blog post (`BlogPost.vue`)
The blog post is a scroll-driven interactive article. Each section has its own autoencoder instance, configuration, and task system. The `tasks/` directory contains step definitions. **Blog section autoencoders are independent** of the main `AutoencoderService` — they have their own service instances managed by the section component.

## Key conventions

### AutoencoderView grid
**13 named columns**, `column-gap: 0`. Spacer columns carry visual gaps:
```
col: features → gap-s → input neurons → gap-comp → gap-conn-l → embedding → gap-conn-r → act-icons → gap-act → output neurons → gap-s → outputs
```
`--row-height: 72px`. SVG connections are an absolutely-positioned overlay redrawn via `ResizeObserver` + deep watcher on `W`.

### Service API
`AutoencoderService` exposes reactive `ref` fields: `W`, `b`, `currentInput`, `currentEmbedding`, `currentOutput`, `currentError`, `loss`, `step`, `isTraining`.
- `W[k][j]`: k = embedding row (0…m−1), j = input column (0…n−1)
- `setInputDim(n)` / `setEmbeddingDim(m)` — each calls `stopTraining()` + `initialize()`
- `updateConfig(partial)` — calls `resetTraining()` first
- `AeSnapshot` serializes full state for experiment transitions

### Color system
- Global tokens: `src/style.css` → CSS custom properties on `:root`
- Value→color interpolation: `src/utils/featureColor.ts` — `valColorRgb()`, `neuronColorRgb()`, `neuronBorderColorRgb()`
- Feature gradient (orange→pink→blue): `GRADIENT_STOPS` in `featureColor.ts`
- `featureColorCSS()`, `featureColor()`, `featureColorHex()`, `featureColorRGB()` for per-feature colors
- Three.js scene colors: `src/components/embeddingView/constants.ts` (cannot read CSS vars)
- Full design token map: `DESIGN_OVERVIEW.md` (authoritative when changing visual tokens)

### Three.js patterns
- Feature vectors = columns of W: `vᵢ = W[:, i]`
- Hover via invisible `CylinderGeometry` hit meshes + `Raycaster` in animation loop — not DOM events
- On dimension change: full scene rebuild (`init()`). On weight change: `needsVecUpdate` flag, applied next frame.
- `featureColorRGB()` returns linear-light values; use for `THREE.Color`.

### Vue patterns
- `<script setup lang="ts">` everywhere
- Derived → `computed()`, DOM element arrays → `:ref="(el) => arr[i] = el"`
- `reactive()` only for config in service; everything else `ref()`. Config exposed as `readonly()`.

### KaTeX / math
- `renderLatexHtml()` / `createLatexElement()` in `src/utils/latex.ts`
- Font size per component via `:deep(.katex)` in scoped styles
- Already registered as Vue plugin in `main.ts` via `vue3-katex`

## Files of record

| Topic | File |
|---|---|
| Design tokens, color system, layout constants | `DESIGN_OVERVIEW.md` |
| Architecture & service API | `.github/copilot-instructions.md` |
| Component spec | `app-specification.md` |
| Experiment math (data gen, loss, metrics) | `EXPERIMENT.md` |
| Blog post draft | `blog-entry-draft.md` |

## Notes

- TypeScript strict mode on with `noUnusedLocals` / `noUnusedParameters`. Imports must be used.
- `test_ground/`, `dist/`, `blog_entry_draft/` are git-ignored.
- `mathjax-full` is in devDependencies but unused — `katex` is the active renderer.
- No Tailwind installed despite Tailwind class references in DESIGN_OVERVIEW.md — it maps CSS vars to their Tailwind-equivalent colors for documentation only.
