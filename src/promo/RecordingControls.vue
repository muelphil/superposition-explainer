<script setup lang="ts">
/**
 * Recording tooling for the narrated workshop video (promo branch only).
 * Drives the page from numpad keys so nothing has to be scrolled by hand.
 *
 *   NumpadEnter     next cue (in script order)
 *   Numpad1–9       jump directly to cue 1–9 (subsequent ⏎ continues from there)
 *   NumpadDecimal   back to the top of the page (resets the cue index)
 *   Numpad0         hide / show the cursor
 *   NumpadDivide    start / stop a steady read-through scroll to the bottom
 *   NumpadAdd       show / hide the end slide
 *   NumpadSubtract  play / pause the narration audio
 *
 * Cue targets are marked in the article with data-promo-cue="<id>".
 */
import {ref, onMounted, onUnmounted} from 'vue'
import {ArrowRight, Github} from 'lucide-vue-next'
import AppLogo from '../components/AppLogo.vue'
import {FOCAL_RATIO} from '../components/blogPost/useScrollActiveParagraph'

// ─── Timing / layout constants ────────────────────────────────────────────────

const JUMP_MS = 700               // ease-out section jumps
const READ_THROUGH_MS = 10_000    // whole page, top to bottom, at constant speed
const TOP_OFFSET = 24             // px between container top and a jump target
const FOCAL_GAP = 24              // px kept from the active-block focal line
const GLIDE_PAUSE_MS = 1_500      // glide cues: hold at the section start before gliding
// Glide durations ≈ spoken length of the cue's sentences minus jump + pause (~2.2 s)
const GLIDE_BASES_MS = 22_000     // cue 4: "toy model / math" sentences
const GLIDE_2D_MS = 19_000        // cue 5: "2D example" sentences

const AUDIO_URL = `${import.meta.env.BASE_URL}promo/narration.mp3`

// ─── Cues (order = narration script, see promo/presentation.md) ──────────────

/**
 * Landing rules:
 *  top          element top at TOP_OFFSET below the viewport top
 *  center       element vertically centred in the viewport
 *  before-focal element top just below the focal line (its block not yet active)
 *  end-focal    element bottom just below the focal line (block still active)
 *  activate     block centred on the focal line (guaranteed active), but never
 *               scrolled past its preceding heading
 */
type Landing = 'top' | 'center' | 'before-focal' | 'end-focal' | 'activate'

interface Cue {
  id: string
  landing: Landing
  /**
   * Glide cue: jump to `from` (its top), hold GLIDE_PAUSE_MS, then scroll
   * linearly to the cue target over glideMs.
   */
  glide?: { from: string; ms: number }
}

const CUES: Cue[] = [
  {id: 'intro', landing: 'top'},
  {id: 'fig-params', landing: 'center'},
  {id: 'fig-mismatch', landing: 'center'},
  {id: 'basis-2d', landing: 'before-focal', glide: {from: 'bases', ms: GLIDE_BASES_MS}},
  {id: 'compromise', landing: 'end-focal', glide: {from: 'basis-2d', ms: GLIDE_2D_MS}},
  {id: 'toy-ae', landing: 'top'},
  {id: 'experiments', landing: 'top'},
  {id: 'exp4', landing: 'activate'},
  {id: 'fig-bias', landing: 'center'},
  {id: 'fig-spherical', landing: 'center'},
  {id: 'outlook', landing: 'top'},
]

/** Index of the last cue reached; NumpadEnter goes to cueIndex + 1. */
let cueIndex = -1

// ─── Scroll engine ────────────────────────────────────────────────────────────

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight
const clampScroll = (y: number) => Math.max(0, Math.min(maxScroll(), y))

let rafId: number | null = null
let pauseTimer: ReturnType<typeof setTimeout> | null = null
let readingThrough = false

function stopAnimation() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
  if (pauseTimer !== null) clearTimeout(pauseTimer)
  pauseTimer = null
  readingThrough = false
  document.documentElement.style.scrollBehavior = ''
}

/**
 * Animate window scroll to `target`. Writing scrollTop each frame while CSS
 * smooth scrolling is on would start a native smooth scroll per frame, so it
 * is forced to 'auto' for the duration.
 */
function animateTo(target: number, durationMs: number, ease: (t: number) => number, onDone?: () => void) {
  stopAnimation()
  const from = window.scrollY
  const to = clampScroll(target)
  if (Math.abs(to - from) < 1 || durationMs <= 0) {
    window.scrollTo(0, to)
    onDone?.()
    return
  }
  document.documentElement.style.scrollBehavior = 'auto'
  const start = performance.now()
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs)
    window.scrollTo(0, from + (to - from) * ease(t))
    if (t < 1) {
      rafId = requestAnimationFrame(frame)
    } else {
      stopAnimation()
      onDone?.()
    }
  }
  rafId = requestAnimationFrame(frame)
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const linear = (t: number) => t

