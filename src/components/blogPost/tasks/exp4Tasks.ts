import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'
import { allColumnNormsInRange, minPairwiseAngleDeg, createConvergenceTracker } from './aeTaskHelpers'

/**
 * Task specs for Experiment 4: five features in two dimensions.
 * With equal importance (α = 1.0) and sparsity, the model should
 * distribute feature directions evenly at approximately 72° apart.
 */
export function createExp4TaskSpecs(): TaskSpec[] {
  return [
    {
      id: 'set-equal-importance',
      label: 'Set α = 1.0 (equal importance)',
      setup: (ctx: TaskContext) =>
        computed(() => ctx.svc.config.featureDecay >= 0.99),
    },
    {
      id: 'converge',
      label: 'Run training and observe the feature directions in the embedding view',
      note: 'The experiment will automatically pause when convergence is reached.',
      sticky: true,
      dependencies: ['set-equal-importance'],
      setup: (ctx: TaskContext) =>
        createConvergenceTracker(
          ctx.svc,
          (svc) =>
            minPairwiseAngleDeg(svc.W.value) >= 55 &&
            allColumnNormsInRange(svc.W.value, 0.4, 1.2),
          30,
          () => ctx.svc.pauseTraining(),
          () => ctx.svc.config.featureDecay >= 0.99,
        ),
    },
    {
      id: 'check-angle',
      label: 'Check the minimum angle between feature directions — compare to 360°/5 = 72°',
      dependencies: ['converge'],
      setup: () => computed(() => true),
    },
  ]
}
