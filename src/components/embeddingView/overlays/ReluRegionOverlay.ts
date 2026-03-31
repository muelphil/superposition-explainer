import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneCtx, SceneOverlay } from '../types'
import { setCylinderEnds } from '../sceneHelpers'
import { createLatexElement } from '../../../utils/latex'

// ── Constants ─────────────────────────────────────────────────────────────────
const REGION_OPACITY  = 0.12
const REGION_COLOR    = 0x737373      // grey
const SURFACE_COLOR   = 0x9ca3af      // grey-400
const SURFACE_OPACITY = 0.5
const SURFACE_RADIUS  = 0.003
const SURFACE_EXTENT  = 20            // large enough to always span the viewport
const LABEL_OFFSET    = 0.45          // how far into the inactive region for the label
const REGION_DEPTH    = 10            // how far the inactive-region surface extends

// ── Crosshatch texture (helps distinguish boundary in 3D) ────────────────────

let _hatchTexture: THREE.CanvasTexture | null = null

function getHatchTexture(): THREE.CanvasTexture {
  if (_hatchTexture) return _hatchTexture
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  // Diagonal stripes
  ctx.strokeStyle = 'rgba(115, 115, 115, 0.45)'
  ctx.lineWidth = 1.5
  for (let i = -size; i < size * 2; i += 6) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + size, size)
    ctx.stroke()
  }
  _hatchTexture = new THREE.CanvasTexture(canvas)
  _hatchTexture.wrapS = THREE.RepeatWrapping
  _hatchTexture.wrapT = THREE.RepeatWrapping
  _hatchTexture.repeat.set(20, 20)
  return _hatchTexture
}

// ── Overlay class ─────────────────────────────────────────────────────────────

/**
 * Visualizes the ReLU boundary and inactive region for output neuron i.
 *
 * - A thin cylinder perpendicular to W[:,i] through the bias point (boundary)
 * - A 3D surface (BufferGeometry quad) covering the inactive half-space
 * - A text label "Masked by ReLU", rotated parallel to the boundary line
 *
 * Composable: use with BiasPointOverlay + InterferenceLinesOverlay.
 */
export class ReluRegionOverlay implements SceneOverlay {
  private ctx!: SceneCtx

  // 3D surface for the inactive region
  private regionMesh!: THREE.Mesh
  private regionMat!:  THREE.MeshBasicMaterial
  private regionGeom!: THREE.BufferGeometry

  // Perpendicular surface line/cylinder (the boundary)
  private surface!: THREE.Mesh
  private surfaceMat!: THREE.MeshBasicMaterial
  private surfaceGeom!: THREE.CylinderGeometry

  // Label
  private label!: CSS2DObject

  private readonly _biasPos = new THREE.Vector3()
  private readonly _perp    = new THREE.Vector3()
  private readonly _perp2   = new THREE.Vector3() // second perp for 3D

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    // ── Inactive-region surface (3D quad) ──────────────────────
    this.regionMat = new THREE.MeshBasicMaterial({
      color:       REGION_COLOR,
      opacity:     REGION_OPACITY,
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
      side:        THREE.DoubleSide,
      map:         getHatchTexture(),
    })
    this.regionGeom = new THREE.BufferGeometry()
    this.regionMesh = new THREE.Mesh(this.regionGeom, this.regionMat)
    this.regionMesh.frustumCulled = false
    this.regionMesh.renderOrder   = -100
    ctx.scene.add(this.regionMesh)

    // ── Perpendicular surface (thin cylinder) ──────────────────
    this.surfaceMat = new THREE.MeshBasicMaterial({
      color:       SURFACE_COLOR,
      opacity:     SURFACE_OPACITY,
      transparent: true,
      depthTest:   false,
    })
    this.surfaceGeom = new THREE.CylinderGeometry(SURFACE_RADIUS, SURFACE_RADIUS, 1, 6)
    this.surface = new THREE.Mesh(this.surfaceGeom, this.surfaceMat)
    this.surface.renderOrder = 5
    ctx.scene.add(this.surface)

