import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneCtx, SceneOverlay } from '../types'
import { BIAS_LABEL_COLOR } from '../constants'
import { createLatexElement } from '../../../utils/latex'

const LABEL_OFFSET = 0.12
const LABEL_FONT_SIZE = '0.92rem'

/**
 * LaTeX label beside the bias threshold point.
 *
 * Label is either `b_{n}` (indexed) or `b` (unindexed).
 *
 * Composable: use with BiasDotOverlay.
 */
export class BiasLabelOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private label!: CSS2DObject
  private readonly _biasPos = new THREE.Vector3()

  constructor(
    private readonly featureIdx: number,
    private readonly showIndex = true,
  ) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx
    const formula = this.showIndex ? `b_{${this.featureIdx + 1}}` : 'b'
    const el = createLatexElement(formula, {
      color: BIAS_LABEL_COLOR,
      fontSize: LABEL_FONT_SIZE,
      pointerEvents: 'none',
      userSelect: 'none',
    })
    this.label = new CSS2DObject(el)
    ctx.scene.add(this.label)
    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.label)
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    this.label.visible = lenSq > 1e-8
    if (lenSq < 1e-8) return

    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)

    const dim = this.ctx.svc.config.embeddingDim
    const perp = dim === 1
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(-vec.y, vec.x, 0).normalize()
    if (perp.length() < 1e-6) perp.set(0, 0, 1).cross(vec).normalize()
    this.label.position.copy(this._biasPos).addScaledVector(perp, LABEL_OFFSET).z += 0.01
  }
}
