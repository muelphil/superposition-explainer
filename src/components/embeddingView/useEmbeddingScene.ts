import { watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import type { SelectionServiceType, SelectionTarget } from '../../services/SelectionService'
import { featureColorRGB, EMBEDDING_POINT_COLOR_HEX } from '../../utils/featureColor'
import { showEmbeddingPoint } from '../../services/SettingsService'
import type { VecVis, SceneCtx } from './types'
import { featureVec, makeAxisLabel, disposeMesh } from './sceneHelpers'
import { useOverlayManager } from './useOverlayManager'
import {
  CAMERA_FOV, CAMERA_MARGIN, CAMERA_3D_DIR, CAMERA_MIN_DIST, CAMERA_MAX_DIST, CAMERA_DAMPING,
  AXIS_LEN, AXIS_LABEL_PERP, AXIS_COLOR, AXIS_OPACITY, AXIS_TICK_OPACITY, AXIS_TICK_SIZE,
  AXIS_ARROW_INSET, AXIS_ARROW_LEN, AXIS_ARROW_HEAD_LEN, AXIS_ARROW_HEAD_W,
  AXIS_HIT_RADIUS, ORIGIN_RADIUS,
  AXIS_LABELS, AXIS_DIRECTIONS,
  ARROW_HEAD_MAX_LEN, ARROW_HEAD_MAX_W, ARROW_HEAD_LEN_FRAC, ARROW_HEAD_W_FRAC,
  ARROW_SHAFT_RADIUS, ARROW_SHAFT_SEGMENTS, VEC_HIT_RADIUS, VEC_HIT_EXTRA,
  DIM_COLOR_HEX, DIM_OPACITY,
} from './constants'

const Y_UP    = new THREE.Vector3(0, 1, 0)
const DIM_COLOR = new THREE.Color(DIM_COLOR_HEX)

// Axis highlight: full brightness when an emb axis is hovered/selected
const AXIS_HIGHLIGHT_COLOR   = 0xffffff
const AXIS_HIGHLIGHT_OPACITY = 1.0

export function useEmbeddingScene(
  canvasRef:    Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLDivElement   | null>,
  svc:    AutoencoderServiceType,
  selSvc: SelectionServiceType,
) {
  // ── Three.js scene state ──────────────────────────────────────
  let renderer:      THREE.WebGLRenderer      | null = null
  let labelRenderer: CSS2DRenderer            | null = null
  let scene:         THREE.Scene              | null = null
  let camera:        THREE.PerspectiveCamera  | null = null
  let controls:      OrbitControls            | null = null
  let rafId = 0

  const raycaster = new THREE.Raycaster()
  const mouseNDC  = new THREE.Vector2(-9999, -9999)

  let vecs:          VecVis[]     = []
  let axisHitMeshes: THREE.Mesh[] = []
  let axisGroup: THREE.Group | null = null
  // Per-axis materials for targeted highlighting: [lineMatPos, lineMatNeg, ...] per axis
  let axisMaterials: THREE.LineBasicMaterial[][] = []
  let embPointMesh: THREE.Mesh | null = null
  let needsVecUpdate = false
  let lastHoverKey   = ''

  let ro: ResizeObserver | null = null

  // ── SceneCtx (passed to overlay manager) ─────────────────────
  function getCtx(): SceneCtx | null {
    if (!scene || !camera || !labelRenderer) return null
    return {
      scene,
      camera,
      labelRenderer,
      svc,
      selSvc,
      featureVec: (i) => featureVec(svc.W.value, svc.config.embeddingDim, i),
    }
  }

  // ── Overlay manager ───────────────────────────────────────────
  const overlayManager = useOverlayManager(getCtx, selSvc)

  // ── Scene lifecycle ───────────────────────────────────────────
  function teardown() {
    cancelAnimationFrame(rafId)
    controls?.dispose()
    vecs.forEach(disposeVec)
    vecs = []
    axisHitMeshes.forEach(m => {
      scene?.remove(m)
      disposeMesh(m)
    })
    axisHitMeshes = []
    axisMaterials = []
    axisGroup = null
    if (embPointMesh) {
      scene?.remove(embPointMesh)
      disposeMesh(embPointMesh)
      embPointMesh = null
    }
    overlayManager.disposeAll()
    renderer?.dispose()
    if (labelRenderer) {
      labelRenderer.domElement.remove()
      labelRenderer = null
    }
    scene = null; camera = null; renderer = null; controls = null
    lastHoverKey = ''
  }

  function disposeVec(vv: VecVis) {
    scene?.remove(vv.group)
    scene?.remove(vv.hitMesh)
    vv.shaft.geometry.dispose()
    ;(vv.shaft.material as THREE.Material).dispose()
    vv.head.geometry.dispose()
    ;(vv.head.material as THREE.Material).dispose()
    ;(vv.hitMesh.material as THREE.Material).dispose()
    vv.hitMesh.geometry.dispose()
  }

  function init() {
    teardown()
    const canvas    = canvasRef.value
    const container = containerRef.value
    if (!canvas || !container) return
    const w = Math.max(canvas.clientWidth,  200)
    const h = Math.max(canvas.clientHeight, 200)

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h, false)

    labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(w, h)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top      = '0'
    labelRenderer.domElement.style.left     = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(labelRenderer.domElement)

    scene  = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 0.01, 100)

    const fovHalfRad = (CAMERA_FOV / 2) * (Math.PI / 180)
    const fitRadius  = Math.hypot(AXIS_LEN, AXIS_LABEL_PERP) + CAMERA_MARGIN
    const camDist    = fitRadius / Math.tan(fovHalfRad)

    const embDim = svc.config.embeddingDim
    if (embDim === 3) {
      const dir = new THREE.Vector3(...CAMERA_3D_DIR).normalize()
      camera.position.copy(dir.multiplyScalar(camDist))
    } else {
      camera.position.set(0, 0, camDist)
    }
    camera.lookAt(0, 0, 0)

    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = CAMERA_DAMPING
    controls.minDistance   = CAMERA_MIN_DIST
    controls.maxDistance   = CAMERA_MAX_DIST
    controls.enablePan     = false
    if (embDim < 3) controls.enableRotate = false

    buildAxes()
    buildVecs()
    renderLoop()
  }

  // ── Axes ──────────────────────────────────────────────────────
  function buildAxes() {
    if (!scene) return

    axisHitMeshes.forEach(m => {
      scene?.remove(m)
      disposeMesh(m)
    })
    axisHitMeshes = []
    axisMaterials = []
    if (axisGroup) scene.remove(axisGroup)

    const grp = new THREE.Group()
    scene.add(grp)
    axisGroup = grp

    const numAxes = Math.min(Math.max(svc.config.embeddingDim, 1), 3)

    for (let a = 0; a < numAxes; a++) {
      const [dx, dy, dz] = AXIS_DIRECTIONS[a]
      const dir    = new THREE.Vector3(dx, dy, dz)
      const negDir = dir.clone().negate()

      // Keep per-axis line materials so they can be highlighted individually
      const lineMat = new THREE.LineBasicMaterial({ color: AXIS_COLOR, opacity: AXIS_OPACITY, transparent: true })
      const mats: THREE.LineBasicMaterial[] = [lineMat]

      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        dir.clone().multiplyScalar(-AXIS_LEN),
        dir.clone().multiplyScalar( AXIS_LEN),
      ])
      grp.add(new THREE.Line(lineGeom, lineMat))

      grp.add(new THREE.ArrowHelper(
        dir, dir.clone().multiplyScalar(AXIS_LEN - AXIS_ARROW_INSET),
        AXIS_ARROW_LEN, AXIS_COLOR, AXIS_ARROW_HEAD_LEN, AXIS_ARROW_HEAD_W,
      ))
      grp.add(new THREE.ArrowHelper(
        negDir, negDir.clone().multiplyScalar(AXIS_LEN - AXIS_ARROW_INSET),
        AXIS_ARROW_LEN, AXIS_COLOR, AXIS_ARROW_HEAD_LEN, AXIS_ARROW_HEAD_W,
      ))

      // Tick marks at ±1
      const perp = a === 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      for (const s of [1, -1] as const) {
        const tg = new THREE.BufferGeometry().setFromPoints([
          dir.clone().multiplyScalar(s).add(perp.clone().multiplyScalar(-AXIS_TICK_SIZE)),
          dir.clone().multiplyScalar(s).add(perp.clone().multiplyScalar( AXIS_TICK_SIZE)),
        ])
        grp.add(new THREE.Line(tg, new THREE.LineBasicMaterial({
          color: AXIS_COLOR, opacity: AXIS_TICK_OPACITY, transparent: true,
        })))
      }

      // Label sprite beside arrowhead tip
      const perp2 = a === 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      const lbl = makeAxisLabel(AXIS_LABELS[a])
      lbl.position.copy(
        dir.clone().multiplyScalar(AXIS_LEN).add(perp2.clone().multiplyScalar(AXIS_LABEL_PERP))
      )
      grp.add(lbl)

      // Invisible hit cylinder for hover/click (aligned to axis direction)
      const hitGeom = new THREE.CylinderGeometry(AXIS_HIT_RADIUS, AXIS_HIT_RADIUS, AXIS_LEN * 2, 8)
      const hitMesh = new THREE.Mesh(hitGeom, new THREE.MeshBasicMaterial({ visible: false }))
      if (a === 0) hitMesh.rotation.z = Math.PI / 2
      if (a === 2) hitMesh.rotation.x = Math.PI / 2
      hitMesh.userData.aIdx = a
      scene!.add(hitMesh)
      axisHitMeshes.push(hitMesh)
      axisMaterials.push(mats)
    }

    grp.add(new THREE.Mesh(
      new THREE.SphereGeometry(ORIGIN_RADIUS, 10, 10),
      new THREE.MeshBasicMaterial({ color: AXIS_COLOR }),
    ))
  }

  // ── Feature vectors ───────────────────────────────────────────
  function buildVecs() {
    if (!scene) return
    vecs.forEach(disposeVec)
    vecs = []

    for (let i = 0; i < svc.config.inputDim; i++) {
      const [cr, cg, cb] = featureColorRGB(i, svc.config.inputDim)
      const col = new THREE.Color(cr, cg, cb)

      const shaftMat = new THREE.MeshBasicMaterial({ color: col.getHex(), transparent: true })
      const headMat  = new THREE.MeshBasicMaterial({ color: col.getHex(), transparent: true })
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(ARROW_SHAFT_RADIUS, ARROW_SHAFT_RADIUS, 1, ARROW_SHAFT_SEGMENTS),
        shaftMat,
      )
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1, ARROW_SHAFT_SEGMENTS),
        headMat,
      )

      const group = new THREE.Group()
      group.add(shaft)
      group.add(head)
      scene.add(group)

      const hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(VEC_HIT_RADIUS, VEC_HIT_RADIUS, 1, 6),
        new THREE.MeshBasicMaterial({ visible: false }),
      )
      scene.add(hitMesh)
      hitMesh.userData.vIdx = i

      const vv: VecVis = { group, shaft, head, hitMesh, color: col, idx: i }
      vecs.push(vv)
      applyVecGeom(vv)
    }
    applyVisualState(selSvc.selected.value, selSvc.hovered.value)

    // ── Embedding point ───────────────────────────────────────────
    if (embPointMesh) {
      scene.remove(embPointMesh)
      disposeMesh(embPointMesh)
    }
    embPointMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 14, 14),
      new THREE.MeshBasicMaterial({ color: EMBEDDING_POINT_COLOR_HEX }),
    )
    embPointMesh.visible = showEmbeddingPoint.value
    scene.add(embPointMesh)
    updateEmbPoint()
  }

  function updateEmbPoint() {
    if (!embPointMesh) return
    const h   = svc.currentEmbedding.value
    const dim = svc.config.embeddingDim
    embPointMesh.position.set(
      dim >= 1 ? (h[0] ?? 0) : 0,
      dim >= 2 ? (h[1] ?? 0) : 0,
      dim >= 3 ? (h[2] ?? 0) : 0,
    )
  }

  function applyVecGeom(vv: VecVis) {
    const v   = featureVec(svc.W.value, svc.config.embeddingDim, vv.idx)
    const len = v.length()
    const vis = len > 0.01

    vv.group.visible   = vis
    vv.hitMesh.visible = vis
    if (!vis) return

    const dir      = v.clone().normalize()
    const headLen  = Math.min(ARROW_HEAD_MAX_LEN, len * ARROW_HEAD_LEN_FRAC)
    const headW    = Math.min(ARROW_HEAD_MAX_W,   len * ARROW_HEAD_W_FRAC)
    const shaftLen = Math.max(0.001, len - headLen)

    vv.shaft.scale.y    = shaftLen
    vv.shaft.position.y = shaftLen / 2
    vv.head.scale.set(headW, headLen, headW)
    vv.head.position.y = shaftLen + headLen / 2
    vv.group.quaternion.setFromUnitVectors(Y_UP, dir)

    const hitLen = len + VEC_HIT_EXTRA
    vv.hitMesh.scale.y  = hitLen
    vv.hitMesh.position.copy(dir.clone().multiplyScalar(hitLen / 2))
    vv.hitMesh.quaternion.setFromUnitVectors(Y_UP, dir)
  }

  function updateVecs() {
    if (vecs.length !== svc.config.inputDim) { buildVecs(); return }
    for (const vv of vecs) applyVecGeom(vv)
    applyVisualState(selSvc.selected.value, selSvc.hovered.value)
  }

  // ── Visual state for permanent objects ────────────────────────
  /**
   * Apply hover/selection-driven appearance to permanent scene objects
   * (feature vectors and axes). Ephemeral visual helpers go in overlays instead.
   *
   * Feature vector dimming:
   *   - feature/input/output/bias/relu with idx=c → dim all vectors except c
   *   - weight (r,c)                              → dim all vectors except c
   *   - emb                                       → no dimming (dense connections)
   *   - null                                      → all full opacity
   *
   * Axis highlighting:
   *   - emb idx=r   → highlight axis r (brighter + full opacity)
   *   - weight (r,c) → highlight axis r
   *   - others       → all axes at normal opacity
   */
  function applyVisualState(sel: SelectionTarget, hov: SelectionTarget) {
    // Selection takes precedence; hover only applies when nothing is selected
    const primary   = sel ?? hov

    // ── Feature vectors ──────────────────────────────────────────
    let litVecIdx: number | null = null   // index of the one non-dimmed vector, or null = all lit
    let dimVecs = false

    if (primary) {
      switch (primary.kind) {
        case 'feature':
        case 'input':
        case 'output':
        case 'bias':
        case 'relu':
          dimVecs = true
          litVecIdx = primary.idx
          break
        case 'weight':
          dimVecs = true
          litVecIdx = primary.col
          break
        case 'emb':
          // Embedding axis hover: no vector dimming (all vectors connect to every axis)
          dimVecs = false
          break
      }
    }

    for (const vv of vecs) {
      const dim     = dimVecs && vv.idx !== litVecIdx
      const col     = dim ? DIM_COLOR : vv.color
      const opacity = dim ? DIM_OPACITY : 1.0
      const sm = vv.shaft.material as THREE.MeshBasicMaterial
      const hm = vv.head.material  as THREE.MeshBasicMaterial
      sm.color.copy(col); sm.opacity = opacity
      hm.color.copy(col); hm.opacity = opacity
    }

    // ── Axis highlighting ─────────────────────────────────────────
    let litAxisIdx: number | null = null

    if (primary?.kind === 'emb') {
      litAxisIdx = primary.idx
    } else if (primary?.kind === 'weight') {
      litAxisIdx = primary.row
    }

    for (let a = 0; a < axisMaterials.length; a++) {
      const highlight = litAxisIdx === a
      for (const mat of axisMaterials[a]) {
        mat.color.setHex(highlight ? AXIS_HIGHLIGHT_COLOR : AXIS_COLOR)
        mat.opacity = highlight ? AXIS_HIGHLIGHT_OPACITY : AXIS_OPACITY
      }
    }
  }

  // ── Render loop ───────────────────────────────────────────────
  function renderLoop() {
    rafId = requestAnimationFrame(renderLoop)
    if (!renderer || !scene || !camera) return
    controls?.update()

    if (needsVecUpdate) {
      updateVecs()
      needsVecUpdate = false
    }
    updateEmbPoint()
    overlayManager.tick()

    raycaster.setFromCamera(mouseNDC, camera)
    const vecHits  = raycaster.intersectObjects(vecs.map(vv => vv.hitMesh))
    const axisHits = raycaster.intersectObjects(axisHitMeshes)

    const newFeatureH = vecHits.length  > 0 ? (vecHits[0].object.userData.vIdx  as number) : null
    const newAxisH    = axisHits.length > 0 ? (axisHits[0].object.userData.aIdx as number) : null

    const newHoverKey = newFeatureH !== null ? `f:${newFeatureH}` : newAxisH !== null ? `e:${newAxisH}` : ''
    if (newHoverKey !== lastHoverKey) {
      lastHoverKey = newHoverKey
      if (newFeatureH !== null) {
        selSvc.setHover({ kind: 'feature', idx: newFeatureH }, 'embedding')
      } else if (newAxisH !== null) {
        selSvc.setHover({ kind: 'emb', idx: newAxisH }, 'embedding')
      } else {
        selSvc.clearHover()
      }
      applyVisualState(selSvc.selected.value, selSvc.hovered.value)
    }

    renderer.render(scene, camera)
    labelRenderer?.render(scene, camera)
  }

  // ── Resize ────────────────────────────────────────────────────
  function onResize() {
    const c = canvasRef.value
    if (!c || !renderer || !camera) return
    const w = c.clientWidth, h = c.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    labelRenderer?.setSize(w, h)
  }

  // ── Mouse / canvas events ─────────────────────────────────────
  function onMouseMove(e: MouseEvent) {
    const c = canvasRef.value
    if (!c) return
    const r = c.getBoundingClientRect()
    mouseNDC.x =  ((e.clientX - r.left) / r.width)  * 2 - 1
    mouseNDC.y = -((e.clientY - r.top)  / r.height) * 2 + 1
  }

  function onMouseLeave() {
    mouseNDC.set(-9999, -9999)
    if (lastHoverKey !== '') {
      lastHoverKey = ''
      selSvc.clearHover()
      applyVisualState(selSvc.selected.value, null)
    }
  }

  let mouseDownPos = { x: 0, y: 0 }

  function onCanvasMouseDown(e: MouseEvent) {
    mouseDownPos = { x: e.clientX, y: e.clientY }
  }

  function onCanvasClick(e: MouseEvent) {
    if (Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y) > 4) return
    const h = selSvc.hovered.value
    if (h?.kind === 'feature') {
      selSvc.setSelected({ kind: 'feature', idx: h.idx }, 'embedding')
    } else if (h?.kind === 'emb') {
      selSvc.setSelected({ kind: 'emb', idx: h.idx }, 'embedding')
    }
  }

  // ── Camera reset ──────────────────────────────────────────────
  function resetCamera() {
    if (!camera || !controls) return
    const fovHalfRad = (CAMERA_FOV / 2) * (Math.PI / 180)
    const fitRadius  = Math.hypot(AXIS_LEN, AXIS_LABEL_PERP) + CAMERA_MARGIN
    const camDist    = fitRadius / Math.tan(fovHalfRad)

    if (svc.config.embeddingDim === 3) {
      const dir = new THREE.Vector3(...CAMERA_3D_DIR).normalize()
      camera.position.copy(dir.multiplyScalar(camDist))
    } else {
      camera.position.set(0, 0, camDist)
    }
    camera.lookAt(0, 0, 0)
    controls.target.set(0, 0, 0)
    controls.update()
  }

  onMounted(async () => {
    await nextTick()
    init()
    ro = new ResizeObserver(onResize)
    if (containerRef.value) ro.observe(containerRef.value)
  })

  onUnmounted(() => {
    teardown()
    ro?.disconnect()
  })

  watch(() => svc.config.embeddingDim, async () => { await nextTick(); init() })
  watch(() => svc.config.inputDim,     async () => { await nextTick(); if (scene) buildVecs(); else init() })
  watch(() => svc.W.value, () => { needsVecUpdate = true }, { deep: true })
  // Re-apply visual state when hover/selection changes from any other component
  watch([selSvc.hovered, selSvc.selected], ([hov, sel]) => {
    applyVisualState(sel, hov)
  }, { flush: 'sync' })
  watch(showEmbeddingPoint, v => { if (embPointMesh) embPointMesh.visible = v })

  return {
    onMouseMove,
    onMouseLeave,
    onCanvasMouseDown,
    onCanvasClick,
    resetCamera,
  }
}

