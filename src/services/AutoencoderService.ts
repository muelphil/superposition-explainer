import { ref, reactive, readonly } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Hard limits for interactive dimension controls */
export const INPUT_DIM_MIN = 2
export const INPUT_DIM_MAX = 8
export const EMB_DIM_MIN = 1
export const EMB_DIM_MAX = 3

export interface AutoencoderConfig {
  inputDim: number        // n: number of features
  embeddingDim: number    // m: latent dimensions (m < n)
  sparsity: number        // S: sparsity — probability a feature is zero (1−S = activation probability)
  featureDecay: number    // α: importance = α^i
  learningRate: number
  batchSize: number
}

/** Snapshot of the full autoencoder state for save/restore across experiment transitions. */
export interface AeSnapshot {
  W: number[][]
  b: number[]
  inputDim: number
  embeddingDim: number
  sparsity: number
  featureDecay: number
  learningRate: number
  batchSize: number
  step: number
  loss: number
  lossHistory: { s: number; v: number }[]
  featurePresenceHistory: { s: number; v: number }[]
  minAngleHistory: { s: number; v: number }[]
  pauseSteps: number[]
  currentInput: number[]
}

export interface AutoencoderState {
  config: AutoencoderConfig
  W: number[][]           // m × n weight matrix
  b: number[]             // n bias vector
  currentInput: number[]
  currentEmbedding: number[]
  currentOutput: number[]
  currentError: number[]
  loss: number
  step: number
  isTraining: boolean
  featureImportance: number[]  // I_i = α^i
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0))
}

function randn(): number {
  // Box-Muller transform
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function relu(x: number): number {
  return Math.max(0, x)
}

/** Multiply matrix A (r×c) by column vector v (c) → result (r) */
function matVecMul(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((sum, aij, j) => sum + aij * v[j], 0))
}

/** Multiply matrix A^T (c×r) by column vector v (r) → result (c) */
function matTransVecMul(A: number[][], v: number[]): number[] {
  const rows = A.length
  const cols = A[0].length
  const result = Array(cols).fill(0)
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) {
      result[j] += A[i][j] * v[i]
    }
  }
  return result
}

// ─── AutoencoderService ───────────────────────────────────────────────────────

