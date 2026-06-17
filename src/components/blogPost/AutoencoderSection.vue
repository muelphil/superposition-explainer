<script setup lang="ts">
import { ref, provide, onUnmounted, nextTick } from 'vue'
import { createAutoencoderService, INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX } from '../../services/AutoencoderService'
import type { AeSnapshot } from '../../services/AutoencoderService'
import { createSelectionService } from '../../services/SelectionService'
import { createVizService, VIZ_SERVICE_KEY, type RevealStage } from '../../services/VizService'
import { revealUpTo, applyPulse, clearAllPulse } from '../../utils/revealPulse'
import { useScrollActiveBlock } from './useScrollActiveParagraph'
import { useParagraphRanges, type ParagraphRange } from './useParagraphRanges'
import { type AeConstraintSpec, AE_VIEW_CONSTRAINTS_KEY, deriveConstraints } from './aeStepTypes'
import { TaskList, TaskEventBus, TASK_EVENT_BUS_KEY } from './taskSystem'
import { createExp1TaskSpecs } from './tasks/exp1Tasks'
import { createExp2TaskSpecs } from './tasks/exp2Tasks'
import { createInterludeTaskSpecs } from './tasks/interludeTasks'
import { createExp3TaskSpecs } from './tasks/exp3Tasks'
import { createExp4TaskSpecs } from './tasks/exp4Tasks'
import { createEmbeddingVizTaskSpecs } from './tasks/embeddingVizTasks'
import { createDataTaskSpecs } from './tasks/dataTasks'
import { createTrainingObjectiveTaskSpecs } from './tasks/trainingObjectiveTasks'
import AutoencoderVisualization from './AutoencoderVisualization.vue'
import TaskListDisplay from './TaskListDisplay.vue'

// ─── Service instances (owned here, provided to children) ─────────────────────

const svc = createAutoencoderService()
provide('autoencoderService', svc)

const selSvc = createSelectionService()
provide('selectionService', selSvc)

const vizSvc = createVizService()
provide(VIZ_SERVICE_KEY, vizSvc)

// Start fully hidden — reveal stages and panel visibility are driven by scroll position.
// Both fields must be explicitly reset here because createVizService() defaults to 'full' / true
// (the correct state for MainView where everything is always visible).
vizSvc.revealStage.value = 'blank'
vizSvc.showEmbeddingPanel.value = false

// Template ref for the visualization container (used by reveal/pulse helpers)
const vizRef = ref<HTMLElement | null>(null)

const eventBus = new TaskEventBus()
provide(TASK_EVENT_BUS_KEY, eventBus)

svc.attachEventBus(eventBus)

onUnmounted(() => {
  svc.stopTraining()
  exp1TaskList.stopListening()
  exp2TaskList.stopListening()
  interludeTaskList.stopListening()
  exp3TaskList.stopListening()
  exp4TaskList.stopListening()
  embeddingVizTaskList.stopListening()
  dataTaskList.stopListening()
  trainingObjectiveTaskList.stopListening()
  eventBus.clear()
})

// ─── Reactive constraint spec (mutated inside apply()) ────────────────────────

const constraintSpec = ref<AeConstraintSpec | undefined>(undefined)
const constraints = deriveConstraints(constraintSpec, INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX)
provide(AE_VIEW_CONSTRAINTS_KEY, constraints)

// Guards first-time initialization per section entry so that scrolling between
// blocks within the same range does not re-initialize weights or regenerate inputs.
const toyModelInitialized = ref(false)

// ─── Task lists ───────────────────────────────────────────────────────────────

const taskCtx = { services: { svc, viz: vizSvc }, events: eventBus }

const exp1TaskList = new TaskList(createExp1TaskSpecs())
exp1TaskList.startListening(taskCtx)

const exp2TaskList = new TaskList(createExp2TaskSpecs())
exp2TaskList.startListening(taskCtx)

const interludeTaskList = new TaskList(createInterludeTaskSpecs())
interludeTaskList.startListening(taskCtx)

const exp3TaskList = new TaskList(createExp3TaskSpecs())
exp3TaskList.startListening(taskCtx)

const exp4TaskList = new TaskList(createExp4TaskSpecs())
exp4TaskList.startListening(taskCtx)

const embeddingVizTaskList = new TaskList(createEmbeddingVizTaskSpecs())
embeddingVizTaskList.startListening(taskCtx)

