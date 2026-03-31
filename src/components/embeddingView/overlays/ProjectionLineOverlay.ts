import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { AXIS_DIRECTIONS } from '../constants'
import { setCylinderEnds } from '../sceneHelpers'

const RADIUS   = 0.011
const SEGMENTS = 8

const POSITIVE_COLOR = new THREE.Color(0xfb923c)  // --color-positive
const NEGATIVE_COLOR = new THREE.Color(0x60a5fa)  // --color-negative

/**
 * Solid colored cylinder along an embedding axis from the origin to the
 * projection of a feature vector onto that axis.
 * Orange when the projection is positive, blue when negative.
 *
 * Composable: combine with DropLineOverlay for the full projection visual.
 */
export class ProjectionLineOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private mesh!: THREE.Mesh
  private mat!:  THREE.MeshBasicMaterial
  private geom!: THREE.CylinderGeometry

  private readonly axisDir: THREE.Vector3
  private readonly _origin = new THREE.Vector3(0, 0, 0)
  private readonly _proj   = new THREE.Vector3()

  constructor(
    private readonly featureIdx: number,
    readonly axisIdx: number,
  ) {
    const [dx, dy, dz] = AXIS_DIRECTIONS[Math.min(axisIdx, 2)]
    this.axisDir = new THREE.Vector3(dx, dy, dz)
  }

  build(ctx: SceneCtx) {
    this.ctx = ctx

    this.mat = new THREE.MeshBasicMaterial({
      color:       POSITIVE_COLOR,
      transparent: true,
      opacity:     1.0,
      depthTest:   false,
    })
    this.geom = new THREE.CylinderGeometry(RADIUS, RADIUS, 1, SEGMENTS)
    this.mesh = new THREE.Mesh(this.geom, this.mat)
    this.mesh.renderOrder = 10
    ctx.scene.add(this.mesh)

    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.mesh)
    this.geom.dispose()
    this.mat.dispose()
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const projValue = vec.dot(this.axisDir)

    if (Math.abs(projValue) < 1e-6) {
      this.mesh.visible = false
      return
    }

    this.mat.color.copy(projValue >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR)
    this._proj.copy(this.axisDir).multiplyScalar(projValue)
    setCylinderEnds(this.mesh, this._origin, this._proj)
    this.mesh.renderOrder = 10
  }
}
