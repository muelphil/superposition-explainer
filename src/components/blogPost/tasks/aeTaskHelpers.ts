import { ref, watch, type Ref } from 'vue'
import type { AutoencoderServiceType } from '../../../services/AutoencoderService'

/**
 * Check whether every column vector of W with significant norm
 * has its norm within [min, max].
 */
export function allColumnNormsInRange(W: number[][], min: number, max: number): boolean {
  const m = W.length
  if (m === 0) return false
  const n = W[0].length

  for (let j = 0; j < n; j++) {
    let norm2 = 0
    for (let k = 0; k < m; k++) norm2 += W[k][j] ** 2
    const norm = Math.sqrt(norm2)
    if (norm < min || norm > max) return false
  }
  return true
}

/**
 * Compute the minimum pairwise angle (in degrees) between column vectors of W.
 * Skips columns with near-zero norm (< 0.1).
 * Returns Infinity if fewer than 2 significant columns exist.
 */
export function minPairwiseAngleDeg(W: number[][]): number {
  const m = W.length
  if (m === 0) return Infinity
  const n = W[0].length

  // Extract columns and their norms
  const cols: { vec: number[]; norm: number }[] = []
  for (let j = 0; j < n; j++) {
    const vec = W.map(row => row[j])
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
    if (norm > 0.1) cols.push({ vec, norm })
  }

  if (cols.length < 2) return Infinity

  let minAngle = Infinity
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      let dot = 0
      for (let k = 0; k < m; k++) dot += cols[i].vec[k] * cols[j].vec[k]
      const cosTheta = Math.max(-1, Math.min(1, dot / (cols[i].norm * cols[j].norm)))
      const angle = Math.acos(Math.abs(cosTheta)) * (180 / Math.PI)
      if (angle < minAngle) minAngle = angle
    }
  }
  return minAngle
}

/**
 * Creates a convergence tracker that watches a service's training step
 * and checks a condition repeatedly. Once the condition holds for
 * `stableFor` consecutive checks, `converged` becomes true (sticky).
 *
 * Must be called during `<script setup>` so the watcher auto-cleans.
 *
 * @param svc       The autoencoder service to watch
 * @param check     Predicate evaluated on each training step
 * @param stableFor Number of consecutive passing checks required
 * @param onConverge Optional callback when convergence is detected
 */
export function createConvergenceTracker(
  svc: AutoencoderServiceType,
  check: (svc: AutoencoderServiceType) => boolean,
  stableFor: number,
  onConverge?: () => void,
): Ref<boolean> {
  const converged = ref(false)
  let stableCount = 0

  watch(
    () => svc.step.value,
    () => {
      if (converged.value || !svc.isTraining.value) return

      if (check(svc)) {
        stableCount++
      } else {
        stableCount = 0
      }

      if (stableCount >= stableFor) {
        converged.value = true
        onConverge?.()
      }
    },
  )

  return converged
}
