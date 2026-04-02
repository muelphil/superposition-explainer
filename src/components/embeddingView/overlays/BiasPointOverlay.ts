import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneCtx, SceneOverlay } from '../types'
import { ORIGIN_RADIUS, BIAS_DOT_COLOR, BIAS_LABEL_COLOR } from '../constants'
import { createLatexElement } from '../../../utils/latex'

const DOT_SEGMENTS = 12
const LABEL_OFFSET = 0.12   // perpendicular offset for the label

/**
 * Dot on the feature vector at the ReLU threshold (bias) point, with a
 * LaTeX label `b_n` beside it.
 *
 * The bias point is where the ReLU boundary hyperplane (W[:,i]ᵀ · h = −bᵢ)
 * intersects the W[:,i] direction line:
 *
 *   p = (−bᵢ / ||W[:,i]||²) · W[:,i]
 *
 * The ||²  divisor is correct even when ||W[:,i]|| ≠ 1. Proof:
 *   W[:,i]ᵀ · p = W[:,i]ᵀ · (−bᵢ/||W[:,i]||²) · W[:,i] = −bᵢ · ||W[:,i]||²/||W[:,i]||² = −bᵢ  ✓
 *
 * Dividing by just ||W[:,i]|| instead would give an incorrect point at
 * W[:,i]ᵀ · p′ = −bᵢ · ||W[:,i]||, which ≠ −bᵢ unless ||W[:,i]|| = 1.
 *
 * Composable: use with ReluRegionOverlay + InterferenceLinesOverlay.
 */
export class BiasPointOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private dot!: THREE.Mesh
  private dotMat!: THREE.MeshBasicMaterial
  private label!: CSS2DObject

  private readonly _biasPos = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    // Dot color: dark grey for visibility against any vector color
    this.dotMat = new THREE.MeshBasicMaterial({
      color: BIAS_DOT_COLOR,
      depthTest: false,
    })
    this.dot = new THREE.Mesh(
      new THREE.SphereGeometry(ORIGIN_RADIUS, DOT_SEGMENTS, DOT_SEGMENTS),
      this.dotMat,
    )
    this.dot.renderOrder = 15
    ctx.scene.add(this.dot)

    // LaTeX label  b_{n}
    const formula = `b_{${this.featureIdx + 1}}`
    const el = createLatexElement(formula, {
      color: BIAS_LABEL_COLOR,
      fontSize: '0.72rem',
      pointerEvents: 'none',
      userSelect: 'none',
    })
    this.label = new CSS2DObject(el)
    ctx.scene.add(this.label)

    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.dot)
    this.dot.geometry.dispose()
    this.dotMat.dispose()
    this.ctx.scene.remove(this.label)
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    if (lenSq < 1e-8) {
      this.dot.visible   = false
      this.label.visible = false
      return
    }
    this.dot.visible   = true
    this.label.visible = true

    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0

    // Bias point: p = (-b_i / ||W[:,i]||²) · W[:,i]
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)
    this.dot.position.copy(this._biasPos)

    // Position label beside the dot, offset perpendicular to vector
    const dim = this.ctx.svc.config.embeddingDim
    const perp = dim === 1
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(-vec.y, vec.x, 0).normalize()
    if (perp.length() < 1e-6) perp.set(0, 0, 1).cross(vec).normalize()
    this.label.position.copy(this._biasPos).addScaledVector(perp, LABEL_OFFSET)
  }
}
