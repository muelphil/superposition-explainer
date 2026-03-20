import { ref } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SelectionTarget =
  | { kind: 'feature';  idx: number }
  | { kind: 'input';    idx: number }
  | { kind: 'bias';     idx: number }
  | { kind: 'relu';     idx: number }
  | { kind: 'emb';      idx: number }
  | { kind: 'output';   idx: number }
  | { kind: 'weight';   row: number; col: number }
  | null

export type OriginView = 'autoencoder' | 'embedding' | 'weights'

// ─── Service factory ──────────────────────────────────────────────────────────

export function createSelectionService() {
  const hovered       = ref<SelectionTarget>(null)
  const hoveredOrigin = ref<OriginView | null>(null)
  const selected      = ref<SelectionTarget>(null)
  const selectedOrigin = ref<OriginView | null>(null)

  function setHover(target: SelectionTarget, origin: OriginView) {
    hovered.value       = target
    hoveredOrigin.value = target !== null ? origin : null
  }

  function clearHover() {
    hovered.value       = null
    hoveredOrigin.value = null
  }

  function setSelected(target: SelectionTarget, origin: OriginView) {
    // Toggle: clicking the same target clears the selection
    const curr = selected.value
    if (
      target !== null && curr !== null &&
      target.kind === curr.kind &&
      JSON.stringify(target) === JSON.stringify(curr)
    ) {
      selected.value       = null
      selectedOrigin.value = null
    } else {
      selected.value       = target
      selectedOrigin.value = target !== null ? origin : null
    }
  }

  function clearSelected() {
    selected.value       = null
    selectedOrigin.value = null
  }

  return {
    hovered,
    hoveredOrigin,
    selected,
    selectedOrigin,
    setHover,
    clearHover,
    setSelected,
    clearSelected,
  }
}

export type SelectionServiceType = ReturnType<typeof createSelectionService>
