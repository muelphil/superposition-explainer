import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { DashedCylinders } from '../sceneHelpers'

const RADIUS    = 0.004
const DASH_SIZE = 0.04
const GAP_SIZE  = 0.04
const COLOR     = 0xef4444   // red-500
const OPACITY   = 0.8
const RENDER_ORDER = 10

/**
 * Red dashed cylinders from each interfering vector's tip to its perpendicular
 * projection onto the ReLU surface.
 *
 * A vector j ≠ i "interferes" when its tip is in the active half-space
 * (past the ReLU boundary) — i.e. `dot(W[:,j], W[:,i]) / ||W[:,i]|| > -b_i / ||W[:,i]||`.
 *
 * The interference line shows how far each vector penetrates past the boundary.
 * Visualization is purely geometric (input-independent).
 *
 * Composable: use with BiasPointOverlay + ReluRegionOverlay.
 */
export class InterferenceLinesOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private lines: DashedCylinders[] = []
  private mats:  THREE.MeshBasicMaterial[] = []

  private readonly _proj = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    // Pre-allocate one DashedCylinders per possible interfering vector
    const n = ctx.svc.config.inputDim
    for (let j = 0; j < n; j++) {
      if (j === this.featureIdx) {
        // Placeholder — won't be used
        this.lines.push(null!)
        this.mats.push(null!)
        continue
      }
      const mat = new THREE.MeshBasicMaterial({
        color:       COLOR,
        transparent: true,
        opacity:     OPACITY,
        depthTest:   false,
      })
      const dashed = new DashedCylinders(RADIUS, DASH_SIZE, GAP_SIZE, mat, RENDER_ORDER)
      ctx.scene.add(dashed.group)
      this.lines.push(dashed)
      this.mats.push(mat)
    }

    this.update()
  }

  tick() { this.update() }

  dispose() {
    for (let j = 0; j < this.lines.length; j++) {
      if (j === this.featureIdx) continue
      this.ctx.scene.remove(this.lines[j].group)
      this.lines[j].dispose()
      this.mats[j].dispose()
    }
    this.lines = []
    this.mats  = []
  }

  private update() {
    const vecI = this.ctx.featureVec(this.featureIdx)
    const lenSq = vecI.lengthSq()

    if (lenSq < 1e-8) {
      this.hideAll()
      return
    }

    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0
    const vecINorm = vecI.clone().normalize()
    const len = Math.sqrt(lenSq)

    // ReLU boundary threshold along vecI direction (signed distance from origin)
    // The boundary is where dot(point, vecI) = -bi, which along the unit
    // direction is at signed distance t_boundary = -bi / ||vecI||
    const tBoundary = -bi / len

    const n = this.ctx.svc.config.inputDim
    for (let j = 0; j < n; j++) {
      if (j === this.featureIdx) continue

      const vecJ = this.ctx.featureVec(j)
      // Projection of vecJ tip along vecI direction
      const tJ = vecJ.dot(vecINorm)

      if (tJ > tBoundary) {
        // Vector j is in the active half-space → show interference line
        // from tip of vecJ to the closest point on the ReLU surface
        this._proj.copy(vecJ)
          .addScaledVector(vecINorm, -(tJ - tBoundary))  // project to surface

        this.lines[j].update(vecJ, this._proj)
      } else {
        // Not interfering — hide
        this.lines[j].update(vecJ, vecJ)  // zero-length → hides
      }
    }
  }

  private hideAll() {
    for (let j = 0; j < this.lines.length; j++) {
      if (j === this.featureIdx) continue
      this.lines[j].update(new THREE.Vector3(), new THREE.Vector3())
    }
  }
}
