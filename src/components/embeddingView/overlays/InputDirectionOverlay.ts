import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { featureColorRGB } from '../../../utils/featureColor'

const LINE_OPACITY = 0.5
const DASH_SIZE    = 0.04
const GAP_SIZE     = 0.04
const LINE_WIDTH   = 3
const EXTENT       = 20         // long enough to always cover visible area

const DOT_COLOR    = 0x6b7280   // grey-500
const DOT_RADIUS   = 0.028
const DOT_SEGMENTS = 10

/**
 * Dashed grey ray showing where additional activation of a hovered input's
 * feature would move the embedding point.
 *
 * Anchor = h − W[:, idx] · x[idx]  (the embedding if this feature were zero).
 * A small grey dot marks the anchor, and a dashed line extends from there in
 * the positive feature-vector direction (W[:, idx]).
 *
 * Only triggered for 'input' hover (not 'feature').
 */
export class InputDirectionOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private line!: THREE.Line
  private lineMat!:  THREE.LineDashedMaterial
  private lineGeom!: THREE.BufferGeometry
  private dot!:  THREE.Mesh
  private dotMat!: THREE.MeshBasicMaterial

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    // ── Dashed line (colored to match the feature vector) ─────
    const [cr, cg, cb] = featureColorRGB(this.featureIdx, ctx.svc.config.inputDim)
    const featureColor = new THREE.Color(cr, cg, cb)

    this.lineMat = new THREE.LineDashedMaterial({
      color:       featureColor,
      opacity:     LINE_OPACITY,
      transparent: true,
      dashSize:    DASH_SIZE,
      gapSize:     GAP_SIZE,
      linewidth:   LINE_WIDTH,
    })

    this.lineGeom = new THREE.BufferGeometry()
    this.lineGeom.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0,0,0], 3))

    this.line = new THREE.Line(this.lineGeom, this.lineMat)
    this.line.renderOrder = -1
    ctx.scene.add(this.line)

    // ── Anchor dot ─────────────────────────────────────────────
    this.dotMat = new THREE.MeshBasicMaterial({ color: DOT_COLOR })
    this.dot = new THREE.Mesh(
      new THREE.SphereGeometry(DOT_RADIUS, DOT_SEGMENTS, DOT_SEGMENTS),
      this.dotMat,
    )
    this.dot.renderOrder = -1
    ctx.scene.add(this.dot)

    this.update()
  }

  tick() {
    this.update()
  }

  dispose() {
    this.ctx.scene.remove(this.line)
    this.lineGeom.dispose()
    this.lineMat.dispose()
    this.ctx.scene.remove(this.dot)
    this.dot.geometry.dispose()
    this.dotMat.dispose()
  }

  private update() {
    const dir = this.ctx.featureVec(this.featureIdx)
    const len = dir.length()
    if (len < 1e-6) {
      this.line.visible = false
      this.dot.visible  = false
      return
    }
    this.line.visible = true
    this.dot.visible  = true

    const dirNorm = dir.clone().normalize()

    // Anchor = h − W[:, idx] · x[idx]  (embedding with this feature zeroed out)
    const h   = this.ctx.svc.currentEmbedding.value
    const dim = this.ctx.svc.config.embeddingDim
    const embPoint = new THREE.Vector3(
      dim >= 1 ? (h[0] ?? 0) : 0,
      dim >= 2 ? (h[1] ?? 0) : 0,
      dim >= 3 ? (h[2] ?? 0) : 0,
    )
    const xVal = this.ctx.svc.currentInput.value[this.featureIdx] ?? 0
    const anchor = embPoint.clone().sub(dir.clone().multiplyScalar(xVal))

    // Position the anchor dot
    this.dot.position.copy(anchor)

    // Line: from anchor in the positive feature direction
    const end = anchor.clone().add(dirNorm.multiplyScalar(EXTENT))
    const pos = this.lineGeom.getAttribute('position') as THREE.BufferAttribute
    pos.setXYZ(0, anchor.x, anchor.y, anchor.z)
    pos.setXYZ(1, end.x,    end.y,    end.z)
    pos.needsUpdate = true

    this.line.computeLineDistances()
  }
}
