import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { AXIS_LEN, AXIS_DIRECTIONS } from '../constants'

const GRADIENT_OPACITY = 0.25

// blue → white → orange  (matches --color-negative / --color-positive)
const BLUE   = new THREE.Color(0x60a5fa)
const ORANGE = new THREE.Color(0xfb923c)

// ── GLSL shaders ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy;                       // NDC range [-1, 1]
    gl_Position = vec4(position.xy, -1.0, 1.0);  // at far plane
  }
`

const fragmentShader = /* glsl */ `
  uniform vec2  uOriginNDC;   // projected world origin in NDC
  uniform vec2  uAxisNDC;     // projected axis tip (1 world-unit) in NDC, relative to origin
  uniform float uOpacity;
  uniform vec3  uColorNeg;    // blue
  uniform vec3  uColorPos;    // orange

  varying vec2 vUv;

  void main() {
    float axisLen = length(uAxisNDC);
    if (axisLen < 0.0001) { discard; }      // degenerate (axis perpendicular to view)

    vec2 dir = uAxisNDC / axisLen;           // normalized screen-space axis direction
    float t  = dot(vUv - uOriginNDC, dir);  // signed NDC distance along axis
    float w  = t / axisLen;                  // convert to world units

    // Normalize to [-1, 1] over the visible axis range
    float range = ${AXIS_LEN.toFixed(1)};
    float s = clamp(w / range, -1.0, 1.0);

    // Positive side: white → orange at axis extent
    // Negative side: white → blue at axis extent
    vec3 col = s < 0.0
      ? mix(vec3(1.0), uColorNeg, -s)
      : mix(vec3(1.0), uColorPos,  s);
    // Opacity: 0 at zero (white center), max at axis extents (colored edges)
    float a = abs(s) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`

// ── Overlay class ─────────────────────────────────────────────────────────────

/**
 * Full-screen gradient backdrop showing positive/negative regions along a hovered axis.
 *
 * Blue (negative) → white (zero) → orange (positive).
 * Works in any camera orientation — axis is projected to screen space each frame.
 *
 * Experimental overlay; can be removed by deleting this file + one line in resolveOverlays.
 */
export class AxisGradientOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private mesh!: THREE.Mesh
  private mat!:  THREE.ShaderMaterial
  private geom!: THREE.PlaneGeometry

  private readonly axisDir: THREE.Vector3

  constructor(private readonly axisIdx: number) {
    const [dx, dy, dz] = AXIS_DIRECTIONS[Math.min(axisIdx, 2)]
    this.axisDir = new THREE.Vector3(dx, dy, dz)
  }

  build(ctx: SceneCtx) {
    this.ctx = ctx

    this.mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uOriginNDC: { value: new THREE.Vector2(0, 0) },
        uAxisNDC:   { value: new THREE.Vector2(1, 0) },
        uOpacity:   { value: GRADIENT_OPACITY },
        uColorNeg:  { value: new THREE.Vector3(BLUE.r, BLUE.g, BLUE.b) },
        uColorPos:  { value: new THREE.Vector3(ORANGE.r, ORANGE.g, ORANGE.b) },
      },
      transparent: true,
      depthTest:  false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.geom = new THREE.PlaneGeometry(2, 2)
    this.mesh = new THREE.Mesh(this.geom, this.mat)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder   = -100   // behind everything
    ctx.scene.add(this.mesh)

    this.updateUniforms()
  }

  tick() {
    this.updateUniforms()
  }

  dispose() {
    this.ctx.scene.remove(this.mesh)
    this.geom.dispose()
    this.mat.dispose()
  }

  /** Project origin and axis tip onto NDC and feed to shader uniforms. */
  private updateUniforms() {
    const cam = this.ctx.camera

    // Project world origin to NDC
    const origin3 = new THREE.Vector3(0, 0, 0).project(cam)
    const originNDC = new THREE.Vector2(origin3.x, origin3.y)

    // Project a point 1 world-unit along the axis to NDC
    const tip3 = this.axisDir.clone().project(cam)
    const tipNDC = new THREE.Vector2(tip3.x - origin3.x, tip3.y - origin3.y)

    this.mat.uniforms.uOriginNDC.value.copy(originNDC)
    this.mat.uniforms.uAxisNDC.value.copy(tipNDC)
  }
}
