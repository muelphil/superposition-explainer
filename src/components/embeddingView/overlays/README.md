# Embedding View Overlays

Overlay implementations live here. Each file exports one class implementing `SceneOverlay`.

See `../useOverlayManager.ts` for the full developer guide and lifecycle documentation.

## Architecture

**Resolver:** The `resolveOverlays(sel, hov)` function in `../useOverlayManager.ts` is the
single decision point that maps the current selection + hover target to a list of overlay
instances. Selection takes precedence over hover. When hover/selection changes, old overlays
are disposed and new ones are built in-place.

**Lifecycle:** `build(ctx)` → add objects to scene. `tick()` → called every render frame
to update positions from reactive state (W, currentEmbedding, etc.). `dispose()` → remove
from scene + free GPU resources.

**Permanent visual state** (vector dimming, axis highlighting) is handled separately in
`applyVisualState()` inside `useEmbeddingScene.ts` — overlays only manage their own
ephemeral scene objects.

## Implemented Overlays

| File | Trigger | Visual |
|------|---------|--------|
| `InputDirectionOverlay.ts` | input hover or select | Small grey dot at h − W[:, idx]·x[idx] (embedding with this feature zeroed), plus a dashed grey ray from that dot in the positive feature-vector direction |
| `AxisGradientOverlay.ts` | emb axis hover or select | Full-screen blue→white→orange gradient backdrop aligned to the hovered axis |
| `ProjectionLineOverlay.ts` | feature-kind ↔ emb cross-case | Solid colored cylinder from origin along the axis to the projection value (orange if positive, blue if negative) |
| `DropLineOverlay.ts` | feature-kind ↔ emb cross-case | Dashed grey cylinder line from the feature vector's arrow tip to the projection point on the axis |
| `BiasPointOverlay.ts` | output hover or select | Dot at ReLU threshold point on the feature vector + LaTeX label `b_n` |
| `ReluRegionOverlay.ts` | output hover or select | Perpendicular line through bias point + shader-based grey half-space on the inactive (ReLU=0) side + label |
| `InterferenceLinesOverlay.ts` | output hover or select | Red dashed cylinders from interfering vectors' tips to their projection on the ReLU surface |

**Composability:** Overlays are small focused units composed via `resolveOverlays`.
- Projection: `ProjectionLineOverlay` + `DropLineOverlay`
- Output decoding: `BiasPointOverlay` + `ReluRegionOverlay` + `InterferenceLinesOverlay`

## Planned Overlays

| File | Trigger | Visual |
|------|---------|--------|
| `FeatureProjectionOverlay.ts` | feature / input hover | Dotted grey lines projecting the feature vector onto each embedding axis |
