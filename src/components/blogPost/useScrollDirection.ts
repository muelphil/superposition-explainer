import { ref } from 'vue'

/**
 * Global scroll direction singleton.
 * Sets `data-scroll-dir` on <body> so CSS selectors can target it
 * regardless of component nesting or wrapper depth.
 */
export const scrollDirection = ref<'up' | 'down'>('down')

let initialized = false

/**
 * Call once (e.g. in main.ts) to start tracking scroll direction globally.
 */
export function initScrollDirection(): () => void {
    if (initialized) return () => {}
    initialized = true

    let prevY = window.scrollY

    const handler = () => {
        const y = window.scrollY
        if (y > prevY) {
            scrollDirection.value = 'down'
            document.body.setAttribute('data-scroll-dir', 'down')
        } else if (y < prevY) {
            scrollDirection.value = 'up'
            document.body.setAttribute('data-scroll-dir', 'up')
        }
        prevY = y
    }

    window.addEventListener('scroll', handler, { passive: true })
    return () => {
        window.removeEventListener('scroll', handler)
        initialized = false
    }
}
