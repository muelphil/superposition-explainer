import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'
import { k } from './aeTaskHelpers'

/**
 * Task specs for the sparsity interlude between experiments 2 and 3.
 * Guides the user to explore feature sparsity — no insight box.
 */
export function createInterludeTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'resample-1',
      label: 'Resample a few times using the resample button and observe the input vectors',
      setup: () => {
        let count = 0
        return {
          events: ['resample-clicked'],
          onEvent: () => { count++ },
          check: () => count >= 3,
          progress: () => ({ current: Math.min(count, 3), total: 3 }),
        }
      },
    },
    {
      id: 'decrease-sparsity',
      label: `Set sparsity to ${k('S = 0.8')} in the training config`,
      dependencies: ['resample-1'],
      setup: (ctx: AeTaskContext) => ({
        events: ['sparsity-changed'],
        check: () => ctx.services.svc.config.sparsity >= 0.75,
      }),
    },
    {
      id: 'resample-2',
      label: 'Resample — notice how most feature activations are now zero',
      dependencies: ['decrease-sparsity'],
      setup: () => {
        let count = 0
        return {
          events: ['resample-clicked'],
          onEvent: () => { count++ },
          check: () => count >= 3,
          progress: () => ({ current: Math.min(count, 3), total: 3 }),
        }
      },
    },
  ]
}
