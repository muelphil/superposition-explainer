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

export type TargetKind = NonNullable<SelectionTarget>['kind']

// ─── Hover interaction matrix ─────────────────────────────────────────────────
// Rows = selected kind, columns = hovered kind.
// Cell = true → hovering that kind produces a visual effect while the row kind
// is selected.  When false, consumers should treat hover as null.

const ALL_KINDS: TargetKind[] = ['feature', 'input', 'emb', 'output', 'bias', 'relu', 'weight']

const HOVER_EFFECT_MATRIX: Record<TargetKind, Set<TargetKind>> = {
  //                              feature  input  emb   output
  feature: new Set<TargetKind>([          'input','emb','output']),
  input:   new Set<TargetKind>([                        'output']),
  emb:     new Set<TargetKind>(['feature','input',      'output']),
  output:  new Set<TargetKind>(['feature','input','emb','output']),
  bias:    new Set<TargetKind>([          'input',      'output']),
  relu:    new Set<TargetKind>([          'input',      'output']),
  weight:  new Set<TargetKind>([          'input',      'output']),
}

/**
 * Returns `true` when hovering `hov` should produce visual feedback while
 * `sel` is selected.  When either is null the answer is always true (no
 * conflict to suppress).
 */
export function hoverHasEffect(
  sel: SelectionTarget,
  hov: SelectionTarget,
): boolean {
  if (!sel || !hov) return true
  return HOVER_EFFECT_MATRIX[sel.kind]?.has(hov.kind) ?? false
}

/**
 * Compute the effective hover: the hover itself when it has an effect,
 * or `null` when suppressed by the current selection.
 */
export function effectiveHover(
  sel: SelectionTarget,
  hov: SelectionTarget,
): SelectionTarget {
  return hoverHasEffect(sel, hov) ? hov : null
}

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
