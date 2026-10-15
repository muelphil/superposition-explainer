<script setup lang="ts">
import {ref, computed, provide, onMounted, onUnmounted, nextTick} from 'vue'
import {createAutoencoderService} from '../services/AutoencoderService'
import {createSelectionService} from '../services/SelectionService'
import {themeMode, autoRotate3D} from '../services/SettingsService'
import AutoencoderView from '../components/AutoencoderView.vue'
import EmbeddingView from '../components/embeddingView/EmbeddingView.vue'
import EmbeddingSuperpositionIllustration from '../components/EmbeddingSuperpositionIllustration.vue'
import SphericalCodesChart from '../components/blogPost/SphericalCodesChart.vue'
import AppLogo from '../components/AppLogo.vue'
import {mulberry32, withRng, seededSetup} from './seeded'
import {denseConverged, sparseConverged, sparse3dConverged, STABLE_FOR} from './convergence'

// ─── Recording setup ──────────────────────────────────────────────────────────
// The stage is 1080×1080 CSS px. For a pixel-exact recording, set the browser
// zoom so that devicePixelRatio = 1 (shown on the start overlay).

const SITE_URL = 'philipmueller.dev/superposition-explainer'

// Seeds picked offline with the real AutoencoderService (same seededSetup and
// convergence criteria from ./convergence):
//  dense  (α 0.8, S 0):    keeps features 1+2 at 90°, rest ≤ 0.04; converges at step 777
//  sparse (α 1, S 0.95):   all 5 in a pentagon; converges at step 190.
//                          e1 → 0.84 (others ≤ 0.05); e1+e4 → only feature 5 (0.41)
//  3D     (α 1, S 0.95):   all 8 features represented; converges at step 131
const SEED_DENSE = 9
const SEED_SPARSE = 15
const SEED_3D = 3
// Separate stream for display-only samples, so they never perturb the training RNG
const SEED_DISPLAY = 42

// Opt out of the Dark Reader extension, which would otherwise recolour the stage.
if (!document.querySelector('meta[name="darkreader-lock"]')) {
  const lock = document.createElement('meta')
  lock.name = 'darkreader-lock'
  document.head.appendChild(lock)
}

// Force dark theme without persisting it over the user's saved preference.
const STORAGE_KEY = 'app-theme-mode'
const savedTheme = localStorage.getItem(STORAGE_KEY)
themeMode.value = 'dark'
nextTick(() => {
  if (savedTheme === null) localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, savedTheme)
})

// ─── Services ─────────────────────────────────────────────────────────────────

const svc = createAutoencoderService()
provide('autoencoderService', svc)
const selSvc = createSelectionService()
provide('selectionService', selSvc)

// ─── Stage state ──────────────────────────────────────────────────────────────

type Scene = 'blank' | 'hook' | 'question' | 'model' | 'chart' | 'end'
// The first slide is rendered under the start overlay, so the clip starts on finished content
const scene = ref<Scene>('question')
const caption = ref<{ title: string; sub?: string } | null>({title: 'How does that work?'})
const started = ref(false)
const finished = ref(false)
const dpr = ref(window.devicePixelRatio)

// Model scene: the autoencoder is introduced alone, the embedding view joins later
const showEmb = ref(false)
const trainPhase = ref<'training' | 'converged' | null>(null)

// Taller rows for 5 features, tighter for 8 so the grid still fits the stage
const rowHeight = computed(() => (svc.config.inputDim > 5 ? 64 : 86))

// ─── Focus boxes (guide attention to input / output neurons) ──────────────────

interface Box { left: number; top: number; width: number; height: number }

const aeRef = ref<HTMLElement | null>(null)
interface Verdict { kind: 'good' | 'bad'; title: string; text: string }

const focus = ref(false)
const verdict = ref<Verdict | null>(null)
const boxes = ref<{ input: Box | null; output: Box | null }>({input: null, output: null})

const BOX_PAD = 10

