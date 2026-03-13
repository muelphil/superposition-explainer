<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import type { SelectionServiceType } from '../services/SelectionService'
import { featureColorRGB, featureColorCss } from '../utils/featureColor'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

// ── Template refs ────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef    = ref<HTMLCanvasElement | null>(null)
const hoveredIdx   = ref<number | null>(null)        // feature vec hover (local visual)
const hoveredEmbAxisIdx = ref<number | null>(null)   // axis hover (for click dispatch)

// ── Derived dims ─────────────────────────────────────────────
const embDim   = computed(() => svc.config.embeddingDim)
const inputDim = computed(() => svc.config.inputDim)

// ── Three.js state ───────────────────────────────────────────
let renderer: THREE.WebGLRenderer | null = null
let scene:    THREE.Scene          | null = null
let camera:   THREE.PerspectiveCamera | null = null
let controls: OrbitControls        | null = null
let rafId = 0

const raycaster = new THREE.Raycaster()
const mouseNDC  = new THREE.Vector2(-9999, -9999)

interface VecVis {
  group:   THREE.Group
  shaft:   THREE.Mesh      // cylinder shaft
  head:    THREE.Mesh      // cone arrowhead
  hitMesh: THREE.Mesh
  color:   THREE.Color
  idx:     number
}
let vecs:          VecVis[]     = []
let axisHitMeshes: THREE.Mesh[] = []
let axisGroup: THREE.Group | null = null
let needsVecUpdate = false
let lastHoverKey   = ''       // tracks selSvc hover to avoid redundant calls

// ── Helpers ──────────────────────────────────────────────────
function featureVec(i: number): THREE.Vector3 {
  const W = svc.W.value
  return new THREE.Vector3(
    W[0]?.[i] ?? 0,
    embDim.value >= 2 ? (W[1]?.[i] ?? 0) : 0,
    embDim.value >= 3 ? (W[2]?.[i] ?? 0) : 0,
  )
}

function makeAxisLabel(text: string): THREE.Sprite {
  // High-resolution canvas for crisp text; scale kept small in 3D
  const SIZE = 256
  const c = document.createElement('canvas')
  c.width = SIZE; c.height = SIZE
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 160px Arial, Helvetica, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, SIZE / 2, SIZE / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  )
  sprite.scale.setScalar(LABEL_SCALE)
  return sprite
}

// ── Scene init / teardown ─────────────────────────────────────
function teardown() {
  cancelAnimationFrame(rafId)
  controls?.dispose()
  vecs.forEach(vv => disposeVec(vv))
  vecs = []
  axisHitMeshes.forEach(m => {
    scene?.remove(m)
    m.geometry.dispose()
    ;(m.material as THREE.Material).dispose()
  })
  axisHitMeshes = []
  axisGroup = null
  renderer?.dispose()
  scene = null; camera = null; renderer = null; controls = null
  lastHoverKey = ''
  hoveredEmbAxisIdx.value = null
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
  const canvas = canvasRef.value
  if (!canvas) return
  const w = Math.max(canvas.clientWidth,  200)
  const h = Math.max(canvas.clientHeight, 200)

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h, false)

  scene  = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 0.01, 100)

  // Compute camera distance to fit the scene: axes extend to AXIS_LEN,
  // labels sit AXIS_LABEL_PERP units perpendicular to each axis tip.
  // The scene radius is the hypotenuse of those two extents.
  const _fovHalfRad = (CAMERA_FOV / 2) * (Math.PI / 180)
  const _fitRadius  = Math.hypot(AXIS_LEN, AXIS_LABEL_PERP) + CAMERA_MARGIN
  const _camDist    = _fitRadius / Math.tan(_fovHalfRad)

  if (embDim.value === 3) {
    camera.position.copy(CAMERA_3D_DIR.clone().normalize().multiplyScalar(_camDist))
  } else {
    camera.position.set(0, 0, _camDist)
  }
  camera.lookAt(0, 0, 0)

  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = CAMERA_DAMPING
  controls.minDistance   = CAMERA_MIN_DIST
  controls.maxDistance   = CAMERA_MAX_DIST
  controls.enablePan     = false
  if (embDim.value === 1) controls.enableRotate = false

  buildAxes()
  buildVecs()
  renderLoop()
}