const dataTaskList = new TaskList(createDataTaskSpecs())
dataTaskList.startListening(taskCtx)

const trainingObjectiveTaskList = new TaskList(createTrainingObjectiveTaskSpecs())
trainingObjectiveTaskList.startListening(taskCtx)

// ─── Named text blocks ────────────────────────────────────────────────────────

const BLOCK_IDS = [
  'intro',
  'architecture', 'embedding', 'encoder', 'embedding-viz', 'weights-view',
  'decoder', 'tied-weights', 'bias-relu',
  'data', 'training',
  'exp1', 'exp2', 'interlude', 'exp3', 'exp4',
] as const

type BlockId = typeof BLOCK_IDS[number]

function blockIdx(id: BlockId): number { return BLOCK_IDS.indexOf(id) }

// ─── Paragraph ranges with save/restore ───────────────────────────────────────

const rangeStates: (AeSnapshot | null)[] = [null, null, null, null, null]

const blockRevealStage: Partial<Record<BlockId, RevealStage>> = {
  'intro':           'blank',
  'architecture':    'input-output',
  'embedding':       'embedding',
  'encoder':         'encoder',
  'embedding-viz':   'encoder',   // same AE reveal, embedding panel controlled separately
  'weights-view':    'weights-view',
  'decoder':         'decoder',
  'tied-weights':    'decoder',
  'bias-relu':       'bias-relu-highlight',
  'data':            'data',
  'training':        'training',
}

/** Which pulse target to activate for each block (null = no pulse). */
const blockPulseTarget: Partial<Record<BlockId, string>> = {
  'architecture':  'input-output',
  'embedding':     'embedding',
  'encoder':       'encoder',
  'embedding-viz': 'embedding',
  // 'weights-view' intentionally omitted — no pulse on the weights panel
  'decoder':       'decoder',
  'tied-weights':  'tied-weights',
  'bias-relu':     'bias-relu',
  'data':          'data',
  'training':      'training',
}

