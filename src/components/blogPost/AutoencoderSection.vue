<script setup lang="ts">
import { ref, provide, onUnmounted } from 'vue'
import { createAutoencoderService, INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX } from '../../services/AutoencoderService'
import type { AeSnapshot } from '../../services/AutoencoderService'
import { createSelectionService } from '../../services/SelectionService'
import { createVizService, VIZ_SERVICE_KEY } from '../../services/VizService'
import { useScrollActiveBlock } from './useScrollActiveParagraph'
import { useParagraphRanges, type ParagraphRange } from './useParagraphRanges'
import { type AeConstraintSpec, AE_VIEW_CONSTRAINTS_KEY, deriveConstraints } from './aeStepTypes'
import { TaskList, TaskEventBus, TASK_EVENT_BUS_KEY } from './taskSystem'
import { createExp1TaskSpecs } from './tasks/exp1Tasks'
import { createExp2TaskSpecs } from './tasks/exp2Tasks'
import { createInterludeTaskSpecs } from './tasks/interludeTasks'
import { createExp3TaskSpecs } from './tasks/exp3Tasks'
import { createExp4TaskSpecs } from './tasks/exp4Tasks'
import AutoencoderVisualization from './AutoencoderVisualization.vue'
import TaskListDisplay from './TaskListDisplay.vue'

// ─── Service instances (owned here, provided to children) ─────────────────────

const svc = createAutoencoderService()
provide('autoencoderService', svc)

const selSvc = createSelectionService()
provide('selectionService', selSvc)

const vizSvc = createVizService()
provide(VIZ_SERVICE_KEY, vizSvc)

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
  eventBus.clear()
})

// ─── Reactive constraint spec (mutated inside apply()) ────────────────────────

const constraintSpec = ref<AeConstraintSpec | undefined>(undefined)
const constraints = deriveConstraints(constraintSpec, INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX)
provide(AE_VIEW_CONSTRAINTS_KEY, constraints)

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

// ─── Paragraph ranges with save/restore ───────────────────────────────────────

const rangeStates: (AeSnapshot | null)[] = [null, null, null, null]