function unionBox(els: Element[], root: DOMRect): Box | null {
  if (!els.length) return null
  const rs = els.map(el => el.getBoundingClientRect())
  const left = Math.min(...rs.map(r => r.left)) - root.left - BOX_PAD
  const top = Math.min(...rs.map(r => r.top)) - root.top - BOX_PAD
  const right = Math.max(...rs.map(r => r.right)) - root.left + BOX_PAD
  const bottom = Math.max(...rs.map(r => r.bottom)) - root.top + BOX_PAD
  return {left, top, width: right - left, height: bottom - top}
}

/** Measure the input-neuron and output-neuron columns of the AE grid. */
function measureBoxes() {
  const root = aeRef.value
  if (!root) return
  const rootRect = root.getBoundingClientRect()
  const wraps = [...root.querySelectorAll<HTMLElement>('.neuron-wrap')]
  const inCol = (col: string) => wraps.filter(w => w.style.gridColumnStart === col)
  boxes.value = {
    input: unionBox(inCol('3'), rootRect),
    output: unionBox(inCol('10'), rootRect),
  }
}

function showFocus() {
  measureBoxes()
  focus.value = true
}

function hideFocus() {
  focus.value = false
  verdict.value = null
}

/** The verdict panel sits below the boxes and their chips. */
const verdictStyle = computed(() => {
  const b = boxes.value.input
  return b ? {top: `${b.top + b.height + 54}px`} : {display: 'none'}
})

/**
 * Display a hand-picked input/output pair, independent of the model's weights,
 * to illustrate how to read a reconstruction from the neuron colours.
 */
function showPattern(x: number[], xHat: number[]) {
  svc.currentInput.value = [...x]
  svc.currentOutput.value = [...xHat]
  svc.currentError.value = x.map((xi, i) => xi - xHat[i])
}

