import { ref } from 'vue'

// Module-level singleton — import directly, no inject/provide needed.

/** Whether the purple input-point sphere is visible in the Embedding Space view. */
export const showEmbeddingPoint = ref(true)

/** Whether IO neurons use feature color gradient instead of blue → orange. */
export const useFeatureColorsForIO = ref(false)
