import {
  columnNorms,
  columnAngleDeg,
  minPairwiseAngleDeg,
  allColumnNormsInRange,
} from '../components/blogPost/tasks/aeTaskHelpers'

/**
 * Convergence criteria for the promo training runs, adapted from the explainer's
 * experiments. Shared with the offline seed search so the chosen seeds are
 * guaranteed to converge in the video.
 */

/** Dense (Exp. 2 style): features 1+2 kept at ~unit norm and 90°, the rest collapsed. */
export function denseConverged(W: number[][]): boolean {
  const norms = columnNorms(W)
  const keptOk = norms[0] >= 0.97 && norms[0] <= 1.03 && norms[1] >= 0.97 && norms[1] <= 1.03
  const droppedOk = norms.slice(2).every(x => x < 0.15)
  const angle = columnAngleDeg(W, 0, 1)
  return keptOk && droppedOk && angle >= 89 && angle <= 91
}

/** Sparse 2D (Exp. 4 style): all features represented and spread ≥ 65° apart. */
export function sparseConverged(W: number[][]): boolean {
  return minPairwiseAngleDeg(W) >= 65 && allColumnNormsInRange(W, 0.5, 1.1)
}

/** Sparse 3D: all features represented and spread ≥ 60° apart. */
export function sparse3dConverged(W: number[][]): boolean {
  return minPairwiseAngleDeg(W) >= 60 && allColumnNormsInRange(W, 0.5, 1.1)
}

/** Consecutive passing steps required, as in the explainer's convergence handler. */
export const STABLE_FOR = 50
