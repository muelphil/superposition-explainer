import { computed, type Ref, type ComputedRef, type InjectionKey } from 'vue'

// ─── Constraint spec (set programmatically inside apply()) ────────────────────

/** A fixed number constrains the dim to exactly that value.
 *  An object allows the user to adjust within [min, max]. */
export type DimConstraint = number | { min: number; max: number }

/** UI controls that can be hidden while a range is active. */
export type HiddenControl = 'sparsity' | 'importance' | 'advanced'

/**
 * UI constraint spec set programmatically inside a range's apply() function.
 * Drives visibility/bounds of controls in AutoencoderView and TrainingConfigView.
 * Pass undefined to reset to unconstrained defaults.
 */
export interface AeConstraintSpec {
  inputDim?: DimConstraint
  embeddingDim?: DimConstraint
  hiddenControls?: HiddenControl[]
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
 * Derives a reactive AeViewConstraints from a ref that apply() mutates directly.
 * Set constraintSpec.value inside apply() to update constraints for the active range.
 */
export function deriveConstraints(
  constraintSpec: Ref<AeConstraintSpec | undefined>,
  inputDimGlobalMin: number,
  inputDimGlobalMax: number,
  embDimGlobalMin: number,
  embDimGlobalMax: number,
): ComputedRef<AeViewConstraints> {
  return computed(() => {
    const spec = constraintSpec.value
    return {
      inputDim: dimRange(spec?.inputDim, inputDimGlobalMin, inputDimGlobalMax),
      embeddingDim: dimRange(spec?.embeddingDim, embDimGlobalMin, embDimGlobalMax),
      hiddenControls: new Set(spec?.hiddenControls ?? []),
    }
  })
}

