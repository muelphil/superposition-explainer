import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { ARROW_SHAFT_RADIUS, ERROR_LINE_COLOR, ERROR_LINE_OPACITY,
  ERROR_LINE_RENDER_ORDER, ERROR_DASH_SIZE, ERROR_GAP_SIZE } from '../constants'
import { DashedCylinders } from '../sceneHelpers'

/**
 * Red dashed line from origin to the bias threshold point.
 *
 * The bias point is p = (−bᵢ / ||W[:,i]||²) · W[:,i].
 * This line shows the error introduced by choosing this bias.
 *
 * Composable: use with BiasDotOverlay + BiasLabelOverlay.
 */
export class BiasErrorLineOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private dashes!: DashedCylinders
  private readonly _biasPos = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx
    const mat = new THREE.MeshBasicMaterial({
      color: ERROR_LINE_COLOR,
      transparent: true,
      opacity: ERROR_LINE_OPACITY,
      depthTest: false,
    })
    this.dashes = new DashedCylinders(
      ARROW_SHAFT_RADIUS,
      ERROR_DASH_SIZE,
      ERROR_GAP_SIZE,
      mat,
      ERROR_LINE_RENDER_ORDER,
    )
    ctx.scene.add(this.dashes.group)
    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.dashes.group)
    this.dashes.dispose()
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    this.dashes.group.visible = lenSq > 1e-8
    if (lenSq < 1e-8) return

    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)
    this.dashes.update(new THREE.Vector3(0, 0, 0), this._biasPos)
  }
}