// ── Rendering constants ───────────────────────────────────────
// Camera
const CAMERA_FOV      = 45                                   // perspective FOV (degrees)
const CAMERA_MARGIN   = 0.3                                  // extra clearance beyond scene extents
const CAMERA_3D_DIR   = new THREE.Vector3(1, 0.8, 1.667)    // 3D view direction (unnormalized)
const CAMERA_MIN_DIST = 1.5                                  // orbit min zoom distance
const CAMERA_MAX_DIST = 14                                   // orbit max zoom distance
const CAMERA_DAMPING  = 0.07                                 // orbit damping factor

// Axes
const AXIS_LEN            = 1.3     // distance from origin to axis tip
const AXIS_LABEL_PERP     = 0.3     // perpendicular label offset from the axis tip
const AXIS_COLOR          = 0xd1d5db                        // slate-300
const AXIS_OPACITY        = 0.55    // axis line opacity
const AXIS_TICK_OPACITY   = 0.4     // tick mark opacity
const AXIS_TICK_SIZE      = 0.05    // tick half-length (perpendicular to axis)
const AXIS_ARROW_INSET    = 0.18    // how far before the tip the ArrowHelper starts
const AXIS_ARROW_LEN      = 0.22    // total length of the axis ArrowHelper
const AXIS_ARROW_HEAD_LEN = 0.16    // cone length of axis arrowhead
const AXIS_ARROW_HEAD_W   = 0.07    // cone width  of axis arrowhead
const AXIS_HIT_RADIUS     = 0.08    // invisible hit-cylinder radius for axes
const ORIGIN_RADIUS       = 0.028   // origin sphere radius
const LABEL_SCALE         = 0.28    // axis label sprite size in world units

// Feature vectors
const ARROW_HEAD_MAX_LEN   = 0.17    // max absolute arrowhead cone length
const ARROW_HEAD_MAX_W     = 0.09    // max absolute arrowhead cone width
const ARROW_HEAD_LEN_FRAC  = 0.35    // arrowhead length as fraction of vector length
const ARROW_HEAD_W_FRAC    = 0.22    // arrowhead width  as fraction of vector length
const ARROW_SHAFT_RADIUS   = 0.013   // shaft cylinder radius — increase for thicker vectors
const ARROW_SHAFT_SEGMENTS = 8       // radial segments for shaft and head geometry
const VEC_HIT_RADIUS      = 0.075   // invisible hit-cylinder radius for feature vectors
const VEC_HIT_EXTRA       = 0.12    // hit-cylinder extension beyond arrowhead tip

// Hover dimming
const DIM_COLOR   = new THREE.Color(0.68, 0.68, 0.68)  // color applied to non-hovered vectors
const DIM_OPACITY = 0.35                                 // opacity of non-hovered vectors

