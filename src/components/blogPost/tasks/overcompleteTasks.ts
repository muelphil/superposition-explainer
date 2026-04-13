import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'
import { allColumnNormsInRange, minPairwiseAngleDeg, createConvergenceTracker } from './aeTaskHelpers'

/**
 * Task specs for the "overcomplete" paragraph range.
 * Returned as a factory so each section instance gets fresh state.
 */
export function createOvercompleteTaskSpecs(): TaskSpec[] {
  return [
    {
      id: 'set-input-4',
      label: 'Set input neurons to 4',
      setup: (ctx: TaskContext) =>
        computed(() => ctx.svc.config.inputDim === 4),
    },
    {
      id: 'converge',
      label: 'Run training until convergence',
      note: 'The experiment will automatically pause when convergence is reached. Convergent behavior may take some time to appear — consider resetting and rerunning if it takes too long.',
      sticky: true,
      dependencies: ['set-input-4'],
      setup: (ctx: TaskContext) =>
        createConvergenceTracker(
          ctx.svc,
          // All 4 feature vectors must have reasonable norms and be at least
          // 86° apart from one another (90° is the theoretical optimum for
          // 4 features in 2D superposition).
          (svc) =>
            allColumnNormsInRange(svc.W.value, 0.7, 1.1) &&
            minPairwiseAngleDeg(svc.W.value) >= 86,
          20,
          () => ctx.svc.pauseTraining(),
          // Guard: only track convergence when the dependency task is active
          () => ctx.svc.config.inputDim === 4,
        ),
    },
  ]
}
