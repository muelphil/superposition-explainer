import type {AeTaskSpec, AeTaskContext} from './aeTaskHelpers'
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
            setup: (ctx: AeTaskContext) =>
                createConvergenceHandler(
                    ctx.services.svc,
                    (svc) =>
                        allColumnNormsInRange(svc.W.value, 0.999, 1.001) &&
                        Math.abs(minPairwiseAngleDeg(svc.W.value) - 90) < 0.01,
                    20,
                    () => ctx.services.svc.pauseTraining(),
                ),
        },
        {
            id: 'check-loss',
            label: 'Check out the loss in the training statistics',
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
            label: 'Check the angle between the two feature direction vectors in the training statistics',
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
            label: 'Check the vector lengths in the weight view',
            dependencies: ['converge'],
            setup: (ctx: AeTaskContext) => ({
                events: ['tab-changed'],
                check: () => ctx.services.viz.activeTab.value === 'weights',
            }),
        },
    ]
}
