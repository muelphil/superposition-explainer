<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import type { SelectionServiceType } from '../services/SelectionService'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

// ── Template refs ────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef    = ref<HTMLCanvasElement | null>(null)
const hoveredIdx   = ref<number | null>(null)        // feature vec hover (local visual)
const hoveredEmbAxisIdx = ref<number | null>(null)   // axis hover (for click dispatch)

// ── Color palette (up to 8 features) ─────────────────────────
const PALETTE_HEX = [
  '#f97316', '#3b82f6', '#22c55e', '#ec4899',
  '#a855f7', '#06b6d4', '#eab308', '#6366f1',
]
const PALETTE  = PALETTE_HEX.map(h => new THREE.Color(h))
const GREY_COL = new THREE.Color(0.68, 0.68, 0.68)

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
  arrow:   THREE.ArrowHelper
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

function makeAxisLabel(text: string, color = '#b0bec5'): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.font = 'bold 44px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 32, 32)
  const tex = new THREE.CanvasTexture(c)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  )
  sprite.scale.set(0.22, 0.22, 0.22)
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
  scene?.remove(vv.arrow)
  scene?.remove(vv.hitMesh)
  ;(vv.arrow.line.material as THREE.Material).dispose()
  vv.arrow.line.geometry.dispose()
  ;(vv.arrow.cone.material as THREE.Material).dispose()
  vv.arrow.cone.geometry.dispose()
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
  camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100)

  // Camera position: angled for 3D, face-on for 2D/1D
  if (embDim.value === 3) {
    camera.position.set(1.9, 1.5, 3.1)
  } else {
    camera.position.set(0, 0, 5.5)
  }
  camera.lookAt(0, 0, 0)

  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance   = 1.5
  controls.maxDistance   = 14
  controls.enablePan     = false
  if (embDim.value === 1) controls.enableRotate = false

  buildAxes()
  buildVecs()
  renderLoop()
}

// ── Axes ──────────────────────────────────────────────────────
const AXIS_LEN = 1.6

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

  const AXIS_COL  = 0xd1d5db   // slate-300 — subtle
  const labels    = ['x', 'y', 'z']
  const axisDirs  = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ]
  const numAxes = Math.min(Math.max(embDim.value, 1), 3)

  for (let a = 0; a < numAxes; a++) {
    const dir = axisDirs[a]
    const axMat = new THREE.LineBasicMaterial({ color: AXIS_COL, opacity: 0.55, transparent: true })

    // Bidirectional axis line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      dir.clone().multiplyScalar(-AXIS_LEN),
      dir.clone().multiplyScalar(AXIS_LEN),
    ])
    grp.add(new THREE.Line(lineGeom, axMat.clone()))

    // Arrow tip at positive end
    const tip = new THREE.ArrowHelper(
      dir, dir.clone().multiplyScalar(AXIS_LEN - 0.18),
      0.22, AXIS_COL, 0.16, 0.07,
    )
    grp.add(tip)

    // Tick marks at ±1 unit
    const perp = a === 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    for (const s of [1, -1]) {
      const tickPts = [
        dir.clone().multiplyScalar(s).add(perp.clone().multiplyScalar(-0.05)),
        dir.clone().multiplyScalar(s).add(perp.clone().multiplyScalar( 0.05)),
      ]
      const tg = new THREE.BufferGeometry().setFromPoints(tickPts)
      grp.add(new THREE.Line(tg, new THREE.LineBasicMaterial({ color: AXIS_COL, opacity: 0.4, transparent: true })))
    }

    // Axis label at tip
    const lbl = makeAxisLabel(labels[a])
    lbl.position.copy(dir.clone().multiplyScalar(AXIS_LEN + 0.22))
    grp.add(lbl)

    // Invisible hit cylinder for hover/click on axis (maps to embedding dim a)
    const hitGeom = new THREE.CylinderGeometry(0.08, 0.08, AXIS_LEN * 2, 8)
    const hitMesh = new THREE.Mesh(hitGeom, new THREE.MeshBasicMaterial({ visible: false }))
    // CylinderGeometry is along Y by default — rotate to match axis direction
    if (a === 0) hitMesh.rotation.z = Math.PI / 2   // align to X
    if (a === 2) hitMesh.rotation.x = Math.PI / 2   // align to Z
    // a === 1 (Y axis) needs no rotation
    hitMesh.userData.aIdx = a
    scene!.add(hitMesh)
    axisHitMeshes.push(hitMesh)
  }

  // Small origin sphere
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 10),
    new THREE.MeshBasicMaterial({ color: AXIS_COL }),
  )
  grp.add(dot)
}