const ranges: ParagraphRange[] = [
  {
    from: 0, to: 6,
    apply: () => {
      constraintSpec.value = { inputDim: 2, embeddingDim: 2, hiddenControls: ['sparsity'] }
      if (rangeStates[0]) {
        svc.restoreState(rangeStates[0])
      } else {
        if (svc.config.inputDim !== 2) svc.setInputDim(2)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
        if (svc.config.sparsity !== 0) svc.updateConfig({ sparsity: 0 })
      }
    },
    leave: () => { rangeStates[0] = svc.saveState() },
  },
  {
    from: 7, to: 7,
    apply: () => {
      constraintSpec.value = { inputDim: 4, embeddingDim: 2, hiddenControls: ['sparsity'] }
      if (rangeStates[1]) {
        svc.restoreState(rangeStates[1])
      } else {
        if (svc.config.inputDim !== 4) svc.setInputDim(4)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
        if (svc.config.sparsity !== 0) svc.updateConfig({ sparsity: 0 })
      }
    },
    leave: () => { rangeStates[1] = svc.saveState() },
  },
  {
    from: 8, to: 9,
    apply: () => {
      constraintSpec.value = { inputDim: 4, embeddingDim: 2 }
      if (rangeStates[2]) {
        svc.restoreState(rangeStates[2])
      } else {
        if (svc.config.inputDim !== 4) svc.setInputDim(4)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
      }
    },
    leave: () => { rangeStates[2] = svc.saveState() },
  },
  {
    from: 10, to: 10,
    apply: () => {
      constraintSpec.value = { inputDim: 5, embeddingDim: 2 }
      if (rangeStates[3]) {
        svc.restoreState(rangeStates[3])
      } else {
        if (svc.config.inputDim !== 5) svc.setInputDim(5)
        if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
      }
    },
    leave: () => { rangeStates[3] = svc.saveState() },
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
    <div class="text-column">
      <h2 class="section-heading">The Toy Autoencoder</h2>

      <!-- ═══ Block 0: Opening + Architecture + Encoder ═══ -->
      <div
          :ref="(el) => paragraphRefs[0] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 0 }"
      >
        <p>
          The clean encode/decode symmetry of an orthonormal basis — embed with
          <katex-element expression="W" />, recover with <katex-element expression="W^T" />
          — is the geometric intuition behind the architecture of our toy autoencoder.
          In this section, we define the model formally.
        </p>

        <h3>Architecture</h3>

        <p>
          The autoencoder uses a linear encoder and a nonlinear decoder with tied weights,
          mapping an <katex-element expression="n" />-dimensional feature vector through an
          <katex-element expression="m" />-dimensional embedding and back:
        </p>

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

      <!-- ═══ Block 1: Decoder + Forward pass + Gram matrix ═══ -->
      <div
          :ref="(el) => paragraphRefs[1] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 1 }"
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
      </div>

      <!-- ═══ Block 2: Tied weights + Bias/ReLU ═══ -->
      <div
          :ref="(el) => paragraphRefs[2] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 2 }"
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

        <p>
          <strong>Bias and ReLU.</strong> The decoder includes a learned bias
          <katex-element expression="b" /> and a ReLU activation. Their significance will become
          clear in the experiments. In brief, they allow the model to compensate for interference
          when features must share dimensions.
        </p>
      </div>

      <!-- ═══ Block 3: Synthetic training data ═══ -->
      <div
          :ref="(el) => paragraphRefs[3] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 3 }"
      >
        <h3>Synthetic Training Data</h3>

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
      </div>

      <!-- ═══ Block 4: Training objective ═══ -->
      <div
          :ref="(el) => paragraphRefs[4] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 4 }"
      >
        <h3>Training Objective</h3>

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
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <!-- Section 4: Experiments                                                 -->
      <!-- ═══════════════════════════════════════════════════════════════════════ -->

      <h2 class="section-heading" style="margin-top: 2.5rem;">Experiments</h2>

      <!-- ═══ Block 5: Experiments intro ═══ -->
      <div
          :ref="(el) => paragraphRefs[5] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 5 }"
      >
        <p>
          With the autoencoder defined, we can now put it to the test. The interactive model
          in the side panel lets you train the autoencoder and observe its learned representations
          in real time. The following experiments build progressively from a trivial setting to
          one that reveals a striking emergent pattern.
        </p>
      </div>

      <!-- ═══ Block 6: Experiment 1 — Two features in two dimensions ═══ -->
      <div
          :ref="(el) => paragraphRefs[6] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 6 }"
      >
        <h3>Experiment 1: Two Features in Two Dimensions</h3>

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

      <!-- ═══ Block 7: Experiment 2 — More features than dimensions ═══ -->
      <div
          :ref="(el) => paragraphRefs[7] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 7 }"
      >
        <h3>Experiment 2: More Features Than Dimensions</h3>

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

      <!-- ═══ Block 8: Interlude — Feature sparsity ═══ -->
      <div
          :ref="(el) => paragraphRefs[8] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 8 }"
      >
        <h3>Interlude: Feature Sparsity</h3>

        <p>
          In real neural networks, not all features are active at the same time. Consider the
          vast space of possible features: <em>is_plural</em>, <em>is_question</em>,
          <em>refers_to_Einstein</em>, <em>is_about_cooking</em>. For any given input, only a
          small fraction of all potentially useful features will be relevant. Most features are
          inactive most of the time — this property is called <strong>sparsity</strong>.
        </p>

        <p>
          We model sparsity by introducing a parameter
          <katex-element expression="S \in (0, 1]" /> that controls the probability that each
          feature is active in a given training sample:
        </p>

        <katex-element :display-mode="true" expression="x_i = \begin{cases} |\mathcal{N}(0,1)| &amp; \text{with probability } S \\ 0 &amp; \text{otherwise} \end{cases}" />

        <p>
          When <katex-element expression="S = 1.0" />, every feature is always active (the dense
          case from above). As <katex-element expression="S" /> decreases, features become
          increasingly sparse — each one is active only a fraction of the time. Crucially, since
          feature activations are sampled independently, any two specific features are
          simultaneously active with probability <katex-element expression="S^2" />, which
          shrinks rapidly.
        </p>

        <TaskListDisplay :task-list="interludeTaskList" />
      </div>

      <!-- ═══ Block 9: Experiment 3 — Sparsity changes the game ═══ -->
      <div
          :ref="(el) => paragraphRefs[9] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 9 }"
      >
        <h3>Experiment 3: Sparsity Changes the Game</h3>

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

      <!-- ═══ Block 10: Experiment 4 — Beyond doubling ═══ -->
      <div
          :ref="(el) => paragraphRefs[10] = el as HTMLElement"
          class="text-block"
          :class="{ 'active-block': activeBlockIndex === 10 }"
      >
        <h3>Experiment 4: Beyond Doubling</h3>

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

        <p>
          This is qualitatively different from the previous experiment. The model is no longer
          just exploiting unused directions — it is actively trading reconstruction accuracy for
          representational capacity, accepting controlled interference between every pair of
          features. This behavior has deep geometric roots, and the next section gives it a name.
        </p>
      </div>
    </div>

    <!-- Visualization column (sticky) -->
    <div class="viz-column">
      <div class="viz-sticky">
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
  max-width: calc(1400px - 4rem);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr minmax(512px, 600px);
  column-gap: 3rem;
  align-items: start;
}
</style>
