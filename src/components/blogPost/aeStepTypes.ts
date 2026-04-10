import { computed, type Ref, type ComputedRef, type InjectionKey } from 'vue'
import type { ParagraphRange } from './useParagraphRanges'

// ─── Constraint types (what AutoencoderView + TrainingConfigView inject) ──────

/** A fixed number constrains the dim to exactly that value.
 *  An object allows the user to adjust within [min, max]. */
export type DimConstraint = number | { min: number; max: number }

/** UI controls that can be hidden by a range's constraints. */
export type HiddenControl = 'sparsity' | 'importance' | 'advanced'

/**
 * Declarative constraint spec attached to an AeParagraphRange.
 * Drives visibility/bounds of controls in AutoencoderView and TrainingConfigView.
 */
export interface AeConstraintSpec {
  /** Fixed dimension or user-selectable range for the input layer. */
  inputDim?: DimConstraint
  /** Fixed dimension or user-selectable range for the embedding layer. */
  embeddingDim?: DimConstraint
  /** Controls to hide in TrainingConfigView while this range is active. */
  hiddenControls?: HiddenControl[]
}

/**
 * A paragraph range for the Autoencoder section.
 * Extends ParagraphRange with an optional declarative constraints spec so
 * AutoencoderView and TrainingConfigView can adapt their UI reactively.
 *
 * The `apply` function handles all programmatic state changes
 * (service calls, config updates, etc.).
 */
export interface AeParagraphRange extends ParagraphRange {
  constraints?: AeConstraintSpec
}

// ─── Derived constraints (provided to child components via inject) ─────────────

export interface DimRange {
  fixed: boolean
  min: number
  max: number
}

export interface AeViewConstraints {
  inputDim: DimRange
  embeddingDim: DimRange
  hiddenControls: Set<string>
}

export const AE_VIEW_CONSTRAINTS_KEY: InjectionKey<ComputedRef<AeViewConstraints>> =
  Symbol('aeViewConstraints')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dimRange(constraint: DimConstraint | undefined, globalMin: number, globalMax: number): DimRange {
  if (constraint === undefined) return { fixed: false, min: globalMin, max: globalMax }
  if (typeof constraint === 'number') return { fixed: true, min: constraint, max: constraint }
  return { fixed: false, min: constraint.min, max: constraint.max }
}

/**
 * Derives a reactive AeViewConstraints from the currently active range.
 * Pass the ref returned by useParagraphRanges and the global dim limits.
 */
export function deriveConstraints(
  currentRange: Ref<AeParagraphRange | undefined>,
  inputDimGlobalMin: number,
  inputDimGlobalMax: number,
  embDimGlobalMin: number,
  embDimGlobalMax: number,
): ComputedRef<AeViewConstraints> {
  return computed(() => {
    const spec = currentRange.value?.constraints
    return {
      inputDim: dimRange(spec?.inputDim, inputDimGlobalMin, inputDimGlobalMax),
      embeddingDim: dimRange(spec?.embeddingDim, embDimGlobalMin, embDimGlobalMax),
      hiddenControls: new Set(spec?.hiddenControls ?? []),
    }
  })
}
