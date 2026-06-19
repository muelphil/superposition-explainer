/**
 * Global event bus for "active block seen" notifications.
 * Emits from useScrollActiveParagraph when activeBlockIndex changes,
 * passing the DOM element so VizSection instances can scope to themselves.
 */

type Handler = (blockElement: HTMLElement) => void

const handlers = new Set<Handler>()

export function onActiveBlockSeen(handler: Handler): () => void {
  handlers.add(handler)
  return () => { handlers.delete(handler) }
}

export function emitActiveBlockSeen(blockElement: HTMLElement): void {
  handlers.forEach(h => h(blockElement))
}
