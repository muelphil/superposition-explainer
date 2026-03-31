import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { setCylinderEnds } from '../sceneHelpers'

const RADIUS    = 0.008
const COLOR     = 0xef4444   // red-500
const OPACITY   = 0.8
const RENDER_ORDER = 10

/**
 * Red continuous cylinders from each interfering vector's tip to its perpendicular
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
  private cylinders: THREE.Mesh[] = []
  private geoms:     THREE.CylinderGeometry[] = []
  private mats:      THREE.MeshBasicMaterial[] = []

  private readonly _proj = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    const n = ctx.svc.config.inputDim
    for (let j = 0; j < n; j++) {
      if (j === this.featureIdx) {
        this.cylinders.push(null!)
        this.geoms.push(null!)
        this.mats.push(null!)
        continue
      }
      const mat = new THREE.MeshBasicMaterial({
        color:       COLOR,
        transparent: true,
        opacity:     OPACITY,
        depthTest:   false,
      })
      const geom = new THREE.CylinderGeometry(RADIUS, RADIUS, 1, 6)
      const mesh = new THREE.Mesh(geom, mat)
      mesh.renderOrder = RENDER_ORDER
      mesh.visible = false
      ctx.scene.add(mesh)
      this.cylinders.push(mesh)
      this.geoms.push(geom)
      this.mats.push(mat)
    }

    this.update()
  }

  tick() { this.update() }

  dispose() {
    for (let j = 0; j < this.cylinders.length; j++) {
      if (j === this.featureIdx) continue
      this.ctx.scene.remove(this.cylinders[j])
      this.geoms[j].dispose()
      this.mats[j].dispose()
    }
    this.cylinders = []
    this.geoms = []
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

    const tBoundary = -bi / len

    const n = this.ctx.svc.config.inputDim
    for (let j = 0; j < n; j++) {
      if (j === this.featureIdx) continue

      const vecJ = this.ctx.featureVec(j)
      const tJ = vecJ.dot(vecINorm)

      if (tJ > tBoundary) {
        this._proj.copy(vecJ)
          .addScaledVector(vecINorm, -(tJ - tBoundary))

        setCylinderEnds(this.cylinders[j], vecJ, this._proj)
        this.cylinders[j].visible = true
      } else {
        this.cylinders[j].visible = false
      }
    }
  }

  private hideAll() {
    for (let j = 0; j < this.cylinders.length; j++) {
      if (j === this.featureIdx) continue
      this.cylinders[j].visible = false
    }
  }
}
