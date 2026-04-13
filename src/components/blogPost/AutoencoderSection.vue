<script setup lang="ts">
import { ref, provide, onUnmounted } from 'vue'
import { createAutoencoderService, INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX } from '../../services/AutoencoderService'
import { createSelectionService } from '../../services/SelectionService'
import { useScrollActiveParagraph } from './useScrollActiveParagraph'
import { useParagraphRanges, type ParagraphRange } from './useParagraphRanges'
import { type AeConstraintSpec, AE_VIEW_CONSTRAINTS_KEY, deriveConstraints } from './aeStepTypes'
import { TaskList, TaskEventBus, TASK_EVENT_BUS_KEY } from './taskSystem'
import { createOvercompleteTaskSpecs } from './tasks/overcompleteTasks'
import AutoencoderVisualization from './AutoencoderVisualization.vue'
import TaskListDisplay from './TaskListDisplay.vue'

// ─── Service instances (owned here, provided to children) ─────────────────────

const svc = createAutoencoderService()
provide('autoencoderService', svc)

const selSvc = createSelectionService()
provide('selectionService', selSvc)

const eventBus = new TaskEventBus()
provide(TASK_EVENT_BUS_KEY, eventBus)

onUnmounted(() => {
  svc.stopTraining()
  taskList.stopListening()
  eventBus.clear()
})

// ─── Reactive constraint spec (mutated inside apply()) ────────────────────────

const constraintSpec = ref<AeConstraintSpec | undefined>(undefined)
const constraints = deriveConstraints(constraintSpec, INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX)
provide(AE_VIEW_CONSTRAINTS_KEY, constraints)

// ─── Task list ────────────────────────────────────────────────────────────────

const taskList = new TaskList(createOvercompleteTaskSpecs())
taskList.startListening({ svc, events: eventBus })

// ─── Paragraph ranges ─────────────────────────────────────────────────────────

const ranges: ParagraphRange[] = [
  {
    from: 0, to: 1,
    apply: () => {
      constraintSpec.value = { inputDim: 2, embeddingDim: 2, hiddenControls: ['sparsity', 'advanced'] }
      if (svc.config.inputDim !== 2) svc.setInputDim(2)
      if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
      svc.updateConfig({ sparsity: 0.2, learningRate: 0.015, batchSize: 64 })
    },
  },
  {
    from: 2, to: 4,
    apply: () => {
      constraintSpec.value = { inputDim: { min: 2, max: 4 }, embeddingDim: 2 }
      if (svc.config.embeddingDim !== 2) svc.setEmbeddingDim(2)
    },
  },
]

const paragraphRefs = ref<(HTMLElement | null)[]>([])
const { activeParagraphIndex } = useScrollActiveParagraph(paragraphRefs)
useParagraphRanges(ranges, activeParagraphIndex)
</script>
<template>
  <!-- Single-root section: owns its own CSS grid, centered at wider width -->
  <div class="ae-section post-section">
    <!-- Text column -->
    <div class="text-column">
      <h2 class="section-heading">Autoencoder</h2>

      <p
          :ref="(el) => paragraphRefs[0] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 0 }"
      >
        The clean encode/decode symmetry of an orthonormal basis — embed with
        <em>W</em>, recover with <em>Wᵀ</em> — is the geometric intuition behind
        the architecture of our toy autoencoder. In this section, we define the
        model formally.
      </p>

      <p
          :ref="(el) => paragraphRefs[1] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 1 }"
      >
        The encoder computes the embedding <em>h</em> as a linear combination of
        feature direction vectors <em>wᵢ</em>, weighted by the feature activations
        <em>xᵢ</em>: <em>h = Wx</em>. The decoder projects the embedding onto each
        feature direction and applies a bias and ReLU nonlinearity:
        <em>x̂ = ReLU(Wᵀh + b)</em>.
      </p>

      <div
          :ref="(el) => paragraphRefs[2] = el as HTMLElement"
          class="paragraph"
          :class="{ 'active-paragraph': activeParagraphIndex === 2 }"
      >
        <p>
          Using <em>Wᵀ</em> as the decoder is directly motivated by the geometry of
          orthonormal bases. In the ideal case where the columns of <em>W</em> are
          orthonormal, <em>Wᵀ</em> is the exact inverse — encoding and decoding are
          perfectly symmetric.
        </p>
        <TaskListDisplay :task-list="taskList">
          <template #insight>
              With more features than embedding dimensions, the autoencoder must
              compromise — feature vectors can no longer all be orthogonal.
              This is the onset of <strong>superposition</strong>.
          </template>
        </TaskListDisplay>
      </div>

      <p
          :ref="(el) => paragraphRefs[3] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 3 }"
      >
        We generate synthetic feature vectors directly in feature space rather
        than training on real text. Each coordinate cleanly represents one
        disentangled feature, isolating the geometric compression problem from
        all other aspects of learning.
      </p>

      <p
          :ref="(el) => paragraphRefs[4] = el as HTMLElement"
          :class="{ 'active-paragraph': activeParagraphIndex === 4 }"
      >
        The loss function weights each feature by an importance factor
        <em>Iᵢ = αⁱ</em>, where <em>α ∈ (0, 1)</em> controls the decay.
        This creates a natural hierarchy: the model must prioritise the
        first features and can afford to sacrifice later ones when dimensions
        are limited.
      </p>
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
