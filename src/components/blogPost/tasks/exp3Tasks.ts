import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'
import { countSignificantColumns, createConvergenceTracker } from './aeTaskHelpers'

/**
 * Task specs for Experiment 3: four features in two dimensions (sparse).
 * With high sparsity (S = 0.1), the model should represent all four features
 * using opposite-direction pairs.
 */
export function createExp3TaskSpecs(): TaskSpec[] {
  return [
    {
      id: 'set-sparsity',
      label: 'Set sparsity to S = 0.1 and run training',
      // Draft S = 0.1 (10% active) → service sparsity = 0.9 (90% zero)
      setup: (ctx: TaskContext) =>
        computed(() => ctx.svc.config.sparsity >= 0.85),
    },
    {
      id: 'converge',
      label: 'Observe the feature directions in the embedding view',
      note: 'The experiment will automatically pause when convergence is reached.',
      sticky: true,
      dependencies: ['set-sparsity'],
      setup: (ctx: TaskContext) =>
        createConvergenceTracker(
          ctx.svc,
          (svc) => countSignificantColumns(svc.W.value, 0.3) >= 3,
          30,
          () => ctx.svc.pauseTraining(),
          () => ctx.svc.config.sparsity >= 0.85,
        ),
    },
    {
      id: 'activate-individual',
      label: 'Activate individual features one at a time using the input sliders and observe the reconstruction',
      dependencies: ['converge'],
      optional: true,
      setup: () => computed(() => true),
    },
    {
      id: 'activate-opposite',
      label: 'Set all inputs to zero, then increase two features with opposite directions to 1.0 — observe the embedding and error',
      dependencies: ['converge'],
      optional: true,
      setup: () => computed(() => true),
    },
  ]
}
