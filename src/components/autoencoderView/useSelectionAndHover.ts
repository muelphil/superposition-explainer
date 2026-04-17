import { computed } from 'vue'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import type { SelectionServiceType, SelectionTarget } from '../../services/SelectionService'

// ─── Illumination types ──────────────────────────────────────────────────────
//
// Each SelectionTarget maps to an Illumination — a description of which
// neurons/paths are "lit" (everything else is dimmed).
//
// When both selection and hover are active:
//   - Selection defines the base illumination.
//   - Hover "narrows" it via set intersection ONLY when the hover is on a
//     compatible (different) axis (e.g. feature selected + emb hovered → show
//     only that feature AND that embedding neuron + their shared weights).
//   - Incompatible hover (same axis, different index) is ignored so that
//     selection always has precedence.

type IllumSet = Set<number> | 'all'

interface Illumination {
  inputs: IllumSet
  outputs: IllumSet
  embs: IllumSet
  paths: (row: number, col: number) => boolean
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const FEATURE_LIKE = new Set(['feature', 'input', 'output', 'bias', 'relu'])

function illuminationFor(t: SelectionTarget): Illumination {
  if (!t) return { inputs: 'all', outputs: 'all', embs: 'all', paths: () => true }
  if (FEATURE_LIKE.has(t.kind)) {
    const i = (t as { idx: number }).idx
    return { inputs: new Set([i]), outputs: new Set([i]), embs: 'all', paths: (_r, c) => c === i }
  }
  if (t.kind === 'emb') {
    return { inputs: 'all', outputs: 'all', embs: new Set([t.idx]), paths: (r) => r === t.idx }
  }
  if (t.kind === 'weight') {
    return {
      inputs: new Set([t.col]),
      outputs: new Set([t.col]),
      embs: new Set([t.row]),
      paths: (r, c) => r === t.row && c === t.col,
    }
  }
  return { inputs: 'all', outputs: 'all', embs: 'all', paths: () => true }
}

function intersectSet(a: IllumSet, b: IllumSet): IllumSet {
  if (a === 'all') return b
  if (b === 'all') return a
  const r = new Set([...a].filter(x => (b as Set<number>).has(x)))
  return r.size > 0 ? r : a  // if empty, fall back to selection's set
}

function intersectIllum(sel: Illumination, hov: Illumination): Illumination {
  return {
    inputs: intersectSet(sel.inputs, hov.inputs),
    outputs: intersectSet(sel.outputs, hov.outputs),
    embs: intersectSet(sel.embs, hov.embs),
    paths: (r, c) => sel.paths(r, c) && hov.paths(r, c),
  }
}

/** Hover is compatible when it is on a different "axis" than the selection.
 *  Same-axis, different-index hovers are ignored (selection has precedence). */
function hovIsCompatible(
    sel: NonNullable<SelectionTarget>,
    hov: NonNullable<SelectionTarget>,
): boolean {
  const selF = FEATURE_LIKE.has(sel.kind)
  const hovF = FEATURE_LIKE.has(hov.kind)
  if (selF && hovF)
    return (sel as { idx: number }).idx === (hov as { idx: number }).idx
  if (sel.kind === 'emb' && hov.kind === 'emb')
    return sel.idx === hov.idx
  // A hovered weight is only compatible if it connects to the selected element
  if (hov.kind === 'weight') {
    if (selF) return hov.col === (sel as { idx: number }).idx
    if (sel.kind === 'emb') return hov.row === sel.idx
  }
  return true
}

function inSet(s: IllumSet, i: number): boolean {
  return s === 'all' || (s as Set<number>).has(i)
}

// ─── Public interface ────────────────────────────────────────────────────────

export interface EventEmitter {
  emit(event: string, payload?: any): void
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useSelectionAndHover(
    selSvc: SelectionServiceType,
    svc: AutoencoderServiceType,
    eventEmitter?: EventEmitter,
) {
  // ── Core illumination ──────────────────────────────────────

  const activeIllumination = computed<Illumination>(() => {
    const sel = selSvc.selected.value
    const hov = selSvc.hovered.value
    if (!sel && !hov) return illuminationFor(null)
    if (!sel) return illuminationFor(hov)
    if (!hov) return illuminationFor(sel)
    return hovIsCompatible(sel, hov)
        ? intersectIllum(illuminationFor(sel), illuminationFor(hov))
        : illuminationFor(sel)
  })

  const isAnyActive = computed(() =>
      selSvc.selected.value !== null || selSvc.hovered.value !== null
  )

  // ── Output interference detection ──────────────────────────

  /** When an output neuron is the effective target, use half-dim instead of full dim. */
  const isOutputTargetActive = computed(() => {
    const hov = selSvc.hovered.value
    const sel = selSvc.selected.value
    return hov?.kind === 'output' || sel?.kind === 'output'
  })

  /** The effective output index when output is active (hover priority). */
  const activeOutputIdx = computed<number | null>(() => {
    const hov = selSvc.hovered.value
    const sel = selSvc.selected.value
    if (hov?.kind === 'output') return hov.idx
    if (sel?.kind === 'output') return sel.idx
    return null
  })

  /** Set of feature indices that are "lit" when an output is active:
   *  the output's own feature + all interfering features. */
  const outputLitFeatures = computed<Set<number>>(() => {
    const outIdx = activeOutputIdx.value
    if (outIdx === null) return new Set()
    const lit = new Set([outIdx])

    const W = svc.W.value
    const embDim = svc.config.embeddingDim
    const bi = svc.b.value[outIdx] ?? 0

    // Compute vecI = W[:, outIdx]
    const vecI = [
      W[0]?.[outIdx] ?? 0,
      embDim >= 2 ? (W[1]?.[outIdx] ?? 0) : 0,
      embDim >= 3 ? (W[2]?.[outIdx] ?? 0) : 0,
    ]
    const lenSq = vecI[0] ** 2 + vecI[1] ** 2 + vecI[2] ** 2
    if (lenSq < 1e-8) return lit

    const len = Math.sqrt(lenSq)
    const norm = [vecI[0] / len, vecI[1] / len, vecI[2] / len]
    const tBoundary = -bi / len

    for (let j = 0; j < svc.config.inputDim; j++) {
      if (j === outIdx) continue
      const vj = [
        W[0]?.[j] ?? 0,
        embDim >= 2 ? (W[1]?.[j] ?? 0) : 0,
        embDim >= 3 ? (W[2]?.[j] ?? 0) : 0,
      ]
      const tJ = vj[0] * norm[0] + vj[1] * norm[1] + vj[2] * norm[2]
      if (tJ > tBoundary) lit.add(j)
    }
    return lit
  })

  // ── Dim class helpers ──────────────────────────────────────

  function isInputDimmed(i: number): boolean {
    return isAnyActive.value && !inSet(activeIllumination.value.inputs, i)
  }

  function isOutputDimmed(i: number): boolean {
    return isAnyActive.value && !inSet(activeIllumination.value.outputs, i)
  }

  function isEmbDimmed(k: number): boolean {
    return isAnyActive.value && !inSet(activeIllumination.value.embs, k)
  }

  function inputDimClass(i: number): string {
    if (!isInputDimmed(i)) return ''
    if (!isOutputTargetActive.value) return 'dimmed'
    // When output is active: interfering features get half-dim, non-interfering get full dim
    return outputLitFeatures.value.has(i) ? 'half-dimmed' : 'dimmed'
  }

  function outputDimClass(i: number): string {
    if (!isOutputDimmed(i)) return ''
    if (!isOutputTargetActive.value) return 'dimmed'
    return outputLitFeatures.value.has(i) ? 'half-dimmed' : 'dimmed'
  }

  function embDimClass(k: number): string {
    if (!isEmbDimmed(k)) return ''
    return isOutputTargetActive.value ? 'half-dimmed' : 'dimmed'
  }

  function pathOpacity(row: number, col: number, base: number): number {
    if (!isAnyActive.value) return base
    if (activeIllumination.value.paths(row, col)) return base
    return isOutputTargetActive.value ? base * 0.4 : base * 0.1
  }

  // ── Selection outline checks ──────────────────────────────

  function isInputSelected(i: number): boolean {
    const t = selSvc.selected.value
    return !!t && (t.kind === 'input' || t.kind === 'feature') && (t as { idx: number }).idx === i
  }

  function isOutputSelected(i: number): boolean {
    const t = selSvc.selected.value
    return !!t && t.kind === 'output' && t.idx === i
  }

  function isEmbSelected(k: number): boolean {
    const t = selSvc.selected.value
    return t?.kind === 'emb' && t.idx === k
  }

  // ── Event handlers ────────────────────────────────────────
  // Grouped by element kind to eliminate redundancy.

  function makeIndexHandlers(kind: 'feature' | 'input' | 'emb' | 'output', emitOnHover?: string) {
    return {
      enter(i: number) {
        selSvc.setHover({kind, idx: i} as NonNullable<SelectionTarget>, 'autoencoder')
        if (emitOnHover) eventEmitter?.emit(emitOnHover, {index: i})
      },
      leave() { selSvc.clearHover() },
      click(i: number) {
        selSvc.setSelected({kind, idx: i} as NonNullable<SelectionTarget>, 'autoencoder')
      },
    }
  }

  const weight = {
    enter(row: number, col: number) { selSvc.setHover({kind: 'weight', row, col}, 'autoencoder') },
    leave() { selSvc.clearHover() },
    click(row: number, col: number) { selSvc.setSelected({kind: 'weight', row, col}, 'autoencoder') },
  }

  const feature = makeIndexHandlers('feature', 'input-neuron-hovered')
  const input   = makeIndexHandlers('input', 'input-neuron-hovered')
  const emb     = makeIndexHandlers('emb')
  const output  = makeIndexHandlers('output')

  return {
    inputDimClass,
    outputDimClass,
    embDimClass,
    pathOpacity,
    isInputSelected,
    isOutputSelected,
    isEmbSelected,
    weight,
    feature,
    input,
    emb,
    output,
  }
}
