import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneCtx, SceneOverlay } from '../types'
import { setCylinderEnds } from '../sceneHelpers'
import { createLatexElement } from '../../../utils/latex'
import {
  RELU_REGION_COLOR_LIGHT, RELU_REGION_COLOR_DARK,
  RELU_LABEL_COLOR_LIGHT, RELU_LABEL_COLOR_DARK,
  RELU_LABEL_BORDER_COLOR_LIGHT, RELU_LABEL_BORDER_COLOR_DARK,
  RELU_LABEL_BG_LIGHT, RELU_LABEL_BG_DARK,
} from '../constants'
import { isDark } from '../../../services/SettingsService'

// ── Constants ─────────────────────────────────────────────────────────────────
const REGION_OPACITY_2D = 0.7
const REGION_OPACITY_3D = 0.85
const SURFACE_OPACITY = 0.5
const SURFACE_RADIUS  = 0.003
const SURFACE_EXTENT  = 20            // large enough to always span the viewport (2D)
const LABEL_OFFSET    = 0.45          // how far into the inactive region for the label
const REGION_DEPTH    = 10            // how far the inactive-region surface extends (2D)
const DISC_RADIUS     = 1.2           // radius of the circular ReLU disc in 3D
const DISC_SEGMENTS   = 48            // number of segments for the disc circle

// ── Radial fade texture for 3D disc (opaque center → transparent edge) ───────

let _fadeTextureLight: THREE.CanvasTexture | null = null
let _fadeTextureDark: THREE.CanvasTexture | null = null

