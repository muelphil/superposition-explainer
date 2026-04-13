import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Tracks which text-block element is closest to the vertical center of the
 * viewport and exposes the index as a reactive ref.
 *
 * A "text block" is any element that wraps one or more paragraphs as a single
 * interactive scroll unit — typically a <div class="text-block">.
 *
 * Returns -1 when the focal line is outside the section's vertical extent
 * (i.e. before the first block or after the last block), so that the section
 * is inactive before the user scrolls into it and after they leave it.
 *
 * Non-activatable content should simply omit a ref — blockRefs must be a
 * contiguous, dense array of only the activatable elements.
 */
export function useScrollActiveBlock(
  blockRefs: Ref<(HTMLElement | null)[]>,
): { activeBlockIndex: Ref<number> } {
  const activeBlockIndex = ref(-1)
  let observer: IntersectionObserver | null = null

  function updateActive() {
    const els = blockRefs.value
    if (!els || els.length === 0) return

    const viewportFocal = window.innerHeight * 0.4

    // Collect valid (non-null) elements in order
    const valid: HTMLElement[] = els.filter((el): el is HTMLElement => el !== null)
    if (valid.length === 0) return

    // Deactivate when the focal line is above the first block or below the last
    const firstRect = valid[0].getBoundingClientRect()
    const lastRect = valid[valid.length - 1].getBoundingClientRect()
    if (viewportFocal < firstRect.top || viewportFocal > lastRect.bottom) {
      activeBlockIndex.value = -1
      return
    }

    // Find the block closest to the focal line
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const elCenter = rect.top + rect.height / 2
      const dist = Math.abs(elCenter - viewportFocal)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }

    activeBlockIndex.value = bestIdx
  }

  onMounted(() => {
    observer = new IntersectionObserver(updateActive, {
      // Fire frequently as elements scroll through the viewport
      threshold: Array.from({ length: 11 }, (_, i) => i / 10),
    })

    // Observe all block elements
    blockRefs.value.forEach(el => {
      if (el) observer!.observe(el)
    })

    window.addEventListener('scroll', updateActive, { passive: true })

    // Run once on mount so initial state reflects current scroll position
    updateActive()
  })

  onUnmounted(() => {
    observer?.disconnect()
    window.removeEventListener('scroll', updateActive)
  })

  return { activeBlockIndex }
}