const ranges: ParagraphRange[] = [
  {
    // Toy Model section: intro → training, n=3 m=2
    from: blockIdx('intro'), to: blockIdx('training'),
    apply: (activeIndex: number) => {
      constraintSpec.value = { inputDim: 3, embeddingDim: 2, hiddenControls: ['sparsity'] }
      const id = BLOCK_IDS[activeIndex] as BlockId | undefined
      const stage = (id && blockRevealStage[id]) ?? 'training'
      vizSvc.revealStage.value = stage

      // The embedding panel is gated independently — it appears from 'embedding-viz' onward.
      // 'encoder' shares the same reveal stage as 'embedding-viz' but hides the panel.
      const embeddingPanelBlocks: BlockId[] = [
        'embedding-viz', 'weights-view', 'decoder', 'tied-weights',
        'bias-relu', 'data', 'training',
      ]
      vizSvc.showEmbeddingPanel.value = id ? embeddingPanelBlocks.includes(id) : true

      // Tab selection per block
      if (id === 'weights-view' || id === 'tied-weights') vizSvc.activeTab.value = 'weights'
      if (id === 'training') {
        vizSvc.activeTab.value = 'training'
        vizSvc.continueTrainingEnabled.value = false
      } else {
        vizSvc.continueTrainingEnabled.value = true
      }

      // Reveal + pulse via imperative helpers
      nextTick(() => {
        const el = vizRef.value
        if (!el) return
        revealUpTo(el, stage)
        clearAllPulse(el)
        const pulse = id ? blockPulseTarget[id] : undefined
        if (pulse) applyPulse(el, pulse, true)
      })

      // Activate only the task list for the current block; deactivate the others.
      embeddingVizTaskList.setActive(id === 'embedding-viz')
      dataTaskList.setActive(id === 'data')
      trainingObjectiveTaskList.setActive(id === 'training')

      if (rangeStates[0]) {
        svc.restoreState(rangeStates[0])
        // Consume the snapshot: subsequent applies within this range entry must not
        // keep re-restoring (which would overwrite the user's in-range adjustments).
        rangeStates[0] = null
        toyModelInitialized.value = true
      } else if (!toyModelInitialized.value) {
        toyModelInitialized.value = true
        if (svc.config.inputDim !== 3) svc.setInputDim(3)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
        if (svc.config.sparsity !== 0) svc.updateConfig({ sparsity: 0 })

        // Fixed initial weights for the architecture intro: 3 non-zero column vectors in 2D
        // W[row][col]: row = embedding dim, col = input feature
        // Columns: w1 = (0.80, 0.30), w2 = (-0.55, 0.65), w3 = (0.25, -0.70)
        svc.W.value = [
          [0.80, -0.55, 0.25],
          [0.30,  0.65, -0.70],
        ]
        // Re-run forward pass with the same input so the display reflects the fixed weights.
        svc.runForward(svc.currentInput.value)
      }
    },
    leave: () => {
      rangeStates[0] = svc.saveState()
      toyModelInitialized.value = false
      vizSvc.continueTrainingEnabled.value = true
      // Reset to hidden — forward transitions (exp1+) re-set this to true in their apply().
      // Without this, scrolling back above the section leaves the panel visible.
      vizSvc.showEmbeddingPanel.value = false
      vizSvc.revealStage.value = 'blank'
      embeddingVizTaskList.setActive(false)
      dataTaskList.setActive(false)
      trainingObjectiveTaskList.setActive(false)
      const el = vizRef.value
      if (el) clearAllPulse(el)
    },
  },
  {
    // Experiment 1: n=2 m=2
    from: blockIdx('exp1'), to: blockIdx('exp1'),
    apply: () => {
      constraintSpec.value = { inputDim: 2, embeddingDim: 2, hiddenControls: ['sparsity'] }
      vizSvc.revealStage.value = 'full'
      vizSvc.showEmbeddingPanel.value = true
      exp1TaskList.setActive(true)
      nextTick(() => { const el = vizRef.value; if (el) { revealUpTo(el, 'full'); clearAllPulse(el) } })
      if (rangeStates[1]) {
        svc.restoreState(rangeStates[1])
      } else {
        if (svc.config.inputDim !== 2) svc.setInputDim(2)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
        if (svc.config.sparsity !== 0) svc.updateConfig({ sparsity: 0 })
      }
    },
    leave: () => { exp1TaskList.setActive(false); rangeStates[1] = svc.saveState() },
  },
  {
    // Experiment 2: n=4 m=2
    from: blockIdx('exp2'), to: blockIdx('exp2'),
    apply: () => {
      constraintSpec.value = { inputDim: 4, embeddingDim: 2, hiddenControls: ['sparsity'] }
      vizSvc.revealStage.value = 'full'
      vizSvc.showEmbeddingPanel.value = true
      exp2TaskList.setActive(true)
      nextTick(() => { const el = vizRef.value; if (el) { revealUpTo(el, 'full'); clearAllPulse(el) } })
      if (rangeStates[2]) {
        svc.restoreState(rangeStates[2])
      } else {
        if (svc.config.inputDim !== 4) svc.setInputDim(4)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
        if (svc.config.sparsity !== 0) svc.updateConfig({ sparsity: 0 })
      }
    },
    leave: () => { exp2TaskList.setActive(false); rangeStates[2] = svc.saveState() },
  },
  {
    // Interlude + Experiment 3: n=4 m=2
    from: blockIdx('interlude'), to: blockIdx('exp3'),
    apply: (activeIndex: number) => {
      const id = BLOCK_IDS[activeIndex] as BlockId | undefined
      constraintSpec.value = { inputDim: 4, embeddingDim: 2 }
      vizSvc.revealStage.value = 'full'
      vizSvc.showEmbeddingPanel.value = true
      interludeTaskList.setActive(id === 'interlude')
      exp3TaskList.setActive(id === 'exp3')
      nextTick(() => { const el = vizRef.value; if (el) { revealUpTo(el, 'full'); clearAllPulse(el) } })
      if (rangeStates[3]) {
        svc.restoreState(rangeStates[3])
      } else {
        if (svc.config.inputDim !== 4) svc.setInputDim(4)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
        svc.updateConfig({ sparsity: 0 })
      }
    },
    leave: () => { interludeTaskList.setActive(false); exp3TaskList.setActive(false); rangeStates[3] = svc.saveState() },
  },
  {
    // Experiment 4: n=5 m=2
    from: blockIdx('exp4'), to: blockIdx('exp4'),
    apply: () => {
      constraintSpec.value = { inputDim: 5, embeddingDim: 2 }
      vizSvc.revealStage.value = 'full'
      vizSvc.showEmbeddingPanel.value = true
      exp4TaskList.setActive(true)
      nextTick(() => { const el = vizRef.value; if (el) { revealUpTo(el, 'full'); clearAllPulse(el) } })
      if (rangeStates[4]) {
        svc.restoreState(rangeStates[4])
      } else {
        if (svc.config.inputDim !== 5) svc.setInputDim(5)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
      }
    },
    leave: () => { exp4TaskList.setActive(false); rangeStates[4] = svc.saveState() },
  },
]

