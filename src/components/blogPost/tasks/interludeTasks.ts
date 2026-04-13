import { computed } from 'vue'
import type { TaskSpec, TaskContext } from '../taskSystem'

/**
 * Task specs for the sparsity interlude between experiments 2 and 3.
 * Guides the user to explore feature sparsity — no insight box.
 */
export function createInterludeTaskSpecs(): TaskSpec[] {
  return [
    {
      id: 'resample',
      label: 'Resample a few times using the resample button and observe the input vectors',
      optional: true,
      setup: () => computed(() => true),
    },
    {
      id: 'decrease-sparsity',
      label: 'Decrease sparsity to S = 0.2 and resample — notice how most feature activations are now zero',
      // Draft S = 0.2 (20% active) → service sparsity = 0.8 (80% zero)
      setup: (ctx: TaskContext) =>
        computed(() => ctx.svc.config.sparsity >= 0.75),
    },
  ]
}
