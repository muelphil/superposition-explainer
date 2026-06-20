import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'
import { k, columnNorms, columnAngleDeg, createConvergenceHandler } from './aeTaskHelpers'

/**
 * Task specs for Experiment 2: four features in two dimensions (dense).
 * With importance decay α ≤ 0.8, the model should represent only the
 * two most important features and collapse the rest.
 */
export function createExp2TaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'set-importance',
      label: `Lower importance ${k('\\alpha')} to at most 0.8 to simulate features of different importances`,
      setup: (ctx: AeTaskContext) => ({
        events: ['importance-changed'],
        check: () => ctx.services.svc.config.featureDecay <= 0.805,
      }),
    },
    {
      id: 'converge',
      label: 'Run training and wait for convergence',
      note: 'The experiment will automatically pause when convergence is reached.', // Convergent behavior may take some time to appear — consider resetting and rerunning if it takes too long.
      dependencies: ['set-importance'],
      setup: (ctx: AeTaskContext) =>
        createConvergenceHandler(
          ctx.services.svc,
          (svc) => {
            const norms = columnNorms(svc.W.value)
            if (norms.length < 4) return false
            const importantOk = norms[0] >= 0.97 && norms[0] <= 1.03 &&
                                  norms[1] >= 0.97 && norms[1] <= 1.03
            const collapsedOk = norms[2] < 0.15 && norms[3] < 0.15
            const angle = columnAngleDeg(svc.W.value, 0, 1)
            const biasOk = Math.abs(svc.b.value[2] - 0.798) < 0.04 &&
                           Math.abs(svc.b.value[3] - 0.798) < 0.04
            return importantOk && collapsedOk && angle >= 89 && angle <= 91 && biasOk
          },
          30,
          () => ctx.services.svc.pauseTraining(),
          () => ctx.services.svc.config.featureDecay <= 0.805,
        ),
    },
    {
      id: 'check-features',
      label: 'Hover over all four input neurons to observe which features are represented in embedding space. What role does importance play?',
      dependencies: ['converge'],
      setup: () => {
        let hovered = false
        return {
          events: ['input-neuron-hovered'],
          onEvent: (_: string, payload?: any) => {
            if (payload?.index === 0) hovered = true
          },
          check: () => hovered,
        }
      },
    },
    {
      id: 'check-bias',
      label: `For unrepresented features, check their learned bias in the Weights Panel. Compare the bias to the <a href="https://en.wikipedia.org/wiki/Half-normal_distribution" target="_blank" rel="noopener">mean of the half-normal distribution</a>, from which the feature activation values are sampled during training, ${k('\\mu = \\sqrt{2/\\pi} \\approx 0.798')}`,
      dependencies: ['converge'],
      setup: (ctx: AeTaskContext) => ({
        events: ['tab-changed'],
        check: () => ctx.services.viz.activeTab.value === 'weights',
      }),
    },
  ]
}
