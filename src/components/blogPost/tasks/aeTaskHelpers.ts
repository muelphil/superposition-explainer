import katex from 'katex'
import type { AutoencoderServiceType } from '../../../services/AutoencoderService'
import type { VizServiceType } from '../../../services/VizService'
import type { TaskHandler, TaskContext, TaskSpec } from '../taskSystem'

/** Service bag for autoencoder section tasks. */
export type AeServices = { svc: AutoencoderServiceType; viz: VizServiceType }
export type AeTaskContext = TaskContext<AeServices>
export type AeTaskSpec = TaskSpec<AeServices>

/**
 * Render a LaTeX expression to an HTML string for use in task labels.
 * Wraps katex.renderToString with throwOnError: false.
 */
export function k(expr: string): string {
  return katex.renderToString(expr, { throwOnError: false })
}

/**
 * Count the number of column vectors in W whose norm meets or exceeds `minNorm`.
 */
export function countSignificantColumns(W: number[][], minNorm: number = 0.3): number {
  const m = W.length
  if (m === 0) return 0
  const n = W[0].length
  let count = 0
  for (let j = 0; j < n; j++) {
    let norm2 = 0
    for (let k = 0; k < m; k++) norm2 += W[k][j] ** 2
    if (Math.sqrt(norm2) >= minNorm) count++
  }
  return count
}

/**
 * Return an array of Euclidean norms for each column vector of W.
 */
export function columnNorms(W: number[][]): number[] {
  const m = W.length
  if (m === 0) return []
  const n = W[0].length
  const norms: number[] = []
  for (let j = 0; j < n; j++) {
    let sum = 0
    for (let r = 0; r < m; r++) sum += W[r][j] ** 2
    norms.push(Math.sqrt(sum))
  }
  return norms
}

/**
 * Compute the angle (in degrees, [0°, 180°]) between column j1 and column j2 of W.
 */
export function columnAngleDeg(W: number[][], j1: number, j2: number): number {
  const m = W.length
  let dot = 0, n1 = 0, n2 = 0
  for (let r = 0; r < m; r++) {
    dot += W[r][j1] * W[r][j2]
    n1 += W[r][j1] ** 2
    n2 += W[r][j2] ** 2
  }
  const denom = Math.sqrt(n1) * Math.sqrt(n2)
  if (denom < 1e-10) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / denom))) * (180 / Math.PI)
}

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
 * Compute the minimum pairwise angle (in degrees, range [0°, 180°]) between
 * column vectors of W. Skips columns with near-zero norm (< 0.1).
 * Returns Infinity if fewer than 2 significant columns exist.
 *
 * Note: angles are NOT folded to [0°, 90°]; anti-parallel vectors give 180°,
 * not 0°. This matches the service's own angle metric.
 */
export function minPairwiseAngleDeg(W: number[][]): number {
  const m = W.length
  if (m === 0) return Infinity
  const n = W[0].length

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
      const angle = Math.acos(cosTheta) * (180 / Math.PI)
      if (angle < minAngle) minAngle = angle
    }
  }
  return minAngle
}

/**
 * Creates a convergence TaskHandler that listens to `training-step` events
 * and checks a condition. Once the condition holds for `stableFor` consecutive
 * checks, the task is complete and `onConverge` is called.
 *
 * `guard` is evaluated before the check on each step. When it returns false,
 * the stable-count resets and the step is skipped.
 *
 * @param svc        The autoencoder service to query
 * @param condition  Predicate evaluated on each training step
 * @param stableFor  Number of consecutive passing checks required
 * @param onConverge Optional callback when convergence is detected
 * @param guard      Optional gate — if it returns false the step is skipped
 */
export function createConvergenceHandler(
  svc: AutoencoderServiceType,
  condition: (svc: AutoencoderServiceType) => boolean,
  stableFor: number,
  onConverge?: () => void,
  guard?: () => boolean,
): TaskHandler {
  let stableCount = 0
  let converged = false

  return {
    events: ['training-step', 'training-reset'],
    onEvent: (eventName: string) => {
      if (converged) return
      if (eventName === 'training-reset') { stableCount = 0; return }
      if (!svc.isTraining.value) return
      if (guard && !guard()) { stableCount = 0; return }
      if (condition(svc)) {
        stableCount++
      } else {
        stableCount = 0
      }
      if (stableCount >= stableFor) {
        converged = true
        onConverge?.()
      }
    },
    check: () => converged,
  }
}