function buildAxes() {
  if (!scene) return

  // Clean up previous axis hit meshes
  axisHitMeshes.forEach(m => {
    scene?.remove(m)
    m.geometry.dispose()
    ;(m.material as THREE.Material).dispose()
  })
  axisHitMeshes = []

  if (axisGroup) { scene.remove(axisGroup) }

  const grp = new THREE.Group()
  scene.add(grp)
  axisGroup = grp

  // h₁, h₂, h₃ using Unicode subscript digits
  const labels   = ['h\u2081', 'h\u2082', 'h\u2083']
  const axisDirs = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ]
  const numAxes = Math.min(Math.max(embDim.value, 1), 3)

  for (let a = 0; a < numAxes; a++) {
    const dir    = axisDirs[a]
    const negDir = dir.clone().negate()
    const axMat  = new THREE.LineBasicMaterial({ color: AXIS_COLOR, opacity: AXIS_OPACITY, transparent: true })

    // Bidirectional axis line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      dir.clone().multiplyScalar(-AXIS_LEN),
      dir.clone().multiplyScalar(AXIS_LEN),
    ])
    grp.add(new THREE.Line(lineGeom, axMat.clone()))

    // Arrowhead at positive end
    const posTip = new THREE.ArrowHelper(
      dir, dir.clone().multiplyScalar(AXIS_LEN - AXIS_ARROW_INSET),
      AXIS_ARROW_LEN, AXIS_COLOR, AXIS_ARROW_HEAD_LEN, AXIS_ARROW_HEAD_W,
    )
    grp.add(posTip)

    // Arrowhead at negative end
    const negTip = new THREE.ArrowHelper(
      negDir, negDir.clone().multiplyScalar(AXIS_LEN - AXIS_ARROW_INSET),
      AXIS_ARROW_LEN, AXIS_COLOR, AXIS_ARROW_HEAD_LEN, AXIS_ARROW_HEAD_W,
    )
    grp.add(negTip)

    // Tick marks at ±1 unit
    const perp = a === 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    for (const s of [1, -1]) {
      const tickPts = [
        dir.clone().multiplyScalar(s).add(perp.clone().multiplyScalar(-AXIS_TICK_SIZE)),
        dir.clone().multiplyScalar(s).add(perp.clone().multiplyScalar( AXIS_TICK_SIZE)),
      ]
      const tg = new THREE.BufferGeometry().setFromPoints(tickPts)
      grp.add(new THREE.Line(tg, new THREE.LineBasicMaterial({ color: AXIS_COLOR, opacity: AXIS_TICK_OPACITY, transparent: true })))
    }

    // Axis label — perpendicular to the axis, right beside the arrowhead tip
    const lbl = makeAxisLabel(labels[a])
    lbl.position.copy(
      dir.clone().multiplyScalar(AXIS_LEN)
        .add(perp.clone().multiplyScalar(AXIS_LABEL_PERP))
    )
    grp.add(lbl)

    // Invisible hit cylinder for hover/click on axis (maps to embedding dim a)
    const hitGeom = new THREE.CylinderGeometry(AXIS_HIT_RADIUS, AXIS_HIT_RADIUS, AXIS_LEN * 2, 8)
    const hitMesh = new THREE.Mesh(hitGeom, new THREE.MeshBasicMaterial({ visible: false }))
    // CylinderGeometry is along Y by default — rotate to match axis direction
    if (a === 0) hitMesh.rotation.z = Math.PI / 2   // align to X
    if (a === 2) hitMesh.rotation.x = Math.PI / 2   // align to Z
    hitMesh.userData.aIdx = a
    scene!.add(hitMesh)
    axisHitMeshes.push(hitMesh)
  }

  // Small origin sphere
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(ORIGIN_RADIUS, 10, 10),
    new THREE.MeshBasicMaterial({ color: AXIS_COLOR }),
  )
  grp.add(dot)
}

function buildVecs() {
  if (!scene) return
  vecs.forEach(vv => disposeVec(vv))
  vecs = []

  const Y_UP = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < inputDim.value; i++) {
    const [cr, cg, cb] = featureColorRGB(i, inputDim.value)
    const col = new THREE.Color(cr, cg, cb)
    const v   = featureVec(i)
    const len = v.length()
    const vis = len > 0.01
    const safeLen  = Math.max(len, 0.01)
    const dir      = vis ? v.clone().normalize() : new THREE.Vector3(1, 0, 0)
    const headLen  = Math.min(ARROW_HEAD_MAX_LEN, safeLen * ARROW_HEAD_LEN_FRAC)
    const headW    = Math.min(ARROW_HEAD_MAX_W,   safeLen * ARROW_HEAD_W_FRAC)
    const shaftLen = Math.max(0.001, safeLen - headLen)

    const shaftMat = new THREE.MeshBasicMaterial({ color: col.getHex(), transparent: true })
    const headMat  = new THREE.MeshBasicMaterial({ color: col.getHex(), transparent: true })
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(ARROW_SHAFT_RADIUS, ARROW_SHAFT_RADIUS, shaftLen, ARROW_SHAFT_SEGMENTS),
      shaftMat,
    )
    shaft.position.y = shaftLen / 2
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(headW / 2, headLen, ARROW_SHAFT_SEGMENTS),
      headMat,
    )
    head.position.y = shaftLen + headLen / 2

    const group = new THREE.Group()
    group.add(shaft)
    group.add(head)
    group.quaternion.setFromUnitVectors(Y_UP, dir)
    group.visible = vis
    scene.add(group)

    const hitLen  = safeLen + VEC_HIT_EXTRA
    const hitGeom = new THREE.CylinderGeometry(VEC_HIT_RADIUS, VEC_HIT_RADIUS, hitLen, 6)
    const hitMesh = new THREE.Mesh(hitGeom, new THREE.MeshBasicMaterial({ visible: false }))
    hitMesh.position.copy(dir.clone().multiplyScalar(hitLen / 2))
    hitMesh.quaternion.setFromUnitVectors(Y_UP, dir)
    hitMesh.userData.vIdx = i
    scene.add(hitMesh)

    vecs.push({ group, shaft, head, hitMesh, color: col, idx: i })
  }
  applyHover()
}

