import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { createLatexElement } from '../../utils/latex'

/**
 * Returns the i-th feature vector (column i of W) as a THREE.Vector3
 * mapped onto (x, y, z) axes for the current embedding dimensionality.
 * Pure function — safe to call from overlays without closures.
 */
export function featureVec(
  W: number[][],
  embDim: number,
  i: number,
): THREE.Vector3 {
  return new THREE.Vector3(
    W[0]?.[i] ?? 0,
    embDim >= 2 ? (W[1]?.[i] ?? 0) : 0,
    embDim >= 3 ? (W[2]?.[i] ?? 0) : 0,
  )
}

/** Creates a CSS2DObject wrapping a KaTeX-rendered formula for use as an axis label. */
export function makeAxisLabel(formula: string): CSS2DObject {
  const el = createLatexElement(formula, {
    color: '#6b7280',
    fontSize: '0.78rem',
    pointerEvents: 'none',
    userSelect: 'none',
  })
  return new CSS2DObject(el)
}

/** Disposes a Three.js mesh's geometry and material(s). */
export function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose()
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(m => m.dispose())
  } else {
    mesh.material.dispose()
  }
}

// ── Cylinder-based "line" helpers ─────────────────────────────────────────────

const _yUp  = new THREE.Vector3(0, 1, 0)
const _cDir = new THREE.Vector3()

/**
 * Position a **unit-height** CylinderGeometry mesh so it spans from → to.
 * Sets position (midpoint), scale.y (length), and quaternion (orientation).
 */
export function setCylinderEnds(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
  _cDir.subVectors(to, from)
  const len = _cDir.length()
  if (len < 1e-8) { mesh.visible = false; return }
  mesh.visible = true
  mesh.position.addVectors(from, to).multiplyScalar(0.5)
  mesh.scale.set(1, len, 1)
  _cDir.divideScalar(len)
  mesh.quaternion.setFromUnitVectors(_yUp, _cDir)
}

const MAX_DASHES = 30

/**
 * A reusable group of small cylinder meshes arranged as a dashed line.
 * Call update(from, to) each frame to reposition.
 */
export class DashedCylinders {
  readonly group = new THREE.Group()
  private readonly dashes: THREE.Mesh[]
  private readonly geom: THREE.CylinderGeometry

  // Pre-allocated temps for update()
  private readonly _d = new THREE.Vector3()
  private readonly _a = new THREE.Vector3()
  private readonly _b = new THREE.Vector3()

  constructor(
    radius: number,
    private readonly dashSize: number,
    private readonly gapSize: number,
    mat: THREE.Material,
    renderOrder = 0,
    segments = 6,
  ) {
    this.geom = new THREE.CylinderGeometry(radius, radius, 1, segments)
    this.dashes = []
    for (let i = 0; i < MAX_DASHES; i++) {
      const m = new THREE.Mesh(this.geom, mat)
      m.visible = false
      m.renderOrder = renderOrder
      this.group.add(m)
      this.dashes.push(m)
    }
  }

  update(from: THREE.Vector3, to: THREE.Vector3) {
    this._d.subVectors(to, from)
    const totalLen = this._d.length()
    if (totalLen < 1e-6) {
      for (const d of this.dashes) d.visible = false
      return
    }
    this._d.divideScalar(totalLen)
    const step = this.dashSize + this.gapSize
    let pos = 0, i = 0
    while (pos < totalLen && i < this.dashes.length) {
      const dl = Math.min(this.dashSize, totalLen - pos)
      this._a.copy(from).addScaledVector(this._d, pos)
      this._b.copy(from).addScaledVector(this._d, pos + dl)
      setCylinderEnds(this.dashes[i], this._a, this._b)
      i++; pos += step
    }
    for (; i < this.dashes.length; i++) this.dashes[i].visible = false
  }

  dispose() {
    this.geom.dispose()
  }
}
