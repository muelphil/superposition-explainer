import { computed, watch, type Ref, type ComputedRef } from 'vue'

/**
 * A paragraph range maps a contiguous span of paragraph indices to a handler.
 * Use this instead of per-paragraph step definitions when multiple consecutive
 * paragraphs share the same visualization state, or when config must be applied
 * programmatically.
 *
 * Generic over T so sections can extend it (e.g. AeParagraphRange adds
 * a `constraints` field for provide/inject without touching the composable).
 */
export interface ParagraphRange {
  /** Inclusive start paragraph index. */
  from: number
  /** Inclusive end paragraph index. */
  to: number
  /**
   * Called whenever the active paragraph index is within [from, to].
   * Receives the exact active index so ranges can react to specific paragraphs.
   * The function should be idempotent — it may be called multiple times with
   * the same index (e.g. on mount).
   */
  apply: (activeIndex: number) => void
  /**
   * Called when the active range changes away from this range.
   * Use for teardown / state saving.
   */
  leave?: () => void
}

export function useParagraphRanges<T extends ParagraphRange>(
  ranges: T[],
  activeIndex: Ref<number>,
): { currentRange: ComputedRef<T | undefined> } {
  const currentRange = computed<T | undefined>(() =>
    ranges.find(r => activeIndex.value >= r.from && activeIndex.value <= r.to),
  )

  let prevRange: T | undefined = undefined

  watch(
    activeIndex,
    (idx) => {
      const range = ranges.find(r => idx >= r.from && idx <= r.to)
      if (range !== prevRange) {
        prevRange?.leave?.()
        prevRange = range
      }
      if (range) range.apply(idx)
    },
    { immediate: true },
  )

  return { currentRange }
}