function updateVecs() {
  if (!scene || vecs.length !== inputDim.value) { buildVecs(); return }

  const Y_UP = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < inputDim.value; i++) {
    const vv  = vecs[i]
    const v   = featureVec(i)
    const len = v.length()
    const vis = len > 0.01

    vv.group.visible   = vis
    vv.hitMesh.visible = vis
    if (!vis) continue

    const dir      = v.clone().normalize()
    const headLen  = Math.min(ARROW_HEAD_MAX_LEN, len * ARROW_HEAD_LEN_FRAC)
    const headW    = Math.min(ARROW_HEAD_MAX_W,   len * ARROW_HEAD_W_FRAC)
    const shaftLen = Math.max(0.001, len - headLen)

    vv.shaft.geometry.dispose()
    vv.shaft.geometry = new THREE.CylinderGeometry(ARROW_SHAFT_RADIUS, ARROW_SHAFT_RADIUS, shaftLen, ARROW_SHAFT_SEGMENTS)
    vv.shaft.position.y = shaftLen / 2

    vv.head.geometry.dispose()
    vv.head.geometry = new THREE.ConeGeometry(headW / 2, headLen, ARROW_SHAFT_SEGMENTS)
    vv.head.position.y = shaftLen + headLen / 2

    vv.group.quaternion.setFromUnitVectors(Y_UP, dir)

    const hitLen = len + VEC_HIT_EXTRA
    vv.hitMesh.geometry.dispose()
    vv.hitMesh.geometry = new THREE.CylinderGeometry(VEC_HIT_RADIUS, VEC_HIT_RADIUS, hitLen, 6)
    vv.hitMesh.position.copy(dir.clone().multiplyScalar(hitLen / 2))
    vv.hitMesh.quaternion.setFromUnitVectors(Y_UP, dir)
  }
  applyHover()
}

function applyHover() {
  const h = hoveredIdx.value
  for (const vv of vecs) {
    const dim     = h !== null && h !== vv.idx
    const col     = dim ? DIM_COLOR : vv.color
    const opacity = dim ? DIM_OPACITY : 1.0
    const sm = vv.shaft.material as THREE.MeshBasicMaterial
    const hm = vv.head.material  as THREE.MeshBasicMaterial
    sm.color.copy(col); sm.opacity = opacity
    hm.color.copy(col); hm.opacity = opacity
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

  // Hover detection via raycaster
  raycaster.setFromCamera(mouseNDC, camera)

  const vecHits  = raycaster.intersectObjects(vecs.map(vv => vv.hitMesh))
  const axisHits = raycaster.intersectObjects(axisHitMeshes)

  const newFeatureH = vecHits.length  > 0 ? (vecHits[0].object.userData.vIdx as number) : null
  const newAxisH    = axisHits.length > 0 ? (axisHits[0].object.userData.aIdx as number) : null

  // Update local visual hover (feature vector dimming)
  if (newFeatureH !== hoveredIdx.value) {
    hoveredIdx.value = newFeatureH
    applyHover()
  }
  hoveredEmbAxisIdx.value = newAxisH

  // Update selectionService hover — only when the target actually changes
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
  }

  renderer.render(scene, camera)
}

