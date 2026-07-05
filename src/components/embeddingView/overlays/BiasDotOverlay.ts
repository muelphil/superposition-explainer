import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { ORIGIN_RADIUS, BIAS_DOT_COLOR_LIGHT, BIAS_DOT_COLOR_DARK } from '../constants'
import { isDark } from '../../../services/SettingsService'

const DOT_SEGMENTS = 12

/**
 * Dot on the feature vector at the ReLU threshold (bias) point.
 *
 * p = (−bᵢ / ||W[:,i]||²) · W[:,i]
 *
 * Composable: use with BiasLabelOverlay + BiasErrorLineOverlay.
 */
export class BiasDotOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private dot!: THREE.Mesh
  private dotMat!: THREE.MeshBasicMaterial
  private readonly _biasPos = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx
    this.dotMat = new THREE.MeshBasicMaterial({
      color: isDark.value ? BIAS_DOT_COLOR_DARK : BIAS_DOT_COLOR_LIGHT,
      transparent: true,
      opacity: 1,
      depthTest: false,
    })
    this.dot = new THREE.Mesh(
      new THREE.SphereGeometry(ORIGIN_RADIUS, DOT_SEGMENTS, DOT_SEGMENTS),
      this.dotMat,
    )
    this.dot.renderOrder = 8
    ctx.scene.add(this.dot)
    this.update()
  }

  tick() {
    this.dotMat.color.setHex(isDark.value ? BIAS_DOT_COLOR_DARK : BIAS_DOT_COLOR_LIGHT)
    this.update()
  }

  dispose() {
    this.ctx.scene.remove(this.dot)
    this.dot.geometry.dispose()
    this.dotMat.dispose()
  }

  get biasPosition(): THREE.Vector3 {
    return this._biasPos
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    if (lenSq < 1e-8) {
      this.dot.visible = false
      return
    }
    this.dot.visible = true
    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)
    this.dot.position.copy(this._biasPos).z += 0.01
  }
}
