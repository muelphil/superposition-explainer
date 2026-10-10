import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'
import { k, allColumnNormsInRange, minPairwiseAngleDeg, createConvergenceHandler } from './aeTaskHelpers'

/**
 * Task specs for Experiment 4: five features in two dimensions.
 * With equal importance (α = 1.0) and sparsity, the model should
 * distribute feature directions evenly at approximately 72° apart.
 */
/**
 * A converged pentagon solution (α = 1.0, S ≥ 0.85), captured from a training run.
 * W[row][col]: row = embedding dim, col = feature. Column norms ≈ 1.02–1.06, ~72° apart.
 */
const CONVERGED_W = [
  [-0.29, 0.87, -1.02, -0.35, 0.86],
  [-1.00, -0.60, -0.07, 0.98, 0.59],
]
const CONVERGED_B = [-0.29, -0.26, -0.21, -0.19, -0.20]

/**
 * Halt training and load the converged weights. Only reachable once the
 * prerequisite tasks (α = 1.0, S ≥ 0.85) are done — the link is disabled while blocked.
 */
function loadConvergedExample(ctx: AeTaskContext) {
  const svc = ctx.services.svc
  svc.stopTraining()
  if (svc.config.inputDim !== 5) svc.setInputDim(5)
  if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
  svc.loadWeights(CONVERGED_W, CONVERGED_B)
  ctx.events.emit('converged-example-loaded')
}

export function createExp4TaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'set-equal-importance',
      label: `Set ${k('\\alpha = 1.0')} (equal importance)`,
      resetable: true,
      setup: (ctx: AeTaskContext) => ({
        events: ['importance-changed'],
        check: () => ctx.services.svc.config.featureDecay >= 0.99,
      }),
    },
    {
      id: 'set-sparsity',
      label: `Set sparsity to ${k('S = 0.85')} or higher in the Training Configuration`,
      resetable: true,
      setup: (ctx: AeTaskContext) => ({
        events: ['sparsity-changed'],
        check: () => ctx.services.svc.config.sparsity >= 0.85,
      }),
    },
    {
      id: 'converge',
      label: 'Run training and observe the feature directions in the embedding space',
      note: 'The experiment will automatically pause when convergence is reached. The desired convergent behavior may take some time to appear. If it takes too long, consider resetting and rerunning with higher sparsity, or <a href="#" data-note-action>load a converged example</a>.',
      dependencies: ['set-equal-importance', 'set-sparsity'],
      setup: (ctx: AeTaskContext) => {
        const handler = createConvergenceHandler(
          ctx.services.svc,
          (svc) =>
            minPairwiseAngleDeg(svc.W.value) >= 65 &&
            allColumnNormsInRange(svc.W.value, 0.5, 1.1),
          50,
          () => ctx.services.svc.pauseTraining(),
          () =>
            ctx.services.svc.config.featureDecay >= 0.99 &&
            ctx.services.svc.config.sparsity >= 0.78,
        )
        let exampleLoaded = false
        return {
          ...handler,
          events: [...handler.events, 'converged-example-loaded'],
          onEvent: (eventName: string, payload?: any) => {
            if (eventName === 'converged-example-loaded') exampleLoaded = true
            else handler.onEvent?.(eventName, payload)
          },
          check: () => exampleLoaded || handler.check(),
          noteAction: () => loadConvergedExample(ctx),
        }
      },
    },
    {
      id: 'check-angle',
      label: `Check the minimum angle between feature directions in the statistics view. Compare the angle to ${k('\\frac{360°}{5} =72°')}`,
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
