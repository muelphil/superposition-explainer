import {AeTaskSpec, AeTaskContext, k} from './aeTaskHelpers'
import {allColumnNormsInRange, minPairwiseAngleDeg, createConvergenceHandler} from './aeTaskHelpers'

/**
 * Task specs for Experiment 1: two features in two dimensions.
 * The model should converge to an orthonormal basis with zero reconstruction loss.
 */
export function createExp1TaskSpecs(): AeTaskSpec[] {
    return [
        {
            id: 'converge',
            label: 'Run training and wait for convergence',
            note: 'The experiment will automatically pause when convergence is reached.',
            setup: (ctx: AeTaskContext) =>
                createConvergenceHandler(
                    ctx.services.svc,
                    (svc) =>
                        allColumnNormsInRange(svc.W.value, 0.999, 1.001) &&
                        Math.abs(minPairwiseAngleDeg(svc.W.value) - 90) < 0.01,
                    50,
                    () => ctx.services.svc.pauseTraining(),
                ),
        },
        {
            id: 'check-loss',
            label: 'Check out the loss by navigating to the statistics panel ',
            dependencies: ['converge'],
            setup: (ctx: AeTaskContext) => ({
                events: ['tab-changed', 'stats-chart-changed'],
                check: () =>
                    ctx.services.viz.activeTab.value === 'statistics' &&
                    ctx.services.viz.statsChart.value === 'loss',
            }),
        },
        {
            id: 'check-angle',
            label: 'Check the angle between the two feature direction vectors, by navigating to the statistics panel and selecting the Min Angle statistic',
            dependencies: ['converge'],
            setup: (ctx: AeTaskContext) => ({
                events: ['tab-changed', 'stats-chart-changed'],
                check: () =>
                    ctx.services.viz.activeTab.value === 'statistics' &&
                    ctx.services.viz.statsChart.value === 'angle',
            }),
        },
        {
            id: 'check-norms',
            label: `Check the length of the feature direction vectors by navigating to the Weights panel and inspecting the ${k('||w_i||')} entries underneath the weights matrix ${k('W')}`,
            dependencies: ['converge'],
            setup: (ctx: AeTaskContext) => ({
                events: ['tab-changed'],
                check: () => ctx.services.viz.activeTab.value === 'weights',
            }),
        },
    ]
}
