/**
 * Global event bus for "active block seen" notifications.
 * Emits from useScrollActiveParagraph when activeBlockIndex changes,
 * passing the DOM element so VizSection instances can scope to themselves.
 */
import { ref, type Ref } from 'vue'

type Handler = (blockElement: HTMLElement) => void

const handlers = new Set<Handler>()

export function onActiveBlockSeen(handler: Handler): () => void {
  handlers.add(handler)
  return () => { handlers.delete(handler) }
}

export const activeBlockElement: Ref<HTMLElement | null> = ref(null)

export function emitActiveBlockSeen(blockElement: HTMLElement): void {
  handlers.forEach(h => h(blockElement))
  activeBlockElement.value = blockElement
}

export function clearActiveBlock(): void {
  activeBlockElement.value = null
}