function getFadeTexture(): THREE.CanvasTexture {
  const textures = isDark.value ? _fadeTextureDark : _fadeTextureLight
  const cache = isDark.value ? '_fadeTextureDark' : '_fadeTextureLight'
  if (textures) return textures
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  const discOpaque = isDark.value ? 'rgba(30,32,48,1)' : 'rgba(255,255,255,1)'
  const discTransparent = isDark.value ? 'rgba(30,32,48,0)' : 'rgba(255,255,255,0)'
  grad.addColorStop(0,    discOpaque)
  grad.addColorStop(0.8,  discOpaque)
  grad.addColorStop(1,    discTransparent)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  if (cache === '_fadeTextureLight') _fadeTextureLight = tex
  else (_fadeTextureDark = tex)
  return tex
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
  private labelInner!: HTMLElement  // inner element for rotation (CSS2DRenderer controls outer)

  private readonly _biasPos = new THREE.Vector3()
  private readonly _perp    = new THREE.Vector3()
  private readonly _perp2   = new THREE.Vector3() // second perp for 3D

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx
    const dark = isDark.value
    const regionColor = dark ? RELU_REGION_COLOR_DARK : RELU_REGION_COLOR_LIGHT
    const labelColor = dark ? RELU_LABEL_COLOR_DARK : RELU_LABEL_COLOR_LIGHT
    const labelBorderColor = dark ? RELU_LABEL_BORDER_COLOR_DARK : RELU_LABEL_BORDER_COLOR_LIGHT
    const labelBg = dark ? RELU_LABEL_BG_DARK : RELU_LABEL_BG_LIGHT
    const is3D = ctx.svc.config.embeddingDim >= 3

    // ── Inactive-region surface ────────────────────────────────
    this.regionMat = new THREE.MeshBasicMaterial({
      color:       regionColor,
      opacity:     is3D ? REGION_OPACITY_3D : REGION_OPACITY_2D,
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
      side:        THREE.DoubleSide,
      ...(is3D ? { map: getFadeTexture() } : {}),
    })
    this.regionGeom = new THREE.BufferGeometry()
    this.regionMesh = new THREE.Mesh(this.regionGeom, this.regionMat)
    this.regionMesh.frustumCulled = false
    this.regionMesh.renderOrder   = -100
    ctx.scene.add(this.regionMesh)

    // ── Perpendicular surface (thin cylinder) ──────────────────
    this.surfaceMat = new THREE.MeshBasicMaterial({
      color:       regionColor,
      opacity:     SURFACE_OPACITY,
      transparent: true,
      depthTest:   false,
    })
    this.surfaceGeom = new THREE.CylinderGeometry(SURFACE_RADIUS, SURFACE_RADIUS, 1, 6)
    this.surface = new THREE.Mesh(this.surfaceGeom, this.surfaceMat)
    this.surface.renderOrder = 5
    ctx.scene.add(this.surface)

    // ── Label ──────────────────────────────────────────────────
    // Wrap in a container so CSS2DRenderer controls the outer transform
    // while we rotate the inner element independently.
    const inner = createLatexElement('\\text{Masked by ReLU}', {
      color: labelColor,
      fontSize: '0.68rem',
      pointerEvents: 'none',
      userSelect: 'none',
      border: `1px solid ${labelBorderColor}`,
      borderRadius: '3px',
      padding: '1px 5px',
      background: labelBg,
    })
    const wrapper = document.createElement('div')
    wrapper.style.pointerEvents = 'none'
    wrapper.appendChild(inner)
    this.labelInner = inner
    this.label = new CSS2DObject(wrapper)
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
      this.surface.visible = true
    } else if (dim === 2) {
      const from = this._biasPos.clone().addScaledVector(this._perp, -SURFACE_EXTENT)
      const to   = this._biasPos.clone().addScaledVector(this._perp,  SURFACE_EXTENT)
      setCylinderEnds(this.surface, from, to)
      this.surface.visible = true
    } else {
      // In 3D the disc edge IS the boundary — hide the line
      this.surface.visible = false
    }

    // ── Label position (in the inactive region) ────────────────
    // Centered on the feature vector direction into the inactive region
    this.label.position.copy(this._biasPos)
      .addScaledVector(vecNorm, -LABEL_OFFSET)

    // ── Rotate label parallel to the boundary line ─────────────
    // Only meaningful in 1D/2D where the boundary is a visible line.
    // In 3D the disc is a plane; rotation causes the text to flip confusingly.
    if (dim <= 2) this.rotateLabel()
    else this.labelInner.style.transform = ''
  }

  /**
   * Build the inactive-region surface as a BufferGeometry.
   * - 1D/2D: rectangle from boundary line extending toward origin
   * - 3D: circular disc (radius DISC_RADIUS) centered on the bias point
   */
  private buildRegionSurface(vecNorm: THREE.Vector3, dim: number) {
    const bp = this._biasPos

    if (dim <= 2) {
      const depth = REGION_DEPTH
      const hw = dim === 1 ? 0.06 : SURFACE_EXTENT
      const backOffset = vecNorm.clone().multiplyScalar(-depth)

      const v0 = bp.clone().addScaledVector(this._perp,  hw)
      const v1 = bp.clone().addScaledVector(this._perp, -hw)
      const v2 = v1.clone().add(backOffset)
      const v3 = v0.clone().add(backOffset)

      const positions = new Float32Array([
        v0.x, v0.y, v0.z,  v1.x, v1.y, v1.z,  v2.x, v2.y, v2.z,
        v0.x, v0.y, v0.z,  v2.x, v2.y, v2.z,  v3.x, v3.y, v3.z,
      ])
      this.regionGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      this.regionGeom.setIndex(null)
    } else {
      // 3D: circular disc perpendicular to feature vector, centered on bias
      // with UVs for radial fade texture (center=0.5,0.5, edge on unit circle)
      const p1 = this._perp
      const p2 = this._perp2
      const R  = DISC_RADIUS
      const n  = DISC_SEGMENTS

      // Fan: center vertex + n circumference vertices
      const positions = new Float32Array((1 + n) * 3)
      const uvs       = new Float32Array((1 + n) * 2)

      // Center
      positions[0] = bp.x; positions[1] = bp.y; positions[2] = bp.z
      uvs[0] = 0.5; uvs[1] = 0.5

      for (let i = 0; i < n; i++) {
        const θ = (i / n) * Math.PI * 2
        const c = Math.cos(θ), s = Math.sin(θ)
        const pi = (1 + i) * 3
        positions[pi]     = bp.x + c * R * p1.x + s * R * p2.x
        positions[pi + 1] = bp.y + c * R * p1.y + s * R * p2.y
        positions[pi + 2] = bp.z + c * R * p1.z + s * R * p2.z
        const ui = (1 + i) * 2
        uvs[ui]     = 0.5 + 0.5 * c
        uvs[ui + 1] = 0.5 + 0.5 * s
      }

      const indices: number[] = []
      for (let i = 0; i < n; i++) {
        indices.push(0, 1 + i, 1 + ((i + 1) % n))
      }

      this.regionGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      this.regionGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
      this.regionGeom.setIndex(indices)
    }

    this.regionGeom.computeVertexNormals()
  }

  /**
   * Rotate the "Masked by ReLU" label so its text runs parallel to the
   * perpendicular boundary line.  If the result is upside-down, flip 180°.
   */
  private rotateLabel() {
    const dim = this.ctx.svc.config.embeddingDim

    let angleRad: number
    if (dim === 1) {
      angleRad = 0  // horizontal
    } else {
      // perp = (-y, x, 0) for the feature vector (x, y)
      // Screen-space: x→right, y→up. CSS rotate() is clockwise for positive.
      // atan2(y, x) gives CCW angle; negate for CSS CW convention.
      angleRad = -Math.atan2(this._perp.y, this._perp.x)
    }

    let angleDeg = angleRad * (180 / Math.PI)

    // Flip if upside down (text should be readable left-to-right)
    if (angleDeg > 90)  angleDeg -= 180
    if (angleDeg < -90) angleDeg += 180

    this.labelInner.style.transform = `rotate(${angleDeg}deg)`
  }
}
