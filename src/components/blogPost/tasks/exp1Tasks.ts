import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'
import { allColumnNormsInRange, minPairwiseAngleDeg, createConvergenceTracker } from './aeTaskHelpers'

/**
 * Task specs for Experiment 1: two features in two dimensions.
 * The model should converge to an orthonormal basis with zero reconstruction loss.
 */
export function createExp1TaskSpecs(): TaskSpec[] {
  return [
    {
      id: 'converge',
      label: 'Run training and wait for convergence',
      sticky: true,
      setup: (ctx: TaskContext) =>
        createConvergenceTracker(
          ctx.svc,
          (svc) =>
            allColumnNormsInRange(svc.W.value, 0.85, 1.15) &&
            minPairwiseAngleDeg(svc.W.value) >= 80,
          20,
          () => ctx.svc.pauseTraining(),
        ),
    },
    {
      id: 'check-loss',
      label: 'Check out the loss in the training statistics',
      dependencies: ['converge'],
      setup: () => computed(() => true),
    },
    {
      id: 'check-angle',
      label: 'Check the angle between the two feature direction vectors in the training statistics',
      dependencies: ['converge'],
      setup: () => computed(() => true),
    },
    {
      id: 'check-norms',
      label: 'Check the vector lengths in the weight view',
      dependencies: ['converge'],
      setup: () => computed(() => true),
    },
  ]
}
