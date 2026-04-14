import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'
import { k, countSignificantColumns, columnAngleDeg, createConvergenceHandler } from './aeTaskHelpers'

/**
 * Task specs for Experiment 3: four features in two dimensions (sparse).
 * With high sparsity (S = 0.9), the model should represent all four features
 * using opposite-direction pairs.
 */
export function createExp3TaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'set-sparsity',
      label: `Set sparsity to ${k('S = 0.9')} and run training`,
      resetable: true,
      setup: (ctx: AeTaskContext) => ({
        events: ['sparsity-changed'],
        check: () => ctx.services.svc.config.sparsity >= 0.85,
      }),
    },
    {
      id: 'converge',
      label: 'Rerun the training — observe the feature directions in the embedding view',
      note: 'The experiment will automatically pause when convergence is reached.',
      dependencies: ['set-sparsity'],
      setup: (ctx: AeTaskContext) =>
        createConvergenceHandler(
          ctx.services.svc,
          (svc) => countSignificantColumns(svc.W.value, 0.5) >= 4,
          30,
          () => ctx.services.svc.pauseTraining(),
          () => ctx.services.svc.config.sparsity >= 0.85,
        ),
    },
    {
      id: 'activate-individual',
      label: 'Activate individual features one at a time using the input sliders and observe the reconstruction',
      dependencies: ['converge'],
      optional: true,
      setup: () => {
        const activated = new Set<number>()
        return {
          events: ['input-value-changed'],
          onEvent: (_: string, payload?: any) => {
            if (payload?.value > 0.5) activated.add(payload.index)
          },
          check: () => activated.size >= 2,
        }
      },
    },
    {
      id: 'activate-opposite',
      label: 'Set all inputs to zero, then increase two features with opposite directions to 1.0 — observe the embedding and error',
      dependencies: ['converge'],
      optional: true,
      setup: (ctx: AeTaskContext) => ({
        events: ['input-value-changed'],
        check: () => {
          const input = ctx.services.svc.currentInput.value
          const W = ctx.services.svc.W.value
          if (!W.length || !W[0]) return false

          // Find inputs ≈ 1.0 and inputs ≈ 0
          const activeIndices: number[] = []
          let allOthersZero = true
          for (let i = 0; i < input.length; i++) {
            if (input[i] > 0.8) {
              activeIndices.push(i)
            } else if (input[i] > 0.15) {
              allOthersZero = false
            }
          }
          if (activeIndices.length !== 2 || !allOthersZero) return false

          // Check that the two active features have opposite-facing weight vectors
          const angle = columnAngleDeg(W, activeIndices[0], activeIndices[1])
          return angle > 160
        },
      }),
    },
  ]
}