function landingTarget(el: HTMLElement, landing: Landing): number {
  const rect = el.getBoundingClientRect()
  const top = rect.top + window.scrollY
  const focal = window.innerHeight * FOCAL_RATIO
  switch (landing) {
    case 'top':
      return top - TOP_OFFSET
    case 'center':
      return top + rect.height / 2 - window.innerHeight / 2
    case 'before-focal':
      return top - (focal + FOCAL_GAP)
    case 'end-focal':
      return top + rect.height - (focal + FOCAL_GAP)
    case 'activate': {
      const centered = top + rect.height / 2 - focal
      const heading = el.previousElementSibling
      if (!heading) return centered
      const headingTop = heading.getBoundingClientRect().top + window.scrollY
      return Math.min(centered, headingTop - TOP_OFFSET)
    }
  }
}

function findCueEl(id: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-promo-cue="${id}"]`)
  if (!el) console.warn(`[recording] cue target "${id}" not found`)
  return el
}

function goToCue(index: number) {
  const cue = CUES[index]
  if (!cue) return
  const el = findCueEl(cue.id)
  if (!el) return
  cueIndex = index

  if (!cue.glide) {
    animateTo(landingTarget(el, cue.landing), JUMP_MS, easeOutCubic)
    return
  }

  // Glide: jump to the section start, hold, then scroll slowly to the cue target
  const {from, ms} = cue.glide
  const startEl = findCueEl(from)
  if (!startEl) return
  animateTo(landingTarget(startEl, 'top'), JUMP_MS, easeOutCubic, () => {
    pauseTimer = setTimeout(() => {
      pauseTimer = null
      animateTo(landingTarget(el, cue.landing), ms, linear)
    }, GLIDE_PAUSE_MS)
  })
}

function toTop() {
  cueIndex = -1
  animateTo(0, JUMP_MS, easeOutCubic)
}

function toggleReadThrough() {
  if (readingThrough) {
    stopAnimation()
    return
  }
  const total = maxScroll()
  const remaining = total - window.scrollY
  if (remaining <= 0 || total <= 0) return
  animateTo(total, READ_THROUGH_MS * remaining / total, linear)
  readingThrough = true
}

// ─── Cursor ───────────────────────────────────────────────────────────────────

const CURSOR_HIDDEN_CLASS = 'promo-cursor-hidden'

function toggleCursor() {
  document.documentElement.classList.toggle(CURSOR_HIDDEN_CLASS)
}

// ─── End slide ────────────────────────────────────────────────────────────────

const endSlide = ref(false)

// ─── Narration audio ──────────────────────────────────────────────────────────

let audio: HTMLAudioElement | null = null

function toggleAudio() {
  audio ??= new Audio(AUDIO_URL)
  if (audio.paused) {
    audio.play().catch(err => console.warn(`[recording] could not play ${AUDIO_URL}:`, err))
  } else {
    audio.pause()
  }
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────

function onKey(e: KeyboardEvent) {
  const digit = /^Numpad([1-9])$/.exec(e.code)
  if (digit) {
    e.preventDefault()
    goToCue(Number(digit[1]) - 1)
    return
  }
  switch (e.code) {
    case 'NumpadEnter':
      goToCue(Math.min(cueIndex + 1, CUES.length - 1))
      break
    case 'NumpadDecimal':
      toTop()
      break
    case 'Numpad0':
      toggleCursor()
      break
    case 'NumpadDivide':
      toggleReadThrough()
      break
    case 'NumpadAdd':
      endSlide.value = !endSlide.value
      break
    case 'NumpadSubtract':
      toggleAudio()
      break
    default:
      return
  }
  e.preventDefault()
}

// Opt out of the Dark Reader extension, which would otherwise recolour the recording.
let darkReaderLock: HTMLMetaElement | null = null

onMounted(() => {
  document.documentElement.classList.add('promo-laser')
  window.addEventListener('keydown', onKey)
  if (!document.querySelector('meta[name="darkreader-lock"]')) {
    darkReaderLock = document.createElement('meta')
    darkReaderLock.name = 'darkreader-lock'
    document.head.appendChild(darkReaderLock)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  darkReaderLock?.remove()
  stopAnimation()
  document.documentElement.classList.remove('promo-laser', CURSOR_HIDDEN_CLASS)
  audio?.pause()
  audio = null
})
</script>

<template>
  <Transition name="end-slide">
    <div v-if="endSlide" class="end-slide">
      <!-- Shared gradient for the wordmark (userSpace = the logo's 3745-wide viewBox) -->
      <svg class="es-defs" aria-hidden="true">
        <defs>
          <linearGradient id="es-feature-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="3745" y2="0">
            <stop offset="0" stop-color="#F69F16"/>
            <stop offset="0.5" stop-color="#F73361"/>
            <stop offset="1" stop-color="#097AFA"/>
          </linearGradient>
        </defs>
      </svg>

      <div class="es-content">
        <div class="es-work">
          <AppLogo class="es-logo"/>
          <div class="es-title">Visualizing Feature Overcompression Through Guided Experimentation</div>
          <div class="es-byline">
            <span class="es-authors">Philip Müller · Peter Steinbach</span>
            <span class="es-affiliation">Helmholtz-Zentrum Dresden-Rossendorf (HZDR)</span>
          </div>
        </div>

        <div class="es-rule"/>

        <div class="es-hook">
          Discover how neural networks store more features than dimensions,
          hands-on, right in your browser.
        </div>

        <div class="es-action">
          <div class="es-label">Try it now</div>
          <div class="es-link">
            philipmueller.dev/superposition-explainer
            <ArrowRight class="es-link-icon"/>
          </div>
          <div class="es-pills">
            <span class="es-pill">
              <Github class="es-pill-icon"/>
              github.com/muelphil/superposition-explainer
            </span>
            <span class="es-pill">VISxAI · IEEE VIS 2026</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
/* Global (unscoped): laser pointer for the recording, beating any cursor: pointer */
html.promo-laser *,
html.promo-laser *::before,
html.promo-laser *::after {
  cursor: url(https://cdn.custom-cursor.com/db/cursor/32/Laser_Cursor.png) 16 16, default !important;
}

html.promo-laser.promo-cursor-hidden *,
html.promo-laser.promo-cursor-hidden *::before,
html.promo-laser.promo-cursor-hidden *::after {
  cursor: none !important;
}
</style>

<style scoped>
/* ── End slide ─────────────────────────────────────────────────
   Feature colours (orange → pink → blue) only in the background glow
   and the wordmark; everything else uses app tokens. */
.end-slide {
  --es-orange: #F69F16;
  --es-pink: #F73361;
  --es-blue: #097AFA;

  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--color-text-primary);
  /* Page background with soft feature-coloured glows */
  background:
      radial-gradient(48vw 48vw at 12% 18%, color-mix(in srgb, var(--es-orange) 16%, transparent), transparent 70%),
      radial-gradient(44vw 44vw at 92% 88%, color-mix(in srgb, var(--es-blue) 18%, transparent), transparent 70%),
      radial-gradient(30vw 30vw at 70% 10%, color-mix(in srgb, var(--es-pink) 9%, transparent), transparent 70%),
      var(--color-bg);
}

.end-slide-enter-active,
.end-slide-leave-active {
  transition: opacity 350ms ease;
}

.end-slide-enter-from,
.end-slide-leave-to {
  opacity: 0;
}

.es-defs {
  position: absolute;
  width: 0;
  height: 0;
}

/* ── Content ── */
.es-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(16px, 2vw, 40px);
  text-align: center;
}

.es-work {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 0.9vw, 18px);
}

/* Wordmark in the feature gradient, without the header's pulsing */
.es-logo.app-logo {
  height: clamp(56px, 7vw, 140px);
}

.es-logo :deep(.logo-segments) {
  fill: url(#es-feature-gradient);
  animation: none;
}

.es-logo :deep(.logo-explainer) {
  fill: var(--color-text-primary);
}

/* Subtitle: clearly above the byline in the hierarchy; wraps into two balanced lines */
.es-title {
  max-width: 60vw;
  margin-bottom: clamp(4px, 0.6vw, 12px);
  font-size: clamp(20px, 2.1vw, 42px);
  font-weight: 600;
  line-height: 1.2;
  text-wrap: balance;
}

/* Byline: authors, affiliation underneath */
.es-byline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
}

.es-authors {
  font-size: clamp(13px, 1.25vw, 25px);
  font-weight: 600;
  color: var(--color-text-primary);
}

.es-affiliation {
  font-size: clamp(11px, 1vw, 20px);
  color: var(--color-text-secondary);
}

.es-rule {
  width: clamp(80px, 9vw, 180px);
  height: 2px;
  background: var(--color-border);
}

.es-hook {
  max-width: 56vw;
  font-family: var(--font-family-label);
  font-size: clamp(20px, 2.2vw, 44px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

/* ── Action ── */
.es-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 0.9vw, 16px);
}

.es-label {
  font-family: var(--font-family-label);
  font-size: clamp(11px, 0.95vw, 19px);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.es-link {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.6em 1.4em;
  border-radius: 999px;
  background: var(--color-interactive);
  color: var(--color-bg);
  font-family: var(--font-family-mono);
  font-size: clamp(17px, 1.8vw, 36px);
  font-weight: 600;
}

.es-link-icon {
  width: 1.1em;
  height: 1.1em;
}

.es-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(8px, 0.8vw, 16px);
}

.es-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.4em 1em;
  border: 1.5px solid var(--color-border);
  border-radius: 999px;
  font-size: clamp(12px, 1.05vw, 21px);
  color: var(--color-text-secondary);
}

.es-pill-icon {
  width: 1.15em;
  height: 1.15em;
}
</style>
