import { ref, reactive, readonly } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoencoderConfig {
  inputDim: number        // n: number of features
  embeddingDim: number    // m: latent dimensions (m < n)
  sparsity: number        // S: probability a feature is active
  featureDecay: number    // α: importance = α^i
  learningRate: number
  batchSize: number
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
    sparsity: 0.1,
    featureDecay: 0.9,
    learningRate: 0.01,
    batchSize: 64,
  }

  // Reactive state
  const config = reactive<AutoencoderConfig>({ ...defaultConfig })

  const W = ref<number[][]>([])          // m × n
  const b = ref<number[]>([])            // n
  const featureImportance = ref<number[]>([])

  const currentInput = ref<number[]>([])
  const currentEmbedding = ref<number[]>([])
  const currentOutput = ref<number[]>([])
  const currentError = ref<number[]>([])
  const loss = ref(0)
  const step = ref(0)
  const isTraining = ref(false)

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
    // Initialize with dense normal samples so all neurons are visible on load
    currentInput.value = Array.from({ length: config.inputDim }, () => randn() * 0.8)
    _forwardPass(currentInput.value)
    step.value = 0
    loss.value = 0
  }

  // ─── Data generation ─────────────────────────────────────────────────────────

  function _generateSample(): number[] {
    return Array.from({ length: config.inputDim }, () =>
      Math.random() < config.sparsity ? randn() : 0
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
    const xHat = Wth.map((val, i) => relu(val + b.value[i]))

    currentInput.value = [...x]
    currentEmbedding.value = [...h]
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
    if (n < 2) return
    config.inputDim = n
    if (config.embeddingDim >= n) config.embeddingDim = n - 1
    initialize()
  }

  function setEmbeddingDim(m: number) {
    if (m < 1 || m >= config.inputDim) return
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

    // Update loss on first sample of batch
    const x0 = batch[0]
    const { xHat } = _forwardPass(x0)
    loss.value = _computeLoss(x0, xHat)
  }

  function startTraining() {
    if (isTraining.value) return
    isTraining.value = true

    const tick = () => {
      if (!isTraining.value) return
      // Run several steps per tick for speed
      for (let i = 0; i < 5; i++) stepTrain()
      trainingHandle = setTimeout(tick, 16) // ~60fps
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
    currentOutput,
    currentError,
    loss,
    step,
    isTraining,
    // Methods
    setInputDim,
    setEmbeddingDim,
    runForward,
    stepTrain,
    startTraining,
    stopTraining,
    initialize,
  }
}

export type AutoencoderServiceType = ReturnType<typeof createAutoencoderService>
