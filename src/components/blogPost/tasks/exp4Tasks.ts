import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'
import { k, allColumnNormsInRange, minPairwiseAngleDeg, createConvergenceHandler } from './aeTaskHelpers'

/**
 * Task specs for Experiment 4: five features in two dimensions.
 * With equal importance (α = 1.0) and sparsity, the model should
 * distribute feature directions evenly at approximately 72° apart.
 */
export function createExp4TaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'set-equal-importance',
      label: `Set ${k('\\alpha = 1.0')} (equal importance)`,
      setup: (ctx: AeTaskContext) => ({
        events: ['importance-changed'],
        check: () => ctx.services.svc.config.featureDecay >= 0.99,
      }),
    },
    {
      id: 'converge',
      label: 'Run training and observe the feature directions in the embedding view',
      note: 'The experiment will automatically pause when convergence is reached.',
      dependencies: ['set-equal-importance'],
      setup: (ctx: AeTaskContext) =>
        createConvergenceHandler(
          ctx.services.svc,
          (svc) =>
            minPairwiseAngleDeg(svc.W.value) >= 65 &&
            allColumnNormsInRange(svc.W.value, 0.5, 1.1),
          30,
          () => ctx.services.svc.pauseTraining(),
          () => ctx.services.svc.config.featureDecay >= 0.99,
        ),
    },
    {
      id: 'check-angle',
      label: `Check the minimum angle between feature directions in the statistics view — compare to ${k('72°')}`,
      dependencies: ['converge'],
      setup: (ctx: AeTaskContext) => ({
        events: ['tab-changed', 'stats-chart-changed'],
        check: () =>
          ctx.services.viz.activeTab.value === 'statistics' &&
          ctx.services.viz.statsChart.value === 'angle',
      }),
    },
  ]
}
