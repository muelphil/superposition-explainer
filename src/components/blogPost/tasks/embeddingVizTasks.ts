import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'

/**
 * Task specs for the embedding visualization block.
 * Encourages the reader to interact with the AE view before reading further.
 *
 * Using a local `done` flag (set by onEvent) prevents the initial check() call
 * inside _subscribe() from auto-completing the task before any interaction.
 */
export function createEmbeddingVizTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'hover-neuron',
      label: 'Hover an input neuron to inspect which feature it represents',
      setup: (_ctx: AeTaskContext) => {
        let done = false
        return {
          events: ['input-neuron-hovered'],
          onEvent: () => { done = true },
          check: () => done,
        }
      },
    },
    {
      id: 'adjust-input',
      label: 'Adjust feature values using the sliders or input fields to explore different embeddings',
      setup: (_ctx: AeTaskContext) => {
        let done = false
        return {
          events: ['input-value-changed'],
          onEvent: () => { done = true },
          check: () => done,
        }
      },
    },
  ]
}
