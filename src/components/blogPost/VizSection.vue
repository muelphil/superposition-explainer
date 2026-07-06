<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed, watch} from 'vue'
import {FlaskConical, X} from 'lucide-vue-next'
import {onActiveBlockSeen} from './activeBlockBus'

defineProps<{ heading?: string }>()

const showViz = ref(false)
const isMobile = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)

const seenBlocks = new Set<HTMLElement>()
const pendingBlock = ref<HTMLElement | null>(null)

let mql: MediaQueryList | null = null
let observer: IntersectionObserver | null = null
let unsubBus = () => {
}

onMounted(() => {
  mql = window.matchMedia('(max-width: 768px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => {
    isMobile.value = e.matches
  })

  observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.value = entry.isIntersecting
      },
      {threshold: 0.01, rootMargin: '0px 0px 60% 0px'}
  )
  if (sectionRef.value) observer.observe(sectionRef.value)

  unsubBus = onActiveBlockSeen((blockEl: HTMLElement) => {
    if (!isMobile.value) return
    const section = sectionRef.value
    if (!section || !section.contains(blockEl)) return
    if (seenBlocks.has(blockEl)) { pendingBlock.value = null; return }
    pendingBlock.value = blockEl
  })
})

onUnmounted(() => {
  mql?.removeEventListener('change', () => {
  })
  observer?.disconnect()
  unsubBus()
  document.body.style.overflow = ''
})

const showFab = computed(() => isMobile.value && isVisible.value)

function toggleViz() {
  showViz.value = !showViz.value
  if (showViz.value) {
    document.body.style.overflow = 'hidden'
    if (pendingBlock.value) {
      seenBlocks.add(pendingBlock.value)
      pendingBlock.value = null
    }
  } else {
    document.body.style.overflow = ''
  }
}

// Reset scroll lock if user resizes to desktop while panel is open
watch(isMobile, (mobile) => {
  if (!mobile && showViz.value) {
    showViz.value = false
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <section
      class="viz-section post-section"
      :class="{ 'viz-visible': showViz }"
      ref="sectionRef"
  >
    <div class="text-column">
      <slot name="heading"/>
      <slot name="text"/>
    </div>

    <div class="viz-column">
      <slot name="viz"/>
    </div>

    <div
        v-if="showFab"
        class="viz-panel"
        :class="{ 'viz-panel-open': showViz }"
    >
      <slot name="viz"/>
    </div>

    <button
        v-if="showFab"
        class="viz-toggle-btn"
        :class="{ pending: pendingBlock !== null }"
        @click="toggleViz"
    >
      <FlaskConical v-if="!showViz" :size="18"/>
      <X v-else :size="18"/>
    </button>
  </section>
</template>

<style scoped>
.viz-section {
  max-width: calc(var(--blog-prose-width) + var(--blog-column-gap) + var(--blog-viz-width));
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: var(--blog-prose-width) var(--blog-viz-width);
  column-gap: var(--blog-column-gap);
  align-items: start;
}

.viz-column {
  align-self: start;
  position: -webkit-sticky;
  position: sticky;
  top: 2rem;
  overflow: hidden;
}

@media (max-width: 1330px) and (min-width: 769px) {
  .viz-section {
    max-width: 100%;
    grid-template-columns: minmax(0, 55%) minmax(0, 45%);
    column-gap: 1rem;
  }
}

@media (max-width: 768px) {
  .viz-section {
    display: block;
  }

  .text-column {
    transition: transform 0.25s ease;
  }

  .viz-visible .text-column {
    transform: translateX(calc(-100vw - 1.5rem));
  }

  .viz-column {
    display: none;
  }

  /* ─── Slide-in panel ───────────────────────────────────────── */
  .viz-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    z-index: 150;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    background-color: white;
    padding: 1rem 0.75rem;
    overflow-y: auto;
    padding-bottom: 25vh;
  }

  .viz-panel-open {
    transform: translateX(0);
  }

  .viz-panel-inner {
    width: 100%;
    height: 100%;
    -webkit-overflow-scrolling: touch;
    background: var(--color-bg);
    padding: 0 0.75rem;
    box-sizing: border-box;
  }

  .viz-panel-inner :deep(*) {
    max-width: 100%;
    overflow-x: hidden;
  }

}

/* ─── Floating FAB ─────────────────────────────────────────── */
.viz-toggle-btn {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 200;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.viz-toggle-btn:hover {
  transform: scale(1.06);
  box-shadow: var(--shadow-popup);
  color: var(--color-text-strong);
}

.viz-toggle-btn.pending {
  animation: fab-pending 1.5s ease-out infinite;
}

@keyframes fab-pending {
  0%, 100% {
    background: var(--color-bg);
    box-shadow: 0 0 0 0px var(--color-interactive), var(--shadow-card);
  }
  50% {
    background:var(--color-bg-activation);
    box-shadow: 0 0 0 2px var(--color-interactive), var(--shadow-card);
  }
}
</style>
