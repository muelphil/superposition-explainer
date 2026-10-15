/** mulberry32 — small, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Minimal slice of the AutoencoderService used for seeded setup. */
interface SeedableModel {
  config: { inputDim: number; embeddingDim: number }
  initialize(): void
  setInputDim(n: number): void
  setEmbeddingDim(m: number): void
  updateConfig(partial: { sparsity?: number; featureDecay?: number }): void
}

/**
 * Deterministic model setup. Mirrors a freshly created service (default
 * sparsity 0.8 at init — the sample generator's random consumption depends on
 * it) so trajectories match the offline seed search exactly.
 */
export function seededSetup(
    svc: SeedableModel,
    rng: () => number,
    opts: { n: number; m: number; sparsity: number; featureDecay: number },
) {
  withRng(rng, () => {
    svc.updateConfig({sparsity: 0.8})
    svc.initialize()
    if (svc.config.inputDim !== opts.n) svc.setInputDim(opts.n)
    if (svc.config.embeddingDim !== opts.m) svc.setEmbeddingDim(opts.m)
    svc.updateConfig({featureDecay: opts.featureDecay, sparsity: opts.sparsity})
  })
}

/**
 * Run `fn` with Math.random temporarily replaced by `rng`.
 * Scoping the swap (instead of replacing Math.random globally) keeps the
 * training trajectory deterministic even though Three.js and other
 * components also consume Math.random at render-time-dependent moments.
 */
export function withRng<T>(rng: () => number, fn: () => T): T {
  const orig = Math.random
  Math.random = rng
  try {
    return fn()
  } finally {
    Math.random = orig
  }
}
