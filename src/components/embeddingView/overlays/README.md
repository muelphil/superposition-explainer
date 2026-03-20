# Embedding View Overlays

Overlay implementations live here. Each file exports one class implementing `SceneOverlay`.

See `../useOverlayManager.ts` for the full developer guide and lifecycle documentation.

## Planned overlays

| File | Trigger | Visual |
|------|---------|--------|
| `FeatureProjectionOverlay.ts` | feature / input hover | Dotted grey lines projecting the feature vector onto each embedding axis |
| `BiasOffsetOverlay.ts` | bias hover / select | Colored offset indicator along the output axis |
| `InterferenceOverlay.ts` | feature selected + another feature hovered | Red dotted line between the two vectors |
| `ReluSurfaceOverlay.ts` | feature / output select | Semi-transparent relu halfspace surface |
