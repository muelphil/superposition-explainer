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