    // ── Label ──────────────────────────────────────────────────
    const el = createLatexElement('\\text{Masked by ReLU}', {
      color: '#9ca3af',
      fontSize: '0.68rem',
      pointerEvents: 'none',
      userSelect: 'none',
      border: '1px solid #d1d5db',
      borderRadius: '3px',
      padding: '1px 5px',
      background: 'rgba(255,255,255,0.85)',
    })
    this.label = new CSS2DObject(el)
    ctx.scene.add(this.label)

    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.regionMesh)
    this.regionGeom.dispose()
    this.regionMat.dispose()

    this.ctx.scene.remove(this.surface)
    this.surfaceGeom.dispose()
    this.surfaceMat.dispose()

    this.ctx.scene.remove(this.label)
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    if (lenSq < 1e-8) {
      this.regionMesh.visible = false
      this.surface.visible    = false
      this.label.visible      = false
      return
    }
    this.regionMesh.visible = true
    this.surface.visible    = true
    this.label.visible      = true

    const bi  = this.ctx.svc.b.value[this.featureIdx] ?? 0
    const dim = this.ctx.svc.config.embeddingDim
    const vecNorm = vec.clone().normalize()

    // Bias point: p = (-b / ||w||²) * w
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)

    // ── Compute perpendicular directions ───────────────────────
    if (dim === 1) {
      this._perp.set(0, 1, 0)
      this._perp2.set(0, 0, 1)
    } else {
      this._perp.set(-vec.y, vec.x, 0).normalize()
      if (this._perp.length() < 1e-6) {
        this._perp.set(0, 0, 1).cross(vec).normalize()
      }
      if (dim >= 3) {
        this._perp2.crossVectors(vecNorm, this._perp).normalize()
      } else {
        this._perp2.set(0, 0, 0)
      }
    }

    // ── 3D surface for the inactive region ─────────────────────
    // Build a quad from the boundary extending into the inactive direction (-vecNorm)
    this.buildRegionSurface(vecNorm, dim)

    // ── Perpendicular surface line (boundary) ──────────────────
    if (dim === 1) {
      const from = this._biasPos.clone().addScaledVector(this._perp, -0.06)
      const to   = this._biasPos.clone().addScaledVector(this._perp,  0.06)
      setCylinderEnds(this.surface, from, to)
    } else {
      const from = this._biasPos.clone().addScaledVector(this._perp, -SURFACE_EXTENT)
      const to   = this._biasPos.clone().addScaledVector(this._perp,  SURFACE_EXTENT)
      setCylinderEnds(this.surface, from, to)
    }

    // ── Label position (in the inactive region) ────────────────
    const labelPerp = dim === 1 ? new THREE.Vector3(0, 1, 0) : this._perp.clone()
    this.label.position.copy(this._biasPos)
      .addScaledVector(vecNorm, -LABEL_OFFSET)
      .addScaledVector(labelPerp, 0.08)

    // ── Rotate label parallel to the boundary line ─────────────
    this.rotateLabel()
  }

  /**
   * Build the inactive-region surface as a BufferGeometry quad.
   * - 2D: rectangle from boundary line extending toward origin
   * - 3D: large square perpendicular to vec at the boundary, extending toward origin
   * - 1D: thin rectangle
   */
  private buildRegionSurface(vecNorm: THREE.Vector3, dim: number) {
    const bp = this._biasPos
    const depth = REGION_DEPTH
    const hw = dim === 1 ? 0.06 : SURFACE_EXTENT  // half-width along perp

    // Edge at the boundary (0 depth), back edge deep into inactive region
    const edgeNear = bp      // at the boundary
    const backOffset = vecNorm.clone().multiplyScalar(-depth) // into inactive region

    let positions: Float32Array
    let uvs: Float32Array

    // UV quad for one face (2 triangles): v0(1,1) v1(0,1) v2(0,0) / v0(1,1) v2(0,0) v3(1,0)
    const FACE_UVS = [1,1, 0,1, 0,0, 1,1, 0,0, 1,0]

    if (dim <= 2) {
      const v0 = edgeNear.clone().addScaledVector(this._perp,  hw)
      const v1 = edgeNear.clone().addScaledVector(this._perp, -hw)
      const v2 = v1.clone().add(backOffset)
      const v3 = v0.clone().add(backOffset)

      positions = new Float32Array([
        v0.x, v0.y, v0.z,  v1.x, v1.y, v1.z,  v2.x, v2.y, v2.z,
        v0.x, v0.y, v0.z,  v2.x, v2.y, v2.z,  v3.x, v3.y, v3.z,
      ])
      uvs = new Float32Array(FACE_UVS)
    } else {
      const p1 = this._perp
      const p2 = this._perp2
      const v0 = edgeNear.clone().addScaledVector(p1,  hw).addScaledVector(p2,  hw)
      const v1 = edgeNear.clone().addScaledVector(p1, -hw).addScaledVector(p2,  hw)
      const v2 = edgeNear.clone().addScaledVector(p1, -hw).addScaledVector(p2, -hw)
      const v3 = edgeNear.clone().addScaledVector(p1,  hw).addScaledVector(p2, -hw)
      const v4 = v0.clone().add(backOffset)
      const v5 = v1.clone().add(backOffset)
      const v6 = v2.clone().add(backOffset)
      const v7 = v3.clone().add(backOffset)

      positions = new Float32Array([
        // Front face
        v0.x,v0.y,v0.z, v1.x,v1.y,v1.z, v2.x,v2.y,v2.z,
        v0.x,v0.y,v0.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z,
        // Back face
        v4.x,v4.y,v4.z, v6.x,v6.y,v6.z, v5.x,v5.y,v5.z,
        v4.x,v4.y,v4.z, v7.x,v7.y,v7.z, v6.x,v6.y,v6.z,
        // Top side
        v0.x,v0.y,v0.z, v1.x,v1.y,v1.z, v5.x,v5.y,v5.z,
        v0.x,v0.y,v0.z, v5.x,v5.y,v5.z, v4.x,v4.y,v4.z,
        // Bottom side
        v3.x,v3.y,v3.z, v2.x,v2.y,v2.z, v6.x,v6.y,v6.z,
        v3.x,v3.y,v3.z, v6.x,v6.y,v6.z, v7.x,v7.y,v7.z,
        // Left side
        v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v6.x,v6.y,v6.z,
        v1.x,v1.y,v1.z, v6.x,v6.y,v6.z, v5.x,v5.y,v5.z,
        // Right side
        v0.x,v0.y,v0.z, v3.x,v3.y,v3.z, v7.x,v7.y,v7.z,
        v0.x,v0.y,v0.z, v7.x,v7.y,v7.z, v4.x,v4.y,v4.z,
      ])
      // Each face gets the same UV quad
      uvs = new Float32Array([
        ...FACE_UVS, ...FACE_UVS, ...FACE_UVS,
        ...FACE_UVS, ...FACE_UVS, ...FACE_UVS,
      ])
    }

    this.regionGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.regionGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    this.regionGeom.computeVertexNormals()
  }

  /**
   * Rotate the "Masked by ReLU" label so its text runs parallel to the
   * perpendicular boundary line.  If the result is upside-down, flip 180°.
   */
  private rotateLabel() {
    const cam = this.ctx.camera

    // Project the boundary direction (perp) to screen space
    const biasSS = this._biasPos.clone().project(cam)
    const perpTip = this._biasPos.clone().add(this._perp).project(cam)

    const dx = perpTip.x - biasSS.x
    const dy = perpTip.y - biasSS.y

    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI)

    // Flip if upside down (text should be readable left-to-right)
    if (angleDeg > 90)  angleDeg -= 180
    if (angleDeg < -90) angleDeg += 180

    this.label.element.style.transform = `rotate(${-angleDeg}deg)`
  }
}
