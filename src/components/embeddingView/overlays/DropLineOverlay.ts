import * as THREE from 'three'
import type { SceneCtx, SceneOverlay } from '../types'
import { AXIS_DIRECTIONS } from '../constants'
import { DashedCylinders } from '../sceneHelpers'

const RADIUS    = 0.008
const DASH_SIZE = 0.04
const GAP_SIZE  = 0.04
const COLOR     = 0xd1d5db   // light grey
const OPACITY   = 0.6

/**
 * Dashed grey cylinder line from a feature vector's arrow tip to its
 * projection point on an embedding axis.
 *
 * Composable: combine with ProjectionLineOverlay for the full projection visual.
 */
export class DropLineOverlay implements SceneOverlay {
  private ctx!: SceneCtx
  private dashed!: DashedCylinders
  private mat!: THREE.MeshBasicMaterial

  private readonly axisDir: THREE.Vector3
  private readonly _proj = new THREE.Vector3()

  constructor(
    private readonly featureIdx: number,
    private readonly axisIdx: number,
  ) {
    const [dx, dy, dz] = AXIS_DIRECTIONS[Math.min(axisIdx, 2)]
    this.axisDir = new THREE.Vector3(dx, dy, dz)
  }

  build(ctx: SceneCtx) {
    this.ctx = ctx

    this.mat = new THREE.MeshBasicMaterial({
      color:       COLOR,
      transparent: true,
      opacity:     OPACITY,
      depthTest:   false,
    })
    this.dashed = new DashedCylinders(RADIUS, DASH_SIZE, GAP_SIZE, this.mat, 10)
    ctx.scene.add(this.dashed.group)

    this.update()
  }

  tick() { this.update() }

  dispose() {
    this.ctx.scene.remove(this.dashed.group)
    this.dashed.dispose()
    this.mat.dispose()
  }

  private update() {
    const vec = this.ctx.featureVec(this.featureIdx)
    const projValue = vec.dot(this.axisDir)

    if (Math.abs(projValue) < 1e-6) {
      this.dashed.update(vec, vec) // zero-length → hides all dashes
      return
    }

    this._proj.copy(this.axisDir).multiplyScalar(projValue)
    this.dashed.update(vec, this._proj)
  }
}
