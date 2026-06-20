import type { AeTaskSpec, AeTaskContext } from './aeTaskHelpers'
import { k } from './aeTaskHelpers'

/**
 * Task specs for the sparsity interlude between experiments 2 and 3.
 * Guides the user to explore feature sparsity — no insight box.
 */
export function createInterludeTaskSpecs(): AeTaskSpec[] {
  return [
    {
      id: 'confirm-sparsity-zero',
      label: `Confirm no sparsity is set: ${k('S = 0')} (dense features)`,
      resetable: true,
      setup: (ctx: AeTaskContext) => ({
        events: ['sparsity-changed'],
        check: () => ctx.services.svc.config.sparsity === 0,
      }),
    },
    {
      id: 'resample-1',
      label: 'Resample a few times using the resample button <span class="inline-resample-btn"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></span> and observe the feature activations',
      dependencies: ['confirm-sparsity-zero'],
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
      label: `Set sparsity to ${k('S = 0.8')} or higher in the Training Configuration`,
      dependencies: ['resample-1'],
      resetable: true,
      setup: (ctx: AeTaskContext) => ({
        events: ['sparsity-changed'],
        check: () => ctx.services.svc.config.sparsity >= 0.78,
      }),
    },
    {
      id: 'resample-2',
      label: 'Resample again and observe the feature activations — notice how most feature activations are now zero',
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