// ── Mouse events ─────────────────────────────────────────────
function onMouseMove(e: MouseEvent) {
  const c = canvasRef.value
  if (!c) return
  const r   = c.getBoundingClientRect()
  mouseNDC.x =  ((e.clientX - r.left) / r.width)  * 2 - 1
  mouseNDC.y = -((e.clientY - r.top)  / r.height) * 2 + 1
}

function onMouseLeave() {
  mouseNDC.set(-9999, -9999)
  if (hoveredIdx.value !== null) { hoveredIdx.value = null; applyHover() }
  hoveredEmbAxisIdx.value = null
  if (lastHoverKey !== '') { lastHoverKey = ''; selSvc.clearHover() }
}

let mouseDownPos = { x: 0, y: 0 }

function onCanvasMouseDown(e: MouseEvent) {
  mouseDownPos = { x: e.clientX, y: e.clientY }
}

function onCanvasClick(e: MouseEvent) {
  // Ignore drags — OrbitControls fires a click at end of drag
  if (Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y) > 4) return
  if (hoveredIdx.value !== null) {
    selSvc.setSelected({ kind: 'feature', idx: hoveredIdx.value }, 'embedding')
  } else if (hoveredEmbAxisIdx.value !== null) {
    selSvc.setSelected({ kind: 'emb', idx: hoveredEmbAxisIdx.value }, 'embedding')
  }
}

// ── Legend hover ─────────────────────────────────────────────
function onLegendEnter(i: number) {
  hoveredIdx.value = i
  applyHover()
  selSvc.setHover({ kind: 'feature', idx: i }, 'embedding')
}
function onLegendLeave() {
  hoveredIdx.value = null
  applyHover()
  selSvc.clearHover()
}
function onLegendClick(i: number) {
  selSvc.setSelected({ kind: 'feature', idx: i }, 'embedding')
}

// ── Resize ────────────────────────────────────────────────────
let ro: ResizeObserver | null = null
function onResize() {
  const c = canvasRef.value
  if (!c || !renderer || !camera) return
  const w = c.clientWidth, h = c.clientHeight
  if (!w || !h) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}

// ── Vue lifecycle ─────────────────────────────────────────────
onMounted(async () => {
  await nextTick()
  init()
  ro = new ResizeObserver(onResize)
  if (containerRef.value) ro.observe(containerRef.value)
})

onUnmounted(() => { teardown(); ro?.disconnect() })

// Rebuild on embedding dimension change (different axes + camera)
watch(embDim, async () => { await nextTick(); init() })

// Rebuild when input dimension changes (different vector count)
watch(inputDim, async () => { await nextTick(); if (scene) buildVecs(); else init() })

// Flag vector update needed on weight change (batched per frame)
watch(() => svc.W.value, () => { needsVecUpdate = true }, { deep: true })
</script>

<template>
  <div ref="containerRef" class="emb-root">
    <canvas
      ref="canvasRef"
      class="emb-canvas"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @mousedown="onCanvasMouseDown"
      @click="onCanvasClick"
    />
    <!-- Feature legend -->
    <div class="emb-legend">
      <div
        v-for="(_, i) in inputDim"
        :key="i"
        class="legend-item"
        :class="{ dimmed: hoveredIdx !== null && hoveredIdx !== i }"
        @mouseenter="onLegendEnter(i)"
        @mouseleave="onLegendLeave"
        @click="onLegendClick(i)"
      >
        <span class="legend-swatch" :style="{ background: featureColorCss(i, inputDim) }" />
        <span class="legend-text">f{{ i + 1 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emb-root {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.emb-canvas {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  cursor: grab;
  border-radius: 4px;
  border: 1px solid grey;
}
.emb-canvas:active { cursor: grabbing }

.emb-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.65rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: opacity 0.15s;
  user-select: none;
}
.legend-item.dimmed { opacity: 0.35; }

.legend-swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-size: 0.72rem;
  color: var(--color-text-label);
  font-variant-numeric: tabular-nums;
}
</style>

