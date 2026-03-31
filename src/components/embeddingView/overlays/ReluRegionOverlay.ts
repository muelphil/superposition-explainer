import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { SceneCtx, SceneOverlay } from '../types'
import { setCylinderEnds } from '../sceneHelpers'
import { createLatexElement } from '../../../utils/latex'

// ── Constants ─────────────────────────────────────────────────────────────────
const REGION_OPACITY  = 0.12
const REGION_COLOR    = new THREE.Vector3(0.45, 0.45, 0.45) // grey
const SURFACE_COLOR   = 0x9ca3af   // grey-400
const SURFACE_OPACITY = 0.5
const SURFACE_RADIUS  = 0.003
const SURFACE_EXTENT  = 20          // large enough to always span the viewport
const LABEL_OFFSET    = 0.25        // how far into the inactive region for the label

// ── GLSL shaders (similar to AxisGradientOverlay) ─────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    gl_Position = vec4(position.xy, -1.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec2  uBiasNDC;     // projected bias point in NDC
  uniform vec2  uVecDirNDC;   // projected vector direction in NDC (not normalized)
  uniform float uOpacity;
  uniform vec3  uColor;

  varying vec2 vUv;

  void main() {
    float dirLen = length(uVecDirNDC);
    if (dirLen < 0.0001) { discard; }

    vec2 dir = uVecDirNDC / dirLen;
    float d  = dot(vUv - uBiasNDC, dir);   // signed distance along vector direction

    // Inactive region: d < 0 (origin side of bias point)
    float alpha = d < 0.0 ? uOpacity : 0.0;
    gl_FragColor = vec4(uColor, alpha);
  }
`

// ── Overlay class ─────────────────────────────────────────────────────────────

/**
 * Visualizes the ReLU boundary and inactive region for output neuron i.
 *
 * - A line (2D) or large cylinder (any dim) perpendicular to W[:,i] through
 *   the bias point
 * - A semi-transparent grey half-space on the inactive side (shader-based)
 * - A text label "ReLU = 0" in the inactive region
 *
 * Composable: use with BiasPointOverlay + InterferenceLinesOverlay.
 */
export class ReluRegionOverlay implements SceneOverlay {
  private ctx!: SceneCtx

  // Shader quad for grey half-space
  private quad!: THREE.Mesh
  private quadMat!:  THREE.ShaderMaterial
  private quadGeom!: THREE.PlaneGeometry

  // Perpendicular surface line/cylinder
  private surface!: THREE.Mesh
  private surfaceMat!: THREE.MeshBasicMaterial
  private surfaceGeom!: THREE.CylinderGeometry

  // Label
  private label!: CSS2DObject

  private readonly _biasPos = new THREE.Vector3()
  private readonly _perp    = new THREE.Vector3()

  constructor(private readonly featureIdx: number) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx

    // ── Grey half-space (shader quad) ──────────────────────────
    this.quadMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBiasNDC:   { value: new THREE.Vector2(0, 0) },
        uVecDirNDC: { value: new THREE.Vector2(1, 0) },
        uOpacity:   { value: REGION_OPACITY },
        uColor:     { value: REGION_COLOR },
      },
      transparent: true,
      depthTest:  false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.quadGeom = new THREE.PlaneGeometry(2, 2)
    this.quad = new THREE.Mesh(this.quadGeom, this.quadMat)
    this.quad.frustumCulled = false
    this.quad.renderOrder   = -100
    ctx.scene.add(this.quad)

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
    const el = createLatexElement('\\text{ReLU} = 0', {
      color: '#9ca3af',
      fontSize: '0.68rem',
      pointerEvents: 'none',
      userSelect: 'none',
    })
    this.label = new CSS2DObject(el)
    ctx.scene.add(this.label)

    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.quad)
    this.quadGeom.dispose()
    this.quadMat.dispose()

    this.ctx.scene.remove(this.surface)
    this.surfaceGeom.dispose()
    this.surfaceMat.dispose()

    this.ctx.scene.remove(this.label)
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const lenSq = vec.lengthSq()
    if (lenSq < 1e-8) {
      this.quad.visible    = false
      this.surface.visible = false
      this.label.visible   = false
      return
    }
    this.quad.visible    = true
    this.surface.visible = true
    this.label.visible   = true

    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0
    const dim = this.ctx.svc.config.embeddingDim

    // Bias point
    this._biasPos.copy(vec).multiplyScalar(-bi / lenSq)

    // ── Shader uniforms (project to NDC) ───────────────────────
    const cam = this.ctx.camera
    const origin3 = this._biasPos.clone().project(cam)
    const biasNDC = new THREE.Vector2(origin3.x, origin3.y)

    const vecNorm = vec.clone().normalize()
    const vecTip3 = this._biasPos.clone().add(vecNorm).project(cam)
    const vecDirNDC = new THREE.Vector2(vecTip3.x - origin3.x, vecTip3.y - origin3.y)

    this.quadMat.uniforms.uBiasNDC.value.copy(biasNDC)
    this.quadMat.uniforms.uVecDirNDC.value.copy(vecDirNDC)

    // ── Perpendicular surface line ─────────────────────────────
    // In 2D/3D, find a perpendicular direction for the surface line
    if (dim === 1) {
      // 1D: surface is just a tick mark (like axis ticks)
      const perpDir = new THREE.Vector3(0, 1, 0)
      const from = this._biasPos.clone().addScaledVector(perpDir, -0.06)
      const to   = this._biasPos.clone().addScaledVector(perpDir,  0.06)
      setCylinderEnds(this.surface, from, to)
    } else {
      // 2D/3D: a line perpendicular to the vector through the bias point
      this._perp.set(-vec.y, vec.x, 0).normalize()
      if (this._perp.length() < 1e-6) {
        this._perp.set(0, 0, 1).cross(vec).normalize()
      }
      const from = this._biasPos.clone().addScaledVector(this._perp, -SURFACE_EXTENT)
      const to   = this._biasPos.clone().addScaledVector(this._perp,  SURFACE_EXTENT)
      setCylinderEnds(this.surface, from, to)
    }

    // ── Label position (in the inactive region) ────────────────
    this.label.position.copy(this._biasPos).addScaledVector(vecNorm, -LABEL_OFFSET)
    // Offset perpendicular slightly so label doesn't sit on the line
    const labelPerp = dim === 1
      ? new THREE.Vector3(0, 1, 0)
      : this._perp.clone()
    this.label.position.addScaledVector(labelPerp, 0.08)
  }
}
