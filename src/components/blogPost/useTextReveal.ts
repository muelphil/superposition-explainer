import { ref, watch, onUnmounted, nextTick, type Ref } from 'vue'

/**
 * Captures the rendered HTML from a slot container once unlocked, then
 * progressively reveals it via innerHTML, treating HTML tags as atomic units
 * and text being revealed word by word at words/sec depending on the delay inbetween.
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

  let timer: ReturnType<typeof setInterval> | null = null

  watch([containerRef, triggered], async ([el, isTriggered]) => {
    if (timer) { clearInterval(timer); timer = null }
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

    // Tokenize: walk the HTML string
    // Tags are atomic, text chars are individual
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
        tokens.push(html[i])
        i++
      }
    }

    const total = tokens.length
    let idx = 0

    // Accumulate so far
    let buf = ''
    const delay = 3 // 7 = ~140 chars/sec

    timer = setInterval(() => {
      if (idx >= total) {
        clearInterval(timer!)
        timer = null
        done.value = true
        return
      }

      buf += tokens[idx]
      idx++
      revealedHtml.value = buf

      if (idx >= total) {
        clearInterval(timer!)
        timer = null
        done.value = true
      }
    }, delay)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { revealedHtml, visible, done }
}