export function createAutoencoderService() {
  // Default configuration
  const defaultConfig: AutoencoderConfig = {
    inputDim: 5,
    embeddingDim: 2,
    sparsity: 0.8,
    featureDecay: 0.9,
    learningRate: 0.015,
    batchSize: 64,
  }

  // Reactive state
  const config = reactive<AutoencoderConfig>({ ...defaultConfig })

  const W = ref<number[][]>([])          // m × n
  const b = ref<number[]>([])            // n
  const featureImportance = ref<number[]>([])

  const currentInput = ref<number[]>([])
  const currentEmbedding = ref<number[]>([])
  const currentPreActivation = ref<number[]>([])   // Wᵀh + b, before ReLU
  const currentOutput = ref<number[]>([])
  const currentError = ref<number[]>([])
  const loss = ref(0)
  const step = ref(0)
  const isTraining = ref(false)
  const trainingStartStep = ref(0)

  // Optional event bus for task system integration (attached from blog section)
  let _eventBus: { emit: (event: string, payload?: any) => void } | null = null
  function attachEventBus(bus: { emit: (event: string, payload?: any) => void } | null) {
    _eventBus = bus
  }

  // ─── Metric history (recorded every HISTORY_INTERVAL steps) ──────────────────
  const HISTORY_INTERVAL = 20
  const MAX_HISTORY = 400

  type HistPoint = { s: number; v: number }
  const lossHistory            = ref<HistPoint[]>([])
  const featurePresenceHistory = ref<HistPoint[]>([])
  const minAngleHistory        = ref<HistPoint[]>([])
  const pauseSteps             = ref<number[]>([])

  function _pushHistory(hist: typeof lossHistory, s: number, v: number) {
    hist.value.push({ s, v })
    if (hist.value.length > MAX_HISTORY) hist.value.shift()
  }

  function _computeFeaturePresence(): number {
    // sum_i min(|W[:,i]|², 1)  — "effective number of features present"
    let total = 0
    for (let i = 0; i < config.inputDim; i++) {
      let norm2 = 0
      for (let k = 0; k < config.embeddingDim; k++) {
        norm2 += (W.value[k]?.[i] ?? 0) ** 2
      }
      total += Math.min(norm2, 1)
    }
    return total
  }

  function _computeAvgMinAngle(): number {
    const n = config.inputDim
    const m = config.embeddingDim
    const PRESENCE_NORM_THRESHOLD = 0.1  // |v_i| > 0.1 to be considered "present"

    const vecs = Array.from({ length: n }, (_, i) =>
      Array.from({ length: m }, (_, k) => W.value[k]?.[i] ?? 0)
    )
    const norms = vecs.map(v => Math.sqrt(v.reduce((s, x) => s + x * x, 0)))

    let total = 0, count = 0
    for (let i = 0; i < n; i++) {
      if (norms[i] < PRESENCE_NORM_THRESHOLD) continue   // skip absent features
      let minAngle = Infinity
      for (let j = 0; j < n; j++) {
        if (i === j || norms[j] < PRESENCE_NORM_THRESHOLD) continue
        const dot = vecs[i].reduce((s, x, k) => s + x * vecs[j][k], 0)
        const cos = Math.max(-1, Math.min(1, dot / (norms[i] * norms[j])))
        const angle = Math.acos(cos) * (180 / Math.PI)
        if (angle < minAngle) minAngle = angle
      }
      if (isFinite(minAngle)) { total += minAngle; count++ }
    }
    return count > 0 ? total / count : 0
  }

  function _recordMetrics() {
    const s = step.value
    _pushHistory(lossHistory, s, loss.value)
    _pushHistory(featurePresenceHistory, s, _computeFeaturePresence())
    _pushHistory(minAngleHistory, s, _computeAvgMinAngle())
  }

  // Adam optimizer moments
  let mW: number[][] = []
  let vW: number[][] = []
  let mb: number[] = []
  let vb: number[] = []
  let adamT = 0

  // Training loop handle
  let trainingHandle: ReturnType<typeof setTimeout> | null = null

  // ─── Initialization ──────────────────────────────────────────────────────────

  function _computeImportance() {
    const n = config.inputDim
    featureImportance.value = Array.from({ length: n }, (_, i) => Math.pow(config.featureDecay, i))
  }

  function _initWeights() {
    const { inputDim: n, embeddingDim: m } = config
    // Xavier-style initialization: scale by 1/sqrt(n)
    const scale = 1 / Math.sqrt(n)
    W.value = Array.from({ length: m }, () =>
      Array.from({ length: n }, () => randn() * scale)
    )
    b.value = Array(n).fill(0)

    // Adam moments
    mW = zeros(m, n)
    vW = zeros(m, n)
    mb = Array(n).fill(0)
    vb = Array(n).fill(0)
    adamT = 0
  }

  function initialize() {
    _computeImportance()
    _initWeights()
    currentInput.value = _generateSample()
    _forwardPass(currentInput.value)
    step.value = 0
    loss.value = 0
    lossHistory.value = []
    featurePresenceHistory.value = []
    minAngleHistory.value = []
    pauseSteps.value = []
  }

  // ─── Data generation ─────────────────────────────────────────────────────────

  function _generateSample(): number[] {
    // Features are non-negative (half-normal), matching the Anthropic toy model
    // assumption that x ∈ ℝ₊ⁿ — required for ReLU to achieve zero reconstruction loss.
    return Array.from({ length: config.inputDim }, () =>
      Math.random() < (1 - config.sparsity) ? Math.abs(randn()) : 0
    )
  }

  function _generateBatch(size: number): number[][] {
    return Array.from({ length: size }, () => _generateSample())
  }

  // ─── Forward pass ────────────────────────────────────────────────────────────

  function _forwardPass(x: number[]): { h: number[]; xHat: number[] } {
    // h = W * x  (embedding)
    const h = matVecMul(W.value, x)

    // xHat = ReLU(W^T * h + b)
    const Wth = matTransVecMul(W.value, h)
    const pre = Wth.map((val, i) => val + b.value[i])
    const xHat = pre.map(val => relu(val))

    currentInput.value = [...x]
    currentEmbedding.value = [...h]
    currentPreActivation.value = [...pre]
    currentOutput.value = [...xHat]
    currentError.value = x.map((xi, i) => xi - xHat[i])

    return { h, xHat }
  }

  // ─── Loss computation ─────────────────────────────────────────────────────────

  function _computeLoss(x: number[], xHat: number[]): number {
    return x.reduce((sum, xi, i) => sum + featureImportance.value[i] * (xi - xHat[i]) ** 2, 0)
  }

  // ─── Gradient computation ─────────────────────────────────────────────────────

  function _computeGradients(batch: number[][]): { dW: number[][]; db: number[] } {
    const { inputDim: n, embeddingDim: m } = config
    const dW = zeros(m, n)
    const db = Array(n).fill(0)
    const batchSize = batch.length

    for (const x of batch) {
      const h = matVecMul(W.value, x)
      const Wth = matTransVecMul(W.value, h)
      const xHat = Wth.map((val, i) => relu(val + b.value[i]))

      // dL/dxHat_i = -2 * I_i * (x_i - xHat_i)
      const dLdxHat = x.map((xi, i) =>
        -2 * featureImportance.value[i] * (xi - xHat[i])
      )

      // ReLU mask: gradient passes only where pre-activation > 0
      const reluMask = Wth.map((val, i) => (val + b.value[i] > 0 ? 1 : 0))

      // dL/dpre_i = dL/dxHat_i * mask_i  (pre = W^T h + b)
      const dLdpre = dLdxHat.map((g, i) => g * reluMask[i])

      // dL/db = dL/dpre
      for (let i = 0; i < n; i++) db[i] += dLdpre[i] / batchSize

      // Gradient of W from two paths (tied weights):
      //   h = Wx  →  dL/dW[k][j] += dLdh[k] * x[j]   where dLdh = W * dLdpre
      //   xHat = ReLU(W^T h + b)  →  dL/dW[k][j] += dLdpre[j] * h[k]
      const dLdh = matVecMul(W.value, dLdpre)  // m-vector

      for (let k = 0; k < m; k++) {
        for (let j = 0; j < n; j++) {
          dW[k][j] += (dLdh[k] * x[j] + dLdpre[j] * h[k]) / batchSize
        }
      }
    }

    return { dW, db }
  }

  // ─── Adam optimizer step ─────────────────────────────────────────────────────

  function _adamUpdate(dW: number[][], db: number[]) {
    const lr = config.learningRate
    const beta1 = 0.9, beta2 = 0.999, eps = 1e-8
    const { embeddingDim: m, inputDim: n } = config
    adamT++

    const bc1 = 1 - beta1 ** adamT
    const bc2 = 1 - beta2 ** adamT

    for (let k = 0; k < m; k++) {
      for (let j = 0; j < n; j++) {
        mW[k][j] = beta1 * mW[k][j] + (1 - beta1) * dW[k][j]
        vW[k][j] = beta2 * vW[k][j] + (1 - beta2) * dW[k][j] ** 2
        const mHat = mW[k][j] / bc1
        const vHat = vW[k][j] / bc2
        W.value[k][j] -= lr * mHat / (Math.sqrt(vHat) + eps)
      }
    }

    for (let i = 0; i < n; i++) {
      mb[i] = beta1 * mb[i] + (1 - beta1) * db[i]
      vb[i] = beta2 * vb[i] + (1 - beta2) * db[i] ** 2
      const mHat = mb[i] / bc1
      const vHat = vb[i] / bc2
      b.value[i] -= lr * mHat / (Math.sqrt(vHat) + eps)
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  function setInputDim(n: number) {
    if (n < INPUT_DIM_MIN || n > INPUT_DIM_MAX) return
    stopTraining()
    config.inputDim = n
    initialize()
  }

  function setEmbeddingDim(m: number) {
    if (m < EMB_DIM_MIN || m > EMB_DIM_MAX) return
    stopTraining()
    config.embeddingDim = m
    initialize()
  }

  function runForward(x?: number[]) {
    const input = x ?? _generateSample()
    _forwardPass(input)
  }

  function stepTrain() {
    const batch = _generateBatch(config.batchSize)
    const { dW, db } = _computeGradients(batch)
    _adamUpdate(dW, db)
    step.value++

    // Update visualization with first sample of the batch
    const x0 = batch[0]
    const { xHat: xHat0 } = _forwardPass(x0)

    // Display batch-averaged loss (less noisy than single-sample)
    let batchLoss = 0
    for (const x of batch) {
      const h = matVecMul(W.value, x)
      const Wth = matTransVecMul(W.value, h)
      const xHat = Wth.map((val, i) => relu(val + b.value[i]))
      batchLoss += _computeLoss(x, xHat)
    }
    loss.value = batchLoss / batch.length

    if (step.value % HISTORY_INTERVAL === 0) _recordMetrics()

    // Emit training-step event if an event bus is attached
    _eventBus?.emit('training-step', { step: step.value })
  }

  function updateConfig(partial: Partial<Pick<AutoencoderConfig,
    'sparsity' | 'featureDecay' | 'learningRate' | 'batchSize'
  >>) {
    if (partial.sparsity !== undefined) config.sparsity = partial.sparsity
    if (partial.featureDecay !== undefined) {
      config.featureDecay = partial.featureDecay
      _computeImportance()
    }
    if (partial.learningRate !== undefined) config.learningRate = partial.learningRate
    if (partial.batchSize !== undefined) config.batchSize = partial.batchSize
    resetTraining()
    if (partial.sparsity !== undefined) _eventBus?.emit('sparsity-changed', { value: config.sparsity })
    if (partial.featureDecay !== undefined) _eventBus?.emit('importance-changed', { value: config.featureDecay })
  }

  function startTraining() {
    if (isTraining.value) return
    isTraining.value = true
    trainingStartStep.value = step.value

    const tick = () => {
      if (!isTraining.value) return
      for (let i = 0; i < 5; i++) stepTrain()
      trainingHandle = setTimeout(tick, 16)
    }
    tick()
  }

  function stopTraining() {
    isTraining.value = false
    if (trainingHandle !== null) {
      clearTimeout(trainingHandle)
      trainingHandle = null
    }
  }

  function pauseTraining() {
    if (!isTraining.value) return
    if (step.value > 0) {
      pauseSteps.value = [...pauseSteps.value, step.value]
    }
    stopTraining()
  }

  /** Stop training and clear all history/counters (keeps current weights). */
  function resetTraining() {
    stopTraining()
    step.value = 0
    loss.value = 0
    trainingStartStep.value = 0
    lossHistory.value = []
    featurePresenceHistory.value = []
    minAngleHistory.value = []
    pauseSteps.value = []
    // Reset Adam moments so new run starts with clean optimizer state
    const { embeddingDim: m, inputDim: n } = config
    mW = zeros(m, n); vW = zeros(m, n)
    mb = Array(n).fill(0); vb = Array(n).fill(0)
    adamT = 0
  }

  /** Re-initialise weights (Xavier) + bias = 0, stop & clear training. */
  function resetWeights() {
    stopTraining()
    step.value = 0
    loss.value = 0
    trainingStartStep.value = 0
    lossHistory.value = []
    featurePresenceHistory.value = []
    minAngleHistory.value = []
    pauseSteps.value = []
    _initWeights()
    _forwardPass(currentInput.value)
    _eventBus?.emit('training-reset')
  }

  // ─── Input shelving (for output neuron visualization) ──────────────────────

  let shelvedInput: number[] | null = null

  /** Save the current input and run a forward pass with a unit vector at `idx`. */
  function shelveInput(idx: number) {
    if (shelvedInput === null) {
      shelvedInput = [...currentInput.value]
    }
    const unit = Array(config.inputDim).fill(0)
    unit[idx] = 1.0
    _forwardPass(unit)
  }

  /** Restore the user-provided input saved by shelveInput(). */
  function restoreInput() {
    if (shelvedInput !== null) {
      const saved = shelvedInput
      shelvedInput = null
      _forwardPass(saved)
    }
  }

  // ─── State save/restore (for experiment transitions) ─────────────────────────

  /** Snapshot the full service state for later restoration. */
  function saveState(): AeSnapshot {
    return {
      W: W.value.map(row => [...row]),
      b: [...b.value],
      inputDim: config.inputDim,
      embeddingDim: config.embeddingDim,
      sparsity: config.sparsity,
      featureDecay: config.featureDecay,
      learningRate: config.learningRate,
      batchSize: config.batchSize,
      step: step.value,
      loss: loss.value,
      lossHistory: lossHistory.value.map(p => ({ ...p })),
      featurePresenceHistory: featurePresenceHistory.value.map(p => ({ ...p })),
      minAngleHistory: minAngleHistory.value.map(p => ({ ...p })),
      pauseSteps: [...pauseSteps.value],
      currentInput: [...currentInput.value],
    }
  }

  /** Restore service state from a previously saved snapshot. */
  function restoreState(snap: AeSnapshot): void {
    stopTraining()
    config.inputDim = snap.inputDim
    config.embeddingDim = snap.embeddingDim
    config.sparsity = snap.sparsity
    config.featureDecay = snap.featureDecay
    config.learningRate = snap.learningRate
    config.batchSize = snap.batchSize
    _computeImportance()
    W.value = snap.W.map(row => [...row])
    b.value = [...snap.b]
    step.value = snap.step
    loss.value = snap.loss
    lossHistory.value = snap.lossHistory.map(p => ({ ...p }))
    featurePresenceHistory.value = snap.featurePresenceHistory.map(p => ({ ...p }))
    minAngleHistory.value = snap.minAngleHistory.map(p => ({ ...p }))
    pauseSteps.value = [...snap.pauseSteps]
    trainingStartStep.value = 0
    // Reset Adam moments for clean optimizer state on next training run
    const { embeddingDim: m, inputDim: n } = config
    mW = zeros(m, n); vW = zeros(m, n)
    mb = Array(n).fill(0); vb = Array(n).fill(0)
    adamT = 0
    _forwardPass(snap.currentInput)
  }

  // ─── Initialization on creation ──────────────────────────────────────────────

  initialize()

  // ─── Return public API ────────────────────────────────────────────────────────

  return {
    // Config (mutable via setters)
    config: readonly(config),
    // Reactive state
    W,
    b,
    featureImportance,
    currentInput,
    currentEmbedding,
    currentPreActivation,
    currentOutput,
    currentError,
    loss,
    step,
    isTraining,
    lossHistory,
    featurePresenceHistory,
    minAngleHistory,
    pauseSteps,
    // Methods
    setInputDim,
    setEmbeddingDim,
    updateConfig,
    runForward,
    stepTrain,
    startTraining,
    stopTraining,
    pauseTraining,
    initialize,
    resetWeights,
    trainingStartStep,
    generateSample: _generateSample,
    shelveInput,
    restoreInput,
    saveState,
    restoreState,
    attachEventBus,
  }
}

export type AutoencoderServiceType = ReturnType<typeof createAutoencoderService>
