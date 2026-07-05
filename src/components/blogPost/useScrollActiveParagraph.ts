import {ref, onMounted, onUnmounted, watch, type Ref} from 'vue'
import { emitActiveBlockSeen, clearActiveBlock } from './activeBlockBus'

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
 * Scroll direction tracking has been moved to useScrollDirection.ts (singleton).
 *
 * Non-activatable content should simply omit a ref — blockRefs must be a
 * contiguous, dense array of only the activatable elements.
 */
export function useScrollActiveBlock(
    blockRefs: Ref<(HTMLElement | null)[]>,
): { activeBlockIndex: Ref<number>, scrollToBlock: Function } {
    const activeBlockIndex = ref(-1)
    let observer: IntersectionObserver | null = null

    watch(activeBlockIndex, (idx) => {
        if (idx >= 0) {
            const el = blockRefs.value[idx]
            if (el) {
                emitActiveBlockSeen(el)
            }
        } else {
            clearActiveBlock()
        }
    })

    function updateActive() {
        const els = blockRefs.value
        if (!els || els.length === 0) return

        const viewportFocal = window.innerHeight * 0.4

        const valid: HTMLElement[] = els.filter((el): el is HTMLElement => el !== null)
        if (valid.length === 0) return

        const firstRect = valid[0].getBoundingClientRect()
        const lastRect = valid[valid.length - 1].getBoundingClientRect()
        if (viewportFocal < firstRect.top || viewportFocal > lastRect.bottom) {
            activeBlockIndex.value = -1
            return
        }

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
            threshold: Array.from({length: 11}, (_, i) => i / 10),
        })

        blockRefs.value.forEach(el => {
            if (el) observer!.observe(el)
        })

        window.addEventListener('scroll', updateActive, {passive: true})

        updateActive()
    })

    onUnmounted(() => {
        observer?.disconnect()
        window.removeEventListener('scroll', updateActive)
    })

    /** Scroll the given text-block so its vertical center aligns with the viewport focal point. */
    function scrollToBlock(el: HTMLElement) {
        // Ignore clicks on the currently active block
        const idxInRefs = blockRefs.value.indexOf(el)
        if (idxInRefs === activeBlockIndex.value) return
        const viewportFocal = window.innerHeight * 0.4
        const rect = el.getBoundingClientRect()
        const elCenter = rect.top + rect.height / 2
        const delta = elCenter - viewportFocal
        window.scrollBy({top: delta, behavior: 'smooth'})
    }

    return {activeBlockIndex, scrollToBlock}
}
