import { ref, watch, onUnmounted, nextTick, type Ref } from 'vue'

/**
 * Captures the rendered HTML from a slot container once unlocked, then
 * progressively reveals it via innerHTML, treating HTML tags as atomic units
 * and text being revealed word by word. Uses requestAnimationFrame for smooth,
 * efficient rendering — only one DOM update per frame.
 *
 * KaTeX elements render as rendered KaTeX markup in the slot before capture,
 * so innerHTML preserves them correctly.
 */
export function useTextReveal(
  containerRef: Ref<HTMLElement | null>,
  triggered: Ref<boolean>,
) {
  const revealedHtml = ref('')
  const visible = ref(false)
  const done = ref(false)

  let rafId: number | null = null
  const DURATION_MS = 2000 // total reveal animation time

  watch([containerRef, triggered], async ([el, isTriggered]) => {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    revealedHtml.value = ''
    visible.value = false
    done.value = false

    if (!isTriggered || !el) return

    // Wait for slot content to be rendered
    await nextTick()
    await nextTick()

    const html = el.innerHTML
    if (!html) return

    visible.value = true

    // Tokenize: HTML tags are atomic, text is split into words
    const tokens: string[] = []
    let i = 0
    while (i < html.length) {
      if (html[i] === '<') {
        const end = html.indexOf('>', i)
        if (end >= 0) {
          tokens.push(html.slice(i, end + 1))
          i = end + 1
        } else {
          tokens.push(html[i])
          i++
        }
      } else {
        // Read text run until next tag
        const nextTag = html.indexOf('<', i)
        const textEnd = nextTag < 0 ? html.length : nextTag
        let p = i
        while (p < textEnd) {
          // Split at whitespace boundaries
          let wordEnd = p
          while (wordEnd < textEnd && !/\s/.test(html[wordEnd])) wordEnd++
          if (wordEnd > p) tokens.push(html.slice(p, wordEnd))
          p = wordEnd
          // Skip whitespace
          let wsEnd = p
          while (wsEnd < textEnd && /\s/.test(html[wsEnd])) wsEnd++
          if (wsEnd > p) tokens.push(html.slice(p, wsEnd))
          p = wsEnd
        }
        i = textEnd
      }
    }

    const total = tokens.length
    // Tokens per frame so animation lasts DURATION_MS at 60fps
    const totalFrames = Math.max(1, DURATION_MS / 16)
    const perFrame = Math.max(1, Math.ceil(total / totalFrames))
    let idx = 0

    // Accumulate so far
    let buf = ''

    const tick = () => {
      // Consume multiple tokens per frame
      const end = Math.min(idx + perFrame, total)
      for (let j = idx; j < end; j++) buf += tokens[j!]
      idx = end
      revealedHtml.value = buf

      if (idx >= total) {
        done.value = true
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { revealedHtml, visible, done }
}