// ── Vectors ───────────────────────────────────────────────────
function buildVecs() {
  if (!scene) return
  vecs.forEach(vv => disposeVec(vv))
  vecs = []

  for (let i = 0; i < inputDim.value; i++) {
    const col = PALETTE[i % PALETTE.length].clone()
    const v   = featureVec(i)
    const len = v.length()
    const vis = len > 0.01
    const safeLen = Math.max(len, 0.01)
    const dir     = vis ? v.clone().normalize() : new THREE.Vector3(1, 0, 0)
    const headLen = Math.min(0.13, safeLen * 0.35)
    const headW   = Math.min(0.07, safeLen * 0.22)

    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), safeLen, col.getHex(), headLen, headW)
    arrow.visible = vis
    ;(arrow.line.material as THREE.LineBasicMaterial).transparent = true
    ;(arrow.cone.material as THREE.MeshBasicMaterial).transparent = true
    scene.add(arrow)

    const hitLen  = safeLen + 0.12
    const hitGeom = new THREE.CylinderGeometry(0.075, 0.075, hitLen, 6)
    const hitMesh = new THREE.Mesh(hitGeom, new THREE.MeshBasicMaterial({ visible: false }))
    hitMesh.position.copy(dir.clone().multiplyScalar(hitLen / 2))
    hitMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    hitMesh.userData.vIdx = i
    scene.add(hitMesh)

    vecs.push({ arrow, hitMesh, color: col, idx: i })
  }
  applyHover()
}

function updateVecs() {
  if (!scene || vecs.length !== inputDim.value) { buildVecs(); return }

  for (let i = 0; i < inputDim.value; i++) {
    const vv  = vecs[i]
    const v   = featureVec(i)
    const len = v.length()
    const vis = len > 0.01

    vv.arrow.visible  = vis
    vv.hitMesh.visible = vis
    if (!vis) continue

    const dir     = v.clone().normalize()
    const headLen = Math.min(0.13, len * 0.35)
    const headW   = Math.min(0.07, len * 0.22)
    vv.arrow.setDirection(dir)
    vv.arrow.setLength(len, headLen, headW)

    const hitLen = len + 0.12
    vv.hitMesh.geometry.dispose()
    vv.hitMesh.geometry = new THREE.CylinderGeometry(0.075, 0.075, hitLen, 6)
    vv.hitMesh.position.copy(dir.clone().multiplyScalar(hitLen / 2))
    vv.hitMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }
  applyHover()
}

function applyHover() {
  const h = hoveredIdx.value
  for (const vv of vecs) {
    const dim     = h !== null && h !== vv.idx
    const col     = dim ? GREY_COL : vv.color
    const opacity = dim ? 0.35 : 1.0
    const lm = vv.arrow.line.material as THREE.LineBasicMaterial
    const cm = vv.arrow.cone.material as THREE.MeshBasicMaterial
    lm.color.copy(col); lm.opacity = opacity
    cm.color.copy(col); cm.opacity = opacity
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
        <span class="legend-swatch" :style="{ background: PALETTE_HEX[i % PALETTE_HEX.length] }" />
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
}
.emb-canvas:active { cursor: grabbing; }

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

