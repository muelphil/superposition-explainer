import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Tracks which paragraph element is closest to the vertical center of the
 * viewport and exposes the index as a reactive ref.
 *
 * Uses IntersectionObserver with multiple thresholds for smooth tracking,
 * falling back to a distance-to-center comparison on each intersection event.
 */
export function useScrollActiveParagraph(
  paragraphRefs: Ref<(HTMLElement | null)[]>,
): { activeParagraphIndex: Ref<number> } {
  const activeParagraphIndex = ref(0)
  let observer: IntersectionObserver | null = null

  function updateActive() {
    const els = paragraphRefs.value
    if (!els || els.length === 0) return

    // Activate the paragraph closest to the 40%-from-top focal line
    const viewportCenter = window.innerHeight * 0.4
    let bestIdx = 0
    let bestDist = Infinity

    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const elCenter = rect.top + rect.height / 2
      const dist = Math.abs(elCenter - viewportCenter)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }

    activeParagraphIndex.value = bestIdx
  }

  onMounted(() => {
    observer = new IntersectionObserver(updateActive, {
      // Fire frequently as elements scroll through the viewport
      threshold: Array.from({ length: 11 }, (_, i) => i / 10),
    })

    // Observe all paragraph elements
    const observe = () => {
      paragraphRefs.value.forEach(el => {
        if (el) observer!.observe(el)
      })
    }
    observe()

    // Also listen to scroll for continuous updates
    window.addEventListener('scroll', updateActive, { passive: true })
  })

  onUnmounted(() => {
    observer?.disconnect()
    window.removeEventListener('scroll', updateActive)
  })

  return { activeParagraphIndex }
}
