import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'

/**
 * Task specs for the Synthetic Training Data block.
 * Encourages the reader to resample the input using the resample button.
 */
export function createDataTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'resample',
      label: 'Repeatedly click the resample button <span class="inline-resample-btn"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></span> above the inputs to draw new training samples. Note how the feature activation strength, both in the input and the reconstruction is represented by input and output neuron color intensity.',
      setup: (_ctx: AeTaskContext) => {
        let done = false
        return {
          events: ['resample-clicked'],
          onEvent: () => { done = true },
          check: () => done,
        }
      },
    },
  ]
}
