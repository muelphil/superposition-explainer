import type * as THREE from 'three'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import type { SelectionServiceType } from '../../services/SelectionService'

export interface VecVis {
  group:   THREE.Group
  shaft:   THREE.Mesh
  head:    THREE.Mesh
  hitMesh: THREE.Mesh
  color:   THREE.Color
  idx:     number
}

/**
 * Live references to the Three.js scene and application services.
 * Passed to overlay build() calls so overlays can add objects and query state.
 */
export interface SceneCtx {
  scene:         THREE.Scene
  camera:        THREE.PerspectiveCamera
  labelRenderer: CSS2DRenderer
  svc:           AutoencoderServiceType
  selSvc:        SelectionServiceType
  /** Current weight column i as a Vector3 in embedding space. */
  featureVec:    (i: number) => THREE.Vector3
  /** Access to visual vector representations (for overlays that need to modify them). */
  getVecs:       () => VecVis[]
}

/**
 * An ephemeral scene object — exists only while a specific hover/selection is active.
 *
 * Lifecycle:
 *   build(ctx)  — called once when the overlay becomes active; add geometry to ctx.scene
 *   tick()      — called every render frame while active; update from reactive service state
 *   dispose()   — called when hover/selection changes; remove from scene + free GPU resources
 */
export interface SceneOverlay {
  build(ctx: SceneCtx): void
  tick(): void
  dispose(): void
}
