import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'

/**
 * Task specs for the Synthetic Training Data block.
 * Encourages the reader to resample the input using the resample button.
 */
export function createDataTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'resample',
      label: 'Click the resample button (↻) above the inputs to draw a new training sample',
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
