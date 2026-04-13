import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'
import { allColumnNormsInRange, createConvergenceTracker } from './aeTaskHelpers'

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
      sticky: true,
      dependencies: ['set-input-4'],
      setup: (ctx: TaskContext) =>
        createConvergenceTracker(
          ctx.svc,
          (svc) => allColumnNormsInRange(svc.W.value, 0.7, 1.3) && svc.loss.value < 0.1,
          10,
          () => ctx.svc.stopTraining(),
        ),
    },
  ]
}
