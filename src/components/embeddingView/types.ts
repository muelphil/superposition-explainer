import type * as THREE from 'three'

export interface VecVis {
  group:   THREE.Group
  shaft:   THREE.Mesh
  head:    THREE.Mesh
  hitMesh: THREE.Mesh
  color:   THREE.Color
  idx:     number
}