const boxStyle = (b: Box | null) =>
    b ? {left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px`} : {display: 'none'}

// ─── Timeline helpers ─────────────────────────────────────────────────────────

let cancelled = false
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function say(title: string, sub?: string) {
  caption.value = {title, sub}
}

/** Input vector with the given (0-based) features set to 1. */
function input(...active: number[]): number[] {
  return Array.from({length: svc.config.inputDim}, (_, j) => (active.includes(j) ? 1 : 0))
}

/**
 * Train like the real app until the convergence criterion holds for STABLE_FOR
 * consecutive steps. Steps are paced at a constant rate; `isTraining` drives the
 * flowing connection animation, and each step displays its own training sample
 * (inputs, outputs and embedding dot change live).
 */
function trainUntilConverged(
    rng: () => number,
    converged: (W: number[][]) => boolean,
    stepsPerSec: number,
    maxSteps = 4000,
) {
  return new Promise<void>(resolve => {
    const start = performance.now()
    let done = 0
    let stable = 0
    svc.isTraining.value = true
    trainPhase.value = 'training'

    const finish = (ok: boolean) => {
      svc.isTraining.value = false
      trainPhase.value = ok ? 'converged' : null
      resolve()
    }

    const frame = () => {
      if (cancelled) return finish(false)
      const target = Math.min(maxSteps, Math.floor((performance.now() - start) / 1000 * stepsPerSec))
      let ok = false
      withRng(rng, () => {
        while (done < target && !ok) {
          svc.stepTrain()
          done++
          stable = converged(svc.W.value) ? stable + 1 : 0
          ok = stable >= STABLE_FOR
        }
      })
      if (ok || done >= maxSteps) finish(ok)
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

// Illustrative reconstruction patterns (not produced by the model):
// features 1, 3, 5 strong, feature 4 light, feature 2 off
const PATTERN_IN = [1.0, 0, 1.0, 0.5, 1.0]
const PATTERN_GOOD = [0.97, 0, 0.98, 0.48, 0.96]
const PATTERN_BAD = [0, 0.95, 0, 0, 0.4]

// ─── Timeline (~95 s) ─────────────────────────────────────────────────────────

async function play() {
  // The first slide is already on screen under the start overlay: no fade-in to trim.
  started.value = true

  // 1 — The question: millions of concepts vs. thousands of dimensions
  await wait(6000)

  // 2 — Restated with the illustration
  scene.value = 'hook'
  say('More concepts than dimensions.',
      'Language models must represent a vast number of features in just a few thousand embedding dimensions.')
  await wait(4500)

  // 3 — Toy model: the autoencoder alone, randomly initialised, dense random input
  const rngDense = mulberry32(SEED_DENSE)
  const rngDisplay = mulberry32(SEED_DISPLAY)
  seededSetup(svc, rngDense, {n: 5, m: 2, sparsity: 0, featureDecay: 0.8})
  withRng(rngDisplay, () => svc.runForward())
  showEmb.value = false
  scene.value = 'model'
  say('A tiny toy model: an autoencoder.', '5 features in, squeezed through 2 embedding dimensions, then reconstructed.')
  await wait(4500)

  // 4 — How to read a reconstruction (illustrative patterns, independent of the weights)
  showPattern(PATTERN_IN, PATTERN_GOOD)
  say('Goal: output = input.', 'Compare the colours of the input and output neurons.')
  await wait(400)
  showFocus()
  await wait(2600)
  verdict.value = {
    kind: 'good',
    title: '✓ Good reconstruction',
    text: 'The output neurons light up just like the input neurons.',
  }
  await wait(4000)
  showPattern(PATTERN_IN, PATTERN_BAD)
  verdict.value = {
    kind: 'bad',
    title: '✗ Bad reconstruction',
    text: 'Same input, but the output looks nothing like it.',
  }
  await wait(4000)

  // 5 — Embedding space joins (back to the real, untrained model)
  hideFocus()
  withRng(rngDisplay, () => svc.runForward())
  showEmb.value = true
  say('Each feature is an arrow in embedding space.', 'Training moves the arrows. Let’s watch.')
  await wait(3500)

  // 6 — Case 1: dense features
  say('Case 1: features often active together', '…and some matter more than others.')
  await wait(600)
  await trainUntilConverged(rngDense, denseConverged, 120)
  say('It keeps the 2 most important features and drops the rest.', 'Sharing directions would mean constant crosstalk.')
  await wait(3000)

  // 7 — Case 2: sparse features (fresh init)
  trainPhase.value = null
  const rngSparse = mulberry32(SEED_SPARSE)
  seededSetup(svc, rngSparse, {n: 5, m: 2, sparsity: 0.95, featureDecay: 1.0})
  svc.runForward(input(0))
  say('Case 2: features rarely active (sparse)', '…and all equally important.')
  await wait(800)
  await trainUntilConverged(rngSparse, sparseConverged, 30)
  say('Now it packs all 5.', 'Each feature gets its own direction. 5 directions in 2 dimensions can’t all be orthogonal, so they overlap.')
  await wait(3500)

  // 8 — The cost: interference
  svc.runForward(input(0))
  showFocus()
  say('One feature active: read out cleanly.')
  verdict.value = {kind: 'good', title: '✓ Clean readout', text: 'Feature 1 in, feature 1 out.'}
  await wait(3500)
  svc.runForward(input(0, 3))
  say('Two at once: interference.', 'Features 1 and 4 vanish. The model reports feature 5, which isn’t there.')
  verdict.value = {kind: 'bad', title: '✗ Interference', text: 'Features 1 and 4 in, a phantom feature 5 out.'}
  await wait(5000)

  // 9 — Why it pays off
  hideFocus()
  svc.runForward(input(0))
  say('Real features are sparse, so collisions are rare.')
  await wait(2500)
  say('That trade-off is superposition.')
  await wait(2500)

  // 10 — 3D
  trainPhase.value = null
  const rng3d = mulberry32(SEED_3D)
  seededSetup(svc, rng3d, {n: 8, m: 3, sparsity: 0.95, featureDecay: 1.0})
  svc.runForward(input(0))
  autoRotate3D.value = true
  say('In 3D: 8 sparse features fit.')
  await wait(800)
  await trainUntilConverged(rng3d, sparse3dConverged, 25)
  await wait(1500)

  // 11 — Scaling
  scene.value = 'chart'
  say('And the room grows exponentially.', 'The number of nearly-orthogonal directions explodes with dimension.')
  await wait(8000)

  // 12 — End card, held long enough to read; then signal (outside the stage) that recording can stop
  scene.value = 'end'
  caption.value = null
  await wait(10000)
  finished.value = true
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'r' || e.key === 'R') location.reload()
}

onMounted(() => {
  document.documentElement.style.fontSize = '17px'
  window.addEventListener('keydown', onKey)
  if (new URLSearchParams(location.search).has('autostart')) play()
})

onUnmounted(() => {
  cancelled = true
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="promo-page">
    <div class="promo-stage" :class="`scene-${scene}`">

      <!-- ── Caption ───────────────────────────────────────── -->
      <div class="caption-area">
        <Transition name="cap" mode="out-in">
          <div v-if="caption" :key="caption.title" class="caption">
            <div class="caption-title">{{ caption.title }}</div>
            <div v-if="caption.sub" class="caption-sub">{{ caption.sub }}</div>
          </div>
        </Transition>
      </div>

      <!-- ── Layer: hook illustration ──────────────────────── -->
      <div class="layer layer-hook" :class="{ on: scene === 'hook' }">
        <EmbeddingSuperpositionIllustration/>
      </div>

      <!-- ── Layer: question (millions of concepts vs. thousands of dimensions) ── -->
      <div class="layer layer-question" :class="{ on: scene === 'question' }">
        <div class="split-col">
          <div class="split-big split-big--many">Millions</div>
          <div class="split-label">of concepts and facts<br/>in language</div>
          <div class="split-note">Anthropic extracted 34 million features from a single model (2024)</div>
        </div>
        <div class="split-arrow">
          <span>must fit into</span>
          <span class="split-arrow-glyph">→</span>
        </div>
        <div class="split-col">
          <div class="split-big split-big--few">Thousands</div>
          <div class="split-label">of embedding<br/>dimensions</div>
          <div class="split-note">e.g. 4,096 in Llama 3 8B</div>
        </div>
      </div>

      <!-- ── Layer: live model ─────────────────────────────── -->
      <div
          class="layer layer-model"
          :class="{ on: scene === 'model', 'emb-hidden': !showEmb, focusing: focus }"
          :style="{ '--promo-row': `${rowHeight}px` }"
      >
        <div ref="aeRef" class="panel-col promo-ae">
          <div class="label-header">Autoencoder</div>
          <AutoencoderView/>

          <!-- Focus boxes around input and output neurons -->
          <div class="focus-box" :class="{ on: focus }" :style="boxStyle(boxes.input)">
            <span class="focus-chip">Input</span>
          </div>
          <div class="focus-box" :class="{ on: focus }" :style="boxStyle(boxes.output)">
            <span class="focus-chip">Output</span>
          </div>

          <!-- Verdict panel below the boxes -->
          <div class="verdict-area" :style="verdictStyle">
            <Transition name="cap" mode="out-in">
              <div v-if="verdict" :key="verdict.title" class="verdict" :class="`verdict--${verdict.kind}`">
                <div class="verdict-title">{{ verdict.title }}</div>
                <div class="verdict-text">{{ verdict.text }}</div>
              </div>
            </Transition>
          </div>
        </div>
        <div class="panel-col promo-emb">
          <div class="emb-label-row">
            <div class="label-header">Embedding space</div>
            <Transition name="cap" mode="out-in">
              <span v-if="trainPhase" :key="trainPhase" class="train-pill" :class="`train-pill--${trainPhase}`">
                {{ trainPhase === 'training' ? 'Training…' : 'Converged ✓' }}
              </span>
            </Transition>
          </div>
          <div class="emb-frame">
            <EmbeddingView/>
          </div>
        </div>
      </div>

      <!-- ── Layer: spherical codes chart ──────────────────── -->
      <div class="layer layer-chart" :class="{ on: scene === 'chart' }">
        <div class="chart-reveal">
          <SphericalCodesChart/>
        </div>
        <div class="chart-stat">
          <div class="chart-stat-text">
            In GPT-3’s <strong>12,288</strong> dimensions, over <strong>40 billion</strong>
            directions fit at least 85° apart.
          </div>
          <div class="chart-stat-source">N. Yoder, via 3Blue1Brown</div>
        </div>
      </div>

      <!-- ── Layer: end card ───────────────────────────────── -->
      <div class="layer layer-end" :class="{ on: scene === 'end' }">
        <div class="end-kicker">Explore it yourself</div>
        <div class="end-headline">See superposition emerge,<br/>step by step.</div>
        <div class="end-body">
          Read the full interactive explainer and run every experiment
          yourself, right in your browser:
        </div>
        <div class="end-url">{{ SITE_URL }}</div>
        <div class="end-meta">
          <div class="end-paper"><em>Superposition in Neural Networks: A Visual Exploration</em></div>
          <div class="end-authors">Philip Müller · Peter Steinbach</div>
          <div class="end-venue">
            Accepted at the 9th Workshop on Visualization for AI Explainability (VISxAI)<br/>
            IEEE VIS · October 2026 · Boston, MA
          </div>
        </div>
      </div>

      <!-- ── Persistent brand bar ──────────────────────────── -->
      <div class="brand-bar" :class="{ on: scene !== 'end' && scene !== 'blank' && !verdict }">
        <AppLogo class="logo-sm"/>
        <span class="brand-url">{{ SITE_URL }}</span>
      </div>

      <!-- ── Start overlay (not part of the clip) ──────────── -->
      <div v-if="!started" class="start-overlay" @click="play">
        <div class="start-btn">▶ Start</div>
        <div class="start-hint">
          devicePixelRatio = {{ dpr }}
          <span v-if="dpr !== 1"> · set the browser zoom so this reads 1 for a pixel-exact 1080×1080 recording</span>
          <br/>Press R to restart
        </div>
      </div>
    </div>

    <!-- Outside the 1080×1080 stage: tells the recorder the clip is complete -->
    <div v-if="finished" class="done-cue">■ Clip complete — stop recording</div>
  </div>
</template>

<style scoped>
.promo-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

.promo-stage {
  position: relative;
  width: 1080px;
  height: 1080px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--color-bg);
  color: var(--color-text-primary);
  cursor: none;
  --blog-prose-width: 920px;
  --promo-good: #4ade80;
}

/* ── Caption ─────────────────────────────────────────────────── */
.caption-area {
  position: absolute;
  top: 64px;
  left: 64px;
  right: 64px;
  height: 200px;
  z-index: 5;
}

.scene-blank .caption-area {
  top: 600px;
  text-align: center;
}

.scene-question .caption-area {
  top: 220px;
  text-align: center;
}

.caption-title {
  font-family: var(--font-family-label);
  font-size: 54px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}

.caption-sub {
  margin-top: 16px;
  font-size: 30px;
  line-height: 1.3;
  color: var(--color-text-secondary);
}

.cap-enter-active,
.cap-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.cap-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.cap-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ── Layers ──────────────────────────────────────────────────── */
.layer {
  position: absolute;
  left: 56px;
  right: 56px;
  top: 270px;
  bottom: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.layer.on {
  opacity: 1;
}

.layer-hook :deep(.superposition-illustration-container) {
  margin: 0 auto;
}

/* ── Question: split slide ───────────────────────────────────── */
.layer-question {
  top: 390px;
  gap: 28px;
  align-items: flex-start;
}

.split-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
}

.split-big {
  font-family: var(--font-family-label);
  font-size: 92px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}

/* Feature gradient (orange → pink → blue, as in featureColor.ts) for the many concepts */
.split-big--many {
  background: linear-gradient(90deg, #F69F16, #F73361, #097AFA);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.split-big--few {
  color: var(--color-text-primary);
}

.split-label {
  font-size: 32px;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.split-note {
  max-width: 340px;
  margin-top: 14px;
  font-size: 20px;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.split-arrow {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 20px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.split-arrow-glyph {
  font-size: 88px;
  line-height: 1;
  color: var(--color-interactive);
}

/* ── Live model ──────────────────────────────────────────────── */
.layer-model {
  gap: 28px;
  align-items: flex-start;
}

.panel-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.promo-ae {
  position: relative;
  width: 570px;
  transition: transform 0.9s ease-in-out;
}

.promo-emb {
  width: 370px;
  transition: opacity 0.8s ease 0.4s;
}

/* Autoencoder introduced alone: centered (pure translation, no scaling), embedding hidden */
.layer-model.emb-hidden .promo-ae {
  transform: translateX(199px);
}

.layer-model.emb-hidden .promo-emb {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.emb-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
}

.train-pill {
  font-family: var(--font-family-mono);
  font-size: 16px;
  font-weight: 600;
  padding: 2px 12px;
  border-radius: 999px;
  border: 1.5px solid currentColor;
  font-variant-numeric: tabular-nums;
}

.train-pill--training {
  color: var(--color-interactive);
}

.train-pill--converged {
  color: var(--promo-good);
}

/* ── Focus boxes ─────────────────────────────────────────────── */
.focus-box {
  position: absolute;
  z-index: 3;
  border: 3px solid var(--color-interactive);
  border-radius: 14px;
  box-shadow: 0 0 0 6px rgba(107, 154, 239, 0.15);
  opacity: 0;
  transform: scale(1.15);
  transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: none;
}

.focus-box.on {
  opacity: 1;
  transform: none;
}

/* Output box follows the input box with a short delay */
.focus-box.on + .focus-box.on {
  transition-delay: 0.35s;
}

.focus-chip {
  position: absolute;
  left: 50%;
  top: calc(100% + 10px);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  font-family: var(--font-family-label);
  font-size: 20px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 999px;
  background: var(--color-interactive);
  color: var(--color-bg);
}

/* While focusing, dim everything between the input and output neurons */
.layer-model.focusing .promo-ae :deep(.connections-svg),
.layer-model.focusing .promo-ae :deep(.emb-column),
.layer-model.focusing .promo-ae :deep(.act-icons),
.layer-model.focusing .promo-ae :deep(.cell-hover-zone),
.layer-model.focusing .promo-ae :deep(.output-value) {
  opacity: 0.2;
  transition: opacity 0.4s ease;
}

.verdict-area {
  position: absolute;
  left: -40px;
  right: -40px;
  display: flex;
  justify-content: center;
  z-index: 3;
}

.verdict {
  padding: 12px 26px;
  border-radius: var(--radius-lg);
  border-left: 5px solid currentColor;
  background: var(--color-bg-secondary);
  text-align: left;
}

.verdict-title {
  font-family: var(--font-family-label);
  font-size: 26px;
  font-weight: 700;
}

.verdict-text {
  margin-top: 4px;
  font-size: 21px;
  color: var(--color-text-primary);
}

.verdict--good {
  color: var(--promo-good);
}

.verdict--bad {
  color: var(--color-error);
}

/* ── Recording cue (outside the stage) ───────────────────────── */
.done-cue {
  position: fixed;
  left: 12px;
  top: 12px;
  font-family: var(--font-family-mono);
  font-size: 14px;
  color: #888;
}

.emb-frame {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  overflow: hidden;
}

/* Scale the autoencoder grid natively (no transforms: its SVG connections are measured in layout px) */
.promo-stage .promo-ae :deep(.ae-grid) {
  --row-height: var(--promo-row);
  --col-features: 92px;
  --col-outputs: 92px;
}

.promo-ae :deep(.dim-btns),
.promo-ae :deep(.resample-all-btn),
.promo-emb :deep(.camera-reset-btn) {
  display: none;
}

/* ── Chart (wipe-in reveal) ──────────────────────────────────── */
.chart-reveal {
  width: 920px;
  clip-path: inset(0 100% 0 0);
}

.layer-chart.on .chart-reveal {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2.6s ease-out 0.3s;
}

.layer-chart {
  top: 240px;
  flex-direction: column;
  gap: 18px;
}

.chart-stat {
  max-width: 860px;
  padding: 14px 28px;
  border-left: 4px solid var(--color-interactive);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  opacity: 0;
  transform: translateY(16px);
}

.layer-chart.on .chart-stat {
  animation: end-in 0.7s ease-out 3.2s forwards;
}

.chart-stat-text {
  font-size: 30px;
  line-height: 1.35;
}

.chart-stat-text strong {
  color: var(--color-interactive);
}

.chart-stat-source {
  margin-top: 8px;
  font-size: 18px;
  color: var(--color-text-secondary);
}

/* ── End card ────────────────────────────────────────────────── */
.layer-end {
  top: 0;
  bottom: 0;
  flex-direction: column;
  gap: 26px;
  text-align: center;
}

/* Staggered fade-up so the end card keeps moving instead of just stopping */
.layer-end > * {
  opacity: 0;
  transform: translateY(16px);
}

.layer-end.on > * {
  animation: end-in 0.6s ease-out forwards;
}

.layer-end.on > :nth-child(2) { animation-delay: 0.25s; }
.layer-end.on > :nth-child(3) { animation-delay: 0.6s; }
.layer-end.on > :nth-child(4) { animation-delay: 1.0s; }
.layer-end.on > :nth-child(5) { animation-delay: 1.6s; }

@keyframes end-in {
  to {
    opacity: 1;
    transform: none;
  }
}

.end-kicker {
  font-family: var(--font-family-label);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-interactive);
}

.end-headline {
  font-family: var(--font-family-label);
  font-size: 58px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.end-body {
  max-width: 820px;
  font-size: 30px;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.end-url {
  font-family: var(--font-family-mono);
  font-size: 36px;
  font-weight: 600;
  color: var(--color-interactive);
  padding: 14px 32px;
  border: 2px solid var(--color-interactive);
  border-radius: 999px;
}

/* URL: fade in with the others, then pulse gently as the call to action */
.layer-end.on > .end-url {
  animation: end-in 0.6s ease-out 1s forwards, url-pulse 2.4s ease-in-out 1.6s infinite;
}

@keyframes url-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(107, 154, 239, 0); }
  50% { box-shadow: 0 0 0 10px rgba(107, 154, 239, 0.18); }
}

.end-meta {
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.end-paper {
  font-size: 24px;
  color: var(--color-text-primary);
}

.end-authors {
  font-size: 22px;
  color: var(--color-text-secondary);
}

.end-venue {
  margin-top: 12px;
  font-size: 21px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* ── Brand bar ───────────────────────────────────────────────── */
.brand-bar {
  position: absolute;
  left: 64px;
  right: 64px;
  bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.brand-bar.on {
  opacity: 1;
}

.logo-sm :deep(.app-logo),
.logo-sm.app-logo {
  height: 46px;
}

.brand-url {
  font-family: var(--font-family-mono);
  font-size: 22px;
  color: var(--color-text-secondary);
}

/* ── Start overlay ───────────────────────────────────────────── */
.start-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: var(--color-bg);
  cursor: pointer;
}

.start-btn {
  font-family: var(--font-family-label);
  font-size: 40px;
  padding: 16px 40px;
  border: 2px solid var(--color-interactive);
  border-radius: 999px;
  color: var(--color-interactive);
}

.start-hint {
  font-size: 18px;
  text-align: center;
  color: var(--color-text-secondary);
}
</style>
