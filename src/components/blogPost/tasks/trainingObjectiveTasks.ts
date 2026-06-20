import {AeTaskSpec, AeTaskContext, k} from './aeTaskHelpers'

/**
 * Task specs for the Training Objective block.
 * Encourages the reader to explore the importance weighting and inspect loss weights.
 */
export function createTrainingObjectiveTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'adjust-alpha',
      label: `Adjust the Importance ${k('\\alpha')} slider in the Training Configuration to change feature weighting`,
      note: 'In the autoencoder visualization, importance of features is visualized by the size of the corresponding input and output neurons',
      setup: (_ctx: AeTaskContext) => {
        let done = false
        return {
          events: ['importance-changed'],
          onEvent: () => { done = true },
          check: () => done,
        }
      },
    },
    {
      id: 'hover-neuron-loss',
      label: `Hover an input neuron to inspect its exact weight ${k('I_i')} in the loss function`,
      setup: (_ctx: AeTaskContext) => {
        let done = false
        return {
          events: ['input-neuron-hovered'],
          onEvent: () => { done = true },
          check: () => done,
        }
      },
    },
  ]
}
