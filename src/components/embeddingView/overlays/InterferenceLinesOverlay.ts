import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { DashedCylinders } from '../sceneHelpers'
import { ERROR_LINE_COLOR_LIGHT, ERROR_LINE_COLOR_DARK, ERROR_LINE_OPACITY, ERROR_LINE_RENDER_ORDER,
  ERROR_DASH_SIZE, ERROR_GAP_SIZE, ARROW_SHAFT_RADIUS } from '../constants'
import { isDark } from '../../../services/SettingsService'

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
  private dashedLines: (DashedCylinders | null)[] = []
  private mat!: THREE.MeshBasicMaterial

  private readonly _proj = new THREE.Vector3()
  private readonly _from = new THREE.Vector3()
  private readonly _to   = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    const n = ctx.svc.config.inputDim
    this.mat = new THREE.MeshBasicMaterial({
      color:       isDark.value ? ERROR_LINE_COLOR_DARK : ERROR_LINE_COLOR_LIGHT,
      transparent: true,
      opacity:     ERROR_LINE_OPACITY,
      depthTest:   false,
    })

    for (let j = 0; j < n; j++) {
      if (j === this.featureIdx) {
        this.dashedLines.push(null)
        continue
      }
      const dc = new DashedCylinders(ARROW_SHAFT_RADIUS, ERROR_DASH_SIZE, ERROR_GAP_SIZE, this.mat, ERROR_LINE_RENDER_ORDER)
      dc.group.visible = false
      ctx.scene.add(dc.group)
      this.dashedLines.push(dc)
    }

    this.update()
  }

  tick() {
    this.mat.color.setHex(isDark.value ? ERROR_LINE_COLOR_DARK : ERROR_LINE_COLOR_LIGHT)
    this.update()
  }

  dispose() {
    for (let j = 0; j < this.dashedLines.length; j++) {
      if (!this.dashedLines[j]) continue
      this.ctx.scene.remove(this.dashedLines[j]!.group)
      this.dashedLines[j]!.dispose()
    }
    this.dashedLines = []
    this.mat.dispose()
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
      const dc = this.dashedLines[j]
      if (!dc) continue

      const vecJ = this.ctx.featureVec(j)
      const tJ = vecJ.dot(vecINorm)

      if (tJ > tBoundary) {
        this._proj.copy(vecJ).addScaledVector(vecINorm, -(tJ - tBoundary))
        dc.update(vecJ, this._proj)
        dc.group.visible = true
      } else {
        dc.group.visible = false
      }
    }
  }

  private hideAll() {
    for (let j = 0; j < this.dashedLines.length; j++) {
      if (this.dashedLines[j]) this.dashedLines[j]!.group.visible = false
    }
  }
}
