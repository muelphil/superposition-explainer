import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'
import { countSignificantColumns, createConvergenceTracker } from './aeTaskHelpers'

/**
 * Task specs for Experiment 2: four features in two dimensions (dense).
 * With importance decay α = 0.8, the model should represent only the
 * two most important features and collapse the rest.
 */
export function createExp2TaskSpecs(): TaskSpec[] {
  return [
    {
      id: 'set-importance',
      label: 'Set importance α = 0.8',
      setup: (ctx: TaskContext) =>
        computed(() => ctx.svc.config.featureDecay <= 0.81),
    },
    {
      id: 'converge',
      label: 'Run training and wait for convergence',
      note: 'The experiment will automatically pause when convergence is reached. Convergent behavior may take some time to appear — consider resetting and rerunning if it takes too long.',
      sticky: true,
      dependencies: ['set-importance'],
      setup: (ctx: TaskContext) =>
        createConvergenceTracker(
          ctx.svc,
          (svc) => {
            const n = svc.W.value[0]?.length ?? 0
            const sig = countSignificantColumns(svc.W.value, 0.5)
            return sig >= 2 && sig < n
          },
          30,
          () => ctx.svc.pauseTraining(),
          () => ctx.svc.config.featureDecay <= 0.81,
        ),
    },
    {
      id: 'check-features',
      label: 'Hover over each input neuron to observe which features are represented in embedding space',
      dependencies: ['converge'],
      setup: () => computed(() => true),
    },
    {
      id: 'check-bias',
      label: 'For unrepresented features, check their learned bias — compare to μ = √(2/π) ≈ 0.798',
      dependencies: ['converge'],
      setup: () => computed(() => true),
    },
  ]
}
