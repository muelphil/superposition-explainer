import {AeTaskSpec, AeTaskContext, k} from './aeTaskHelpers'

/**
 * Task specs for the Training Objective block.
 * Encourages the reader to explore the importance weighting and inspect loss weights.
 */
export function createTrainingObjectiveTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'adjust-alpha',
      label: `Adjust the Importance ${k('\\alpha')} slider in the Training Config to change feature weighting`,
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
