import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneCtx, SceneOverlay } from '../types'
import { ORIGIN_RADIUS, BIAS_DOT_COLOR, BIAS_LABEL_COLOR, ARROW_SHAFT_RADIUS,
  ERROR_LINE_COLOR, ERROR_DASH_SIZE, ERROR_GAP_SIZE, ERROR_LINE_OPACITY, ERROR_LINE_RENDER_ORDER } from '../constants'
import { createLatexElement } from '../../../utils/latex'
import { DashedCylinders } from '../sceneHelpers'

const DOT_SEGMENTS = 12
const LABEL_OFFSET = 0.12   // perpendicular offset for the label

/**
 * Dot on the feature vector at the ReLU threshold (bias) point, with a
 * LaTeX label `b` beside it and a red error segment from origin to the bias point.
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
  private errorDashes!: DashedCylinders

  private readonly _biasPos = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    // Dot color: dark grey for visibility against any vector color
    // Must be transparent to render in same bucket as error line (renderOrder controls draw order)
    this.dotMat = new THREE.MeshBasicMaterial({
      color: BIAS_DOT_COLOR,
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

    // Red dashed error line from origin to bias point
    const dashMat = new THREE.MeshBasicMaterial({
      color: ERROR_LINE_COLOR,
      transparent: true,
      opacity: ERROR_LINE_OPACITY,
      depthTest: false,
    })
    this.errorDashes = new DashedCylinders(
      ARROW_SHAFT_RADIUS,
      ERROR_DASH_SIZE,
      ERROR_GAP_SIZE,
      dashMat,
      ERROR_LINE_RENDER_ORDER,
    )
    ctx.scene.add(this.errorDashes.group)

    // LaTeX label  b
    const el = createLatexElement('b', {
      color: BIAS_LABEL_COLOR,
      fontSize: '0.92rem',
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

    this.ctx.scene.remove(this.errorDashes.group)
    this.errorDashes.dispose()

    this.ctx.scene.remove(this.label)
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    if (lenSq < 1e-8) {
      this.dot.visible   = false
      this.label.visible = false
      this.errorDashes.group.visible = false
      return
    }
    this.dot.visible   = true
    this.label.visible = true
    this.errorDashes.group.visible = true

    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0

    // Bias point: p = (-b_i / ||W[:,i]||²) · W[:,i]
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)
    this.dot.position.copy(this._biasPos).z += 0.01

    // Red dashed error line from origin to bias point
    const origin = new THREE.Vector3(0, 0, 0)
    this.errorDashes.update(origin, this._biasPos)

    // Position label beside the dot, offset perpendicular to vector
    const dim = this.ctx.svc.config.embeddingDim
    const perp = dim === 1
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(-vec.y, vec.x, 0).normalize()
    if (perp.length() < 1e-6) perp.set(0, 0, 1).cross(vec).normalize()
    this.label.position.copy(this._biasPos).addScaledVector(perp, LABEL_OFFSET).z += 0.01
  }
}
