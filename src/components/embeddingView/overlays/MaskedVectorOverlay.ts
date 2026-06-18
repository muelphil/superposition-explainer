import * as THREE from 'three'
import type { SceneCtx, SceneOverlay, VecVis } from '../types'
import { featureColorRGB } from '../../../utils/featureColor'

// ── Shader source ──────────────────────────────────────────────────────────────
const maskVs = /* glsl */ `
  varying vec3 v_worldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    v_worldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const maskFs = /* glsl */ `
  precision mediump float;
  varying vec3 v_worldPos;
  uniform vec3 u_planeNormal;
  uniform float u_planeD;
  uniform vec3 u_featureColor;
  uniform vec3 u_greyColor;
  uniform float u_opacity;
  uniform float u_smooth;

  vec3 LinearToSRGB( vec3 value ) {
    return mix( pow( value, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value * 12.92, vec3( lessThanEqual( value, vec3( 0.0031308 ) ) ) );
  }

  void main() {
    float d = dot(v_worldPos, u_planeNormal) - u_planeD;
    float t = smoothstep(-u_smooth, u_smooth, d);
    vec3 col = mix(u_greyColor, u_featureColor, t);
    gl_FragColor = vec4( LinearToSRGB(col), u_opacity );
  }
`

// ── Overlay class ──────────────────────────────────────────────────────────────

const GREY_VEC = new THREE.Vector3(0.3325, 0.3663, 0.4287)

interface ShaderVec {
  shaftMat: THREE.ShaderMaterial
  headMat: THREE.ShaderMaterial
}

export class MaskedVectorOverlay implements SceneOverlay {
  private ctx!: SceneCtx

  private readonly _origMats = new Map<number, [THREE.Material, THREE.Material]>()
  private readonly _shaders = new Map<number, ShaderVec>()

  constructor(
    private readonly featureIdx: number,
    private readonly getVecs: () => VecVis[],
  ) {}

  build(ctx: SceneCtx) {
    this.ctx = ctx
    this.apply()
  }

  tick() { this.apply() }

  dispose() {
    for (const [j, mats] of this._origMats) {
      const vv = this.getVecs()[j]
      if (vv) {
        vv.shaft.material = mats[0]
        vv.head.material = mats[1]
      }
    }
    for (const s of this._shaders.values()) {
      s.shaftMat.dispose()
      s.headMat.dispose()
    }
    this._origMats.clear()
    this._shaders.clear()
  }

  private apply() {
    const vecI = this.ctx.featureVec(this.featureIdx)
    const lenSq = vecI.lengthSq()
    if (lenSq < 1e-8) {
      this.restoreAll()
      return
    }

    const vecNorm = vecI.clone().normalize()
    const bi = this.ctx.svc.b.value[this.featureIdx] ?? 0
    const len = Math.sqrt(lenSq)
    const tBoundary = -bi / len

    const vecs = this.getVecs()
    const n = vecs.length
    const inputDim = this.ctx.svc.config.inputDim
    const needed = new Set<number>()

    for (let j = 0; j < n; j++) {
      const vecJ = this.ctx.featureVec(j)
      const dAt1 = vecJ.dot(vecNorm) - tBoundary
      const dAt0 = -tBoundary

      // Skip only if both endpoints are in the active (unmasked) region.
      // Crossing vectors and fully-masked vectors both get the shader
      // (fully-masked will be grey everywhere).
      if (dAt0 > 0 && dAt1 > 0) continue

      needed.add(j)
      const [fr, fg, fb] = featureColorRGB(j, inputDim)
      this.ensureShader(vecs[j], vecNorm, tBoundary, [fr, fg, fb])
    }

    for (const [j, mats] of this._origMats) {
      if (!needed.has(j)) {
        const vv = vecs[j]
        if (vv) {
          vv.shaft.material = mats[0]
          vv.head.material = mats[1]
        }
        const sv = this._shaders.get(j)
        if (sv) {
          sv.shaftMat.dispose()
          sv.headMat.dispose()
        }
        this._shaders.delete(j)
        this._origMats.delete(j)
      }
    }
  }

  private restoreAll() {
    for (const [j, mats] of this._origMats) {
      const vv = this.getVecs()[j]
      if (vv) {
        vv.shaft.material = mats[0]
        vv.head.material = mats[1]
      }
    }
    for (const sv of this._shaders.values()) {
      sv.shaftMat.dispose()
      sv.headMat.dispose()
    }
    this._shaders.clear()
    this._origMats.clear()
  }

  private ensureShader(vv: VecVis, vecNorm: THREE.Vector3, tBoundary: number, linearRGB: [number, number, number]) {
    let sv = this._shaders.get(vv.idx)

    if (!sv) {
      this._origMats.set(vv.idx, [vv.shaft.material, vv.head.material])

      const uniforms = {
        u_planeNormal:  { value: vecNorm.clone() },
        u_planeD:       { value: tBoundary },
        u_featureColor: { value: new THREE.Vector3(linearRGB[0], linearRGB[1], linearRGB[2]) },
        u_greyColor:    { value: GREY_VEC.clone() },
        u_opacity:      { value: 1.0 },
        u_smooth:       { value: 0.02 },
      }

      const shaftMat = new THREE.ShaderMaterial({
        vertexShader: maskVs,
        fragmentShader: maskFs,
        uniforms,
        transparent: true,
        depthWrite: false,
      })
      const headMat = new THREE.ShaderMaterial({
        vertexShader: maskVs,
        fragmentShader: maskFs,
        uniforms,
        transparent: true,
        depthWrite: false,
      })
      vv.shaft.material = shaftMat
      vv.head.material = headMat
      sv = { shaftMat, headMat }
      this._shaders.set(vv.idx, sv)
    } else {
      // Update uniforms on existing materials
      sv.shaftMat.uniforms.u_planeNormal.value.copy(vecNorm)
      sv.shaftMat.uniforms.u_planeD.value = tBoundary
    }
  }
}