const paragraphRefs = ref<(HTMLElement | null)[]>([])
const { activeBlockIndex } = useScrollActiveBlock(paragraphRefs)
useParagraphRanges(ranges, activeBlockIndex)
</script>
<template>
  <!-- Single-root section: owns its own CSS grid, centered at wider width -->
  <div class="ae-section post-section">
    <!-- Text column -->
    <h2 class="section-heading" style="grid-column: 1 / -1;">The Toy Autoencoder</h2>
     <div class="text-column" data-scroll-dir="down">

      <!-- ═══ Block 'intro' — blank state, nothing revealed ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('intro')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('intro') }"
      >
        <p>
          The clean encode/decode symmetry of an orthonormal basis — embed with
          <katex-element expression="W" />, recover with <katex-element expression="W^T" />
          — is the geometric intuition behind the architecture of our toy autoencoder.
          In this section, we define the model formally.
        </p>
      </div>

      <h3>Architecture</h3>

      <!-- ═══ Block 'architecture' — reveals input+output neurons ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('architecture')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('architecture') }"
      >
        <p>
          The visualization on the right shows the input and output neurons of the model.
          The input vector <katex-element expression="x \in \mathbb{R}^n" /> enters from
          the left; the autoencoder's goal is to reconstruct it as faithfully as possible
          at the output <katex-element expression="\hat{x} \in \mathbb{R}^n" />, so the
          output layer has the same dimensionality as the input.
        </p>
      </div>

      <!-- ═══ Block 'embedding' — reveals embedding neurons ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('embedding')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('embedding') }"
      >
        <p>
          Between input and output lies the embedding layer with
          <katex-element expression="m" /> neurons. In many autoencoders,
          <katex-element expression="m < n" />, forcing the model to compress the input
          into a lower-dimensional latent representation before reconstructing it.
        </p>
      </div>

      <!-- ═══ Block 'encoder' — reveals encoder connections (embedding panel not yet shown) ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('encoder')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('encoder') }"
      >
        <p>
          <strong>Encoder.</strong> The encoder computes the embedding
          <katex-element expression="y" /> as a linear combination of feature direction vectors
          <katex-element expression="w_i" />, weighted by the feature activations
          <katex-element expression="x_i" />:
        </p>

        <katex-element :display-mode="true" expression="y = Wx" />

        <p>
          where <katex-element expression="W \in \mathbb{R}^{m \times n}" /> is the weight matrix
          whose columns <katex-element expression="w_1, \ldots, w_n" /> are the learned feature
          direction vectors in embedding space.
        </p>
      </div>

      <!-- ═══ Block 'embedding-viz' — reveals embedding space panel, interaction tasks ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('embedding-viz')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('embedding-viz') }"
      >
        <p>
          The three feature direction vectors <katex-element expression="w_1, w_2, w_3" /> can be
          visualized directly in the 2D embedding space below. The current embedding
          <katex-element expression="y = Wx" /> — a linear combination of these vectors weighted
          by the input feature activations — is shown as a purple dot.
        </p>

        <TaskListDisplay :task-list="embeddingVizTaskList" />
      </div>

      <!-- ═══ Block 'weights-view' — reveals weights panel ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('weights-view')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('weights-view') }"
      >
        <p>
          The current values of the trainable parameters — the weight matrix
          <katex-element expression="W" /> and bias vector <katex-element expression="b" />
          — can be inspected in the weights view below the visualization. Hover over any
          value in the weight matrix to see the corresponding connection highlighted in the
          architecture.
        </p>
      </div>

      <!-- ═══ Block 'decoder' — reveals decoder connections + bias/ReLU + output values ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('decoder')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('decoder') }"
      >
        <p>
          <strong>Decoder.</strong> The decoder projects the embedding
          <katex-element expression="y" /> onto each feature direction — measuring how much
          <katex-element expression="y" /> aligns with each <katex-element expression="w_i" />
          — and applies a bias and ReLU nonlinearity:
        </p>

        <katex-element :display-mode="true" expression="\hat{x} = \text{ReLU}(W^T y + b)" />

        <p>
          where <katex-element expression="b \in \mathbb{R}^n" /> is a learned bias vector.
          The transpose <katex-element expression="W^T" /> computes the dot product of
          <katex-element expression="y" /> with every feature direction at once: the
          <katex-element expression="i" />-th entry of <katex-element expression="W^T y" /> is
          <katex-element expression="w_i \cdot y" />.
        </p>
      </div>

      <p>
        <strong>Full forward pass.</strong> Substituting
        <katex-element expression="y = Wx" />:
      </p>

      <katex-element :display-mode="true" expression="\hat{x} = \text{ReLU}(W^T W x + b)" />

      <p>
        The Gram matrix <katex-element expression="W^T W" /> reappears: its off-diagonal
        entries determine how much cross-talk (interference) occurs between features during
        reconstruction. If <katex-element expression="W^T W = I" />, recovery would be exact
        (up to the bias and ReLU). The model's task during training is to find feature
        directions that balance reconstruction accuracy against the unavoidable interference
        when <katex-element expression="m < n" />.
      </p>

      <!-- ═══ Block 'tied-weights' — no new reveal, just text ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('tied-weights')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('tied-weights') }"
      >
        <p>
          <strong>Why tied weights?</strong> Using <katex-element expression="W^T" /> as the
          decoder is directly motivated by the geometry of orthonormal bases. In the ideal case
          where the columns of <katex-element expression="W" /> are orthonormal,
          <katex-element expression="W^T" /> is the exact inverse — encoding and decoding are
          perfectly symmetric. Even when orthonormality is not achievable (because there are more
          features than dimensions), the tied-weight structure provides a natural inductive bias
          toward this geometric ideal.
        </p>
      </div>

      <!-- ═══ Block 'bias-relu' — triggers continuous bias/ReLU pulse ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('bias-relu')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('bias-relu') }"
      >
        <p>
          <strong>Bias and ReLU.</strong> The decoder includes a learned bias
          <katex-element expression="b" /> and a ReLU activation. Their significance will become
          clear in the experiments. In brief, they allow the model to compensate for interference
          when features must share dimensions.
        </p>
      </div>

      <h3>Synthetic Training Data</h3>

      <!-- ═══ Block 'data' — reveals half-normal backdrop + resample ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('data')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('data') }"
      >
        <p>
          We generate synthetic feature vectors
          <katex-element expression="x \in \mathbb{R}^n" /> directly in feature space rather
          than training on real text, where token statistics, linguistic structure, and optimizer
          dynamics would all be entangled. Each coordinate of
          <katex-element expression="x" /> cleanly represents one disentangled feature, isolating
          the geometric compression problem from all other aspects of learning.
        </p>

        <p>
          Feature activations are sampled from the <strong>half-normal distribution</strong>
          <katex-element expression="|z|" /> where
          <katex-element expression="z \sim \mathcal{N}(0, 1)" />:
        </p>

        <katex-element :display-mode="true" expression="x_i = |\mathcal{N}(0, 1)|" />

        <p>
          This yields strictly non-negative activations, reflecting that we model features in
          terms of <strong>presence and strength</strong> rather than polarity. A feature is
          either absent (<katex-element expression="x_i = 0" />) or present with some positive
          activation. Concepts that might seem to require negative values — such as "negative
          sentiment" — are instead represented by their own distinct feature (e.g., a separate
          <katex-element expression="f_{\text{negative\_sentiment}}" />) rather than as a
          negative activation of a "positive sentiment" feature.
        </p>

        <TaskListDisplay :task-list="dataTaskList" />
      </div>

      <h3>Training Objective</h3>

      <!-- ═══ Block 'training' — reveals training tab + stats + weighted loss ═══ -->
      <div
          :ref="(el) => paragraphRefs[blockIdx('training')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('training') }"
      >
        <p>
          In a large language model, internal representations must support a very large number
          of potentially useful features learned from vast amounts of training data. These
          features are not equally important: some encode information that is much more
          consequential for producing the correct next-token prediction than others. In practice,
          this relative importance is not manually specified, but emerges implicitly during
          training from how strongly different features affect predictive performance.
        </p>

        <p>
          To emulate this in the toy model, the autoencoder is trained to minimize the
          reconstruction error between <katex-element expression="x" /> and
          <katex-element expression="\hat{x}" />, while weighting some input features more
          heavily than others. We therefore introduce <strong>feature importance</strong>
          weights <katex-element expression="I_i" />, which scale each feature's contribution
          to the loss:
        </p>

        <katex-element :display-mode="true" expression="\mathcal{L}(x, \hat{x}) = \sum_{i=1}^{n} I_i \, (x_i - \hat{x}_i)^2" />

        <p>
          The importance weights follow an exponential decay schedule controlled by a parameter
          <katex-element expression="\alpha \in (0, 1]" />:
        </p>

        <katex-element :display-mode="true" expression="I_i = \alpha^{i-1}" />

        <p>
          Feature <katex-element expression="f_1" /> has importance
          <katex-element expression="I_1 = \alpha^0 = 1" /> (highest); each subsequent feature
          matters less by a factor of <katex-element expression="\alpha" />. This creates
          unequal pressure during training: when embedding capacity is limited, the model is
          incentivized to preserve more important features more faithfully, while tolerating
          larger reconstruction errors on less important ones.
        </p>

        <p>
          Training proceeds by sampling batches of synthetic feature vectors, computing the
          weighted loss, and updating <katex-element expression="W" /> and
          <katex-element expression="b" /> via gradient-based optimization (Adam).
        </p>

        <TaskListDisplay :task-list="trainingObjectiveTaskList" />
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <!-- Section 4: Experiments                                                 -->
      <!-- ═══════════════════════════════════════════════════════════════════════ -->

      <h2 class="section-heading" style="margin-top: 2.5rem;">Experiments</h2>

      <!-- ═══ Experiments intro (no text-block — not activatable) ═══ -->

      <p>
        With the autoencoder defined, we can now put it to the test. The interactive model
        in the side panel lets you train the autoencoder and observe its learned representations
        in real time. The following experiments build progressively from a trivial setting to
        one that reveals a striking emergent pattern.
      </p>

      <!-- ═══ Block 'exp1': Experiment 1 — Two features in two dimensions ═══ -->
      <h3>Experiment 1: Two Features in Two Dimensions</h3>
      <div
          :ref="(el) => paragraphRefs[blockIdx('exp1')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('exp1') }"
      >

        <p>
          We begin with the simplest case: two features embedded in two dimensions. Since the
          embedding space has exactly as many dimensions as there are features, the model should
          be able to represent both without compromise.
        </p>

        <TaskListDisplay :task-list="exp1TaskList">
          <template #insight>
            The model converges to an orthonormal basis — two perpendicular, unit-length
            feature directions. Reconstruction loss drops to zero. This is the ideal case
            from the geometric foundations: with enough dimensions, the model represents
            every feature without interference.
          </template>
        </TaskListDisplay>
      </div>

      <!-- ═══ Block 'exp2': Experiment 2 — More features than dimensions ═══ -->
      <h3>Experiment 2: More Features Than Dimensions</h3>
      <div
          :ref="(el) => paragraphRefs[blockIdx('exp2')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('exp2') }"
      >

        <p>
          We now have four features to embed in only two dimensions — more features than the
          embedding space can accommodate orthogonally. But recall that our feature activations
          are strictly non-negative: a feature is either absent or present with positive
          strength. This means the negative direction along each embedding axis is never reached
          by any single feature. Could the model place additional features along these unused
          opposite directions, effectively doubling its capacity?
        </p>

        <TaskListDisplay :task-list="exp2TaskList">
          <template #insight>
            The model does <em>not</em> use opposite directions. Instead, it represents only the
            two most important features (<katex-element expression="f_1" /> and
            <katex-element expression="f_2" />) as an orthonormal basis and ignores the rest —
            their feature direction vectors collapse to near-zero length. Why not use the opposite
            directions? Because all features are always active: placing two features in opposite
            directions would be catastrophic, as their embeddings would partially cancel whenever
            both are active — which is always. For the ignored features, the model sets the bias
            to approximately the mean of the half-normal distribution. Since these features are
            always active with expected value <katex-element expression="\mu" />, statically
            outputting <katex-element expression="\mu" /> minimizes the average squared error
            without dedicating any embedding capacity.
          </template>
        </TaskListDisplay>
      </div>

      <!-- ═══ Block 'interlude': Feature sparsity ═══ -->
      <h3>Interlude: Feature Sparsity</h3>
      <div
          :ref="(el) => paragraphRefs[blockIdx('interlude')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('interlude') }"
      >

        <p>
          In real neural networks, not all features are active at the same time. Consider the
          vast space of possible features: <em>is_plural</em>, <em>is_question</em>,
          <em>refers_to_Einstein</em>, <em>is_about_cooking</em>. For any given input, only a
          small fraction of all potentially useful features will be relevant. Most features are
          inactive most of the time — this property is called <strong>sparsity</strong>.
        </p>

        <p>
          We model sparsity by introducing a parameter
          <katex-element expression="S \in [0, 1)" /> that controls the probability that each
          feature is <strong>zero</strong> (inactive) in a given training sample:
        </p>

        <katex-element :display-mode="true" expression="x_i = \begin{cases} 0 &amp; \text{with probability } S \\ |\mathcal{N}(0,1)| &amp; \text{otherwise} \end{cases}" />

        <p>
          When <katex-element expression="S = 0" />, every feature is always active (the dense
          case from above). As <katex-element expression="S" /> increases, features become
          increasingly sparse — each one is active only a fraction of the time. Crucially, since
          feature activations are sampled independently, any two specific features are
          simultaneously active with probability <katex-element expression="(1-S)^2" />, which
          shrinks rapidly.
        </p>

        <TaskListDisplay :task-list="interludeTaskList" />
      </div>

      <!-- ═══ Block 'exp3': Experiment 3 — Sparsity changes the game ═══ -->
      <h3>Experiment 3: Sparsity Changes the Game</h3>
      <div
          :ref="(el) => paragraphRefs[blockIdx('exp3')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('exp3') }"
      >

        <p>
          With sparsity, the same bottleneck — four features in two dimensions — may have a
          different solution. Now that features are rarely active at the same time, perhaps the
          opposite-direction strategy from before becomes viable.
        </p>

        <TaskListDisplay :task-list="exp3TaskList">
          <template #insight>
            <p>
              With sparse features, the model now represents all four features, placing them in
              roughly opposite pairs. Features sharing an axis point in opposite directions: when
              only one is active, the decoder recovers it well. When both are active
              simultaneously, their contributions cancel in embedding space, causing significant
              error — but with <katex-element expression="S = 0.1" />, this co-activation
              happens only about 1% of the time. The model accepts rare large errors in exchange
              for representing more features.
            </p>
            <p>
              Note that this is not yet breaking any geometric limit: the two pairs of feature
              directions remain orthogonal to each other. The model has simply exploited the
              non-negativity of feature activations combined with sparsity to use directions that
              were previously unavailable — doubling its effective capacity.
            </p>
          </template>
        </TaskListDisplay>
      </div>

      <!-- ═══ Block 'exp4': Experiment 4 — Beyond doubling ═══ -->
      <h3>Experiment 4: Beyond Doubling</h3>
      <div
          :ref="(el) => paragraphRefs[blockIdx('exp4')] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('exp4') }"
      >

        <p>
          Exploiting opposite directions doubled the capacity from two to four features. Can
          the model go further — beyond what opposite directions alone provide? We now have five
          features in two dimensions.
        </p>

        <TaskListDisplay :task-list="exp4TaskList">
          <template #insight>
            The model distributes five feature directions evenly around the unit circle, spaced
            at approximately 72°. Unlike the opposite-direction trick, where orthogonal pairs
            coexisted without mutual interference, <strong>every pair of features now
            interferes</strong> — no two directions are orthogonal. The model has accepted
            genuine cross-talk between all features in exchange for representing more of them.
            By spreading the directions as uniformly as possible, it minimizes the worst-case
            interference, and sparsity keeps the expected cost low.
          </template>
        </TaskListDisplay>
      </div>

      <p>
        This is qualitatively different from the previous experiment. The model is no longer
        just exploiting unused directions — it is actively trading reconstruction accuracy for
        representational capacity, accepting controlled interference between every pair of
        features. This behavior has deep geometric roots, and the next section gives it a name.
      </p>
    </div>

    <!-- Visualization column (sticky) -->
    <div class="viz-column">
      <div ref="vizRef" class="viz-sticky">
        <AutoencoderVisualization/>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Layout only. Shared typography and interaction styles (section-heading,
 * text-column p, active-paragraph, viz-column, viz-sticky) live in BlogPost.vue.
 */
.ae-section {
  max-width: calc(var(--blog-prose-width) + var(--blog-column-gap) + var(--blog-viz-width));
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: var(--blog-prose-width) var(--blog-viz-width);
  column-gap: var(--blog-column-gap);
  align-items: start;
}
</style>
