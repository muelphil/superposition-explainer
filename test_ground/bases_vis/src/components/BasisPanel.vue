<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { BasisPreset } from '@/lib/basisPresets'
import CoordinateSystemViz from './CoordinateSystemViz.vue'
import MathBlock from './MathBlock.vue'

const props = defineProps<{
  preset: BasisPreset
}>()

// ── Animation state ─────────────────────────────────────────────
const step = ref(0)
const maxStep = 3
const showNaive = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function play() {
  stop()
  step.value = 0
  timer = setInterval(() => {
    if (step.value < maxStep) {
      step.value++
    } else {
      stop()
    }
  }, 900)
}

function stop() {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

function replay() {
  play()
}

// Auto-play via IntersectionObserver
const panelEl = ref<HTMLElement>()
let observer: IntersectionObserver | undefined

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        play()
        observer?.disconnect()
      }
    },
    { threshold: 0.25 },
  )
  if (panelEl.value) observer.observe(panelEl.value)
})

onUnmounted(() => {
  stop()
  observer?.disconnect()
})

// ── Per-type math formulas ──────────────────────────────────────
const formulas = computed(() => {
  const p = props.preset
  if (p.type === 'arbitrary') {
    return {
      lines: [
        { tex: String.raw`\mathbf{x} = c_1\,\mathbf{w}_1 + c_2\,\mathbf{w}_2`, display: true },
        {
          tex: String.raw`\begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix} \begin{bmatrix} c_1 \\ c_2 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}`,
          display: true,
        },
        {
          tex: String.raw`\mathbf{c} = W^{-1}\mathbf{x} \;\;\Rightarrow\;\; c_1 = \tfrac{4}{3},\;\; c_2 = \tfrac{1}{3}`,
          display: true,
        },
      ],
    }
  }
  if (p.type === 'orthogonal') {
    return {
      lines: [
        {
          tex: String.raw`\mathbf{x}\cdot\mathbf{w}_i = c_i\,\|\mathbf{w}_i\|^2 \quad\text{(cross terms vanish)}`,
          display: true,
        },
        {
          tex: String.raw`c_i = \frac{\mathbf{x}\cdot\mathbf{w}_i}{\|\mathbf{w}_i\|^2}`,
          display: true,
        },
        {
          tex: String.raw`c_1 = \frac{8}{5} = 1.6 \qquad c_2 = \frac{0.5}{1.25} = 0.4`,
          display: true,
        },
      ],
    }
  }
  // orthonormal
  return {
    lines: [
      {
        tex: String.raw`\|\mathbf{w}_i\| = 1 \;\;\Longrightarrow\;\; c_i = \mathbf{x}\cdot\mathbf{w}_i`,
        display: true,
      },
      {
        tex: String.raw`c_1 = \tfrac{8}{\sqrt{5}} \approx 3.58 \qquad c_2 = \tfrac{1}{\sqrt{5}} \approx 0.45`,
        display: true,
      },
      {
        tex: String.raw`\mathbf{c} = W^\top\!\mathbf{x}`,
        display: true,
      },
    ],
  }
})

// ── Per-type captions ───────────────────────────────────────────
const caption = computed(() => {
  if (props.preset.type === 'arbitrary') {
    return {
      heading: 'Coordinates are coupled',
      body: 'In a skewed basis, each coordinate is influenced by both basis directions. A perpendicular projection onto one axis is contaminated by the other — both coefficients must be solved together via a linear system.',
    }
  }
  if (props.preset.type === 'orthogonal') {
    return {
      heading: 'Coordinates decouple',
      body: 'Orthogonality eliminates cross-talk: each coefficient can be recovered independently via projection. The only extra step is dividing by the squared length of the basis vector.',
    }
  }
  return {
    heading: 'Projections are coordinates',
    body: 'With unit-length perpendicular axes, the dot product directly gives the coordinate — no coupling, no scale correction. This is why the transpose becomes the natural readout: c = Wᵀx.',
  }
})

// ── Subtitle ────────────────────────────────────────────────────
const subtitle = computed(() => {
  if (props.preset.type === 'arbitrary')
    return 'Linearly independent, but not perpendicular'
  if (props.preset.type === 'orthogonal')
    return 'Perpendicular, but different lengths'
  return 'Perpendicular and unit length'
})
</script>

<template>
  <article ref="panelEl" class="panel basis-panel">
    <header class="panel-header">
      <h3 class="panel-title" :class="preset.type">
        {{ preset.label }}
      </h3>
      <p class="panel-subtitle">{{ subtitle }}</p>
    </header>

    <!-- Visualization -->
    <CoordinateSystemViz
      :preset="preset"
      :step="step"
      :show-naive-projection="showNaive"
    />

    <!-- Controls -->
    <div class="controls">
      <button class="btn" @click="replay" aria-label="Replay animation">
        ↺ Replay
      </button>
      <label v-if="preset.type === 'arbitrary'" class="toggle-label">
        <input type="checkbox" v-model="showNaive" />
        Show naive projection
      </label>
    </div>

    <!-- Math -->
    <div class="math-section">
      <MathBlock
        v-for="(f, i) in formulas.lines"
        :key="i"
        :tex="f.tex"
        :display-mode="f.display"
      />
    </div>

    <!-- Takeaway -->
    <div class="takeaway">
      <strong>{{ caption.heading }}.</strong> {{ caption.body }}
    </div>
  </article>
</template>

<style scoped>
.basis-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.panel-header {
  text-align: center;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.15rem;
}

.panel-title.arbitrary {
  color: #92400e;
}

.panel-title.orthogonal {
  color: #1e40af;
}

.panel-title.orthonormal {
  color: #5b21b6;
}

.panel-subtitle {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
