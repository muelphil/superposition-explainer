import {ref, onMounted, onUnmounted, type Ref} from 'vue'

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
 * Also sets a CSS class on the nearest .text-column parent to indicate scroll
 * direction (scroll-down | scroll-up), so variant 4's animation can animate in
 * the matching direction.
 *
 * Non-activatable content should simply omit a ref — blockRefs must be a
 * contiguous, dense array of only the activatable elements.
 */
export function useScrollActiveBlock(
    blockRefs: Ref<(HTMLElement | null)[]>,
): { activeBlockIndex: Ref<number>, scrollToBlock: Function } {
    const activeBlockIndex = ref(-1)
    let observer: IntersectionObserver | null = null
    let prevY = 0

    const dirClass = (parent: HTMLElement | null, direction: 'down' | 'up') => {
        if (!parent) return
        const el = parent.closest('[data-scroll-dir]')
        if (el) el.setAttribute('data-scroll-dir', direction)
    }

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

        prevY = window.scrollY

        window.addEventListener('scroll', () => {
            const y = window.scrollY
            const parent = blockRefs.value[0]?.closest('.text-column') as HTMLElement
            if (parent) {
                if (y > prevY) dirClass(parent, 'down')
                else if (y < prevY) dirClass(parent, 'up')
                else dirClass(parent, 'down')
                prevY = y
                updateActive()
            }
        }, {passive: true})

        updateActive()
    })

    onUnmounted(() => {
        observer?.disconnect()
        window.removeEventListener('scroll', updateActive)
    })

    /** Scroll the given text-block so its vertical center aligns with the viewport focal point. */
    function scrollToBlock(el: HTMLElement) {
        console.log('hi!')
        const viewportFocal = window.innerHeight * 0.4
        const rect = el.getBoundingClientRect()
        const elCenter = rect.top + rect.height / 2
        const delta = elCenter - viewportFocal
        window.scrollBy({top: delta, behavior: 'smooth'})
    }

    return {activeBlockIndex, scrollToBlock}
}
