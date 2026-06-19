<script setup lang="ts">
import { ref, watch, provide, onUnmounted } from 'vue'
import { createBasesService, type MappingStage, type CoordinateStage } from '../../services/BasesService'
import { useScrollActiveBlock } from './useScrollActiveParagraph'
import { useParagraphRanges, type ParagraphRange } from './useParagraphRanges'
import { TaskList, TaskEventBus, TASK_EVENT_BUS_KEY } from './taskSystem'
import BasesVisualization from './BasesVisualization.vue'
import VizSection from './VizSection.vue'
import TaskListDisplay from './TaskListDisplay.vue'
import {k} from "./tasks/aeTaskHelpers.ts";

const svc = createBasesService()
provide('basesService', svc)

// ─── Task event bus (provided to child viz) ───────────────────────────────────

const eventBus = new TaskEventBus()
provide(TASK_EVENT_BUS_KEY, eventBus)

// Task: drag the embedding dot along w₁
let hasDragged = false
const dragTaskList = new TaskList([{
    id: 'drag-embedding',
    label: `Drag the embedding ${k('y')} (the purple dot) along the direction of ${k('w_2')}. Observe projections on both ${k('w_1')} and ${k('w_2')}`,
  setup: () => ({
    events: ['drag-embedding'] as string[],
    onEvent: () => { hasDragged = true },
    check: () => hasDragged,
  }),
}])
dragTaskList.startListening({ events: eventBus, services: {} })

onUnmounted(() => {
  dragTaskList.stopListening()
  eventBus.clear()
})

// ─── Named text blocks ────────────────────────────────────────────────────────

const BLOCK_IDS = [
  'feature-space',
  'both-spaces',
  'encoding',
  'decoding',
  'gram-matrix',
  '2d-intro',
  'arbitrary-vectors',
  'arbitrary-projection',
  'orthogonal-basis',
  'orthonormal-basis',
] as const

type BlockId = typeof BLOCK_IDS[number]

function blockIdx(id: BlockId): number { return BLOCK_IDS.indexOf(id) }

// ─── Scroll tracking ─────────────────────────────────────────────────────────

const blockRefs = ref<(HTMLElement | null)[]>([])
const { activeBlockIndex, scrollToBlock } = useScrollActiveBlock(blockRefs)

watch(activeBlockIndex, (idx) => {
  if (idx >= 0) svc.setActiveParagraph(idx)
})

// ─── Block → mapping-stage mapping ───────────────────────────────────────────

const blockMappingStage: Record<string, MappingStage> = {
  'feature-space': 'feature-space',
  'both-spaces':   'both-spaces',
  'encoding':      'encoding',
  'decoding':      'decoding',
  'gram-matrix':   'gram-matrix',
}

const blockCoordinateStage: Record<string, CoordinateStage> = {
  'arbitrary-vectors':   'arbitrary',
  'arbitrary-projection': 'arbitrary',
  'orthogonal-basis': 'orthogonal',
  'orthonormal-basis': 'orthonormal',
}

// Sub-stage within each coordinate stage (e.g. arbitrary has 0=vectors, 1=projection)
const blockCoordinateSubStage: Record<string, number> = {
  'arbitrary-vectors':    0,
  'arbitrary-projection': 1,
  'orthogonal-basis':     0,
  'orthonormal-basis':    0,
}

const ranges: ParagraphRange[] = [
  {
    from: blockIdx('feature-space'),
    to: blockIdx('gram-matrix'),
    apply: (activeIndex: number) => {
      const id = BLOCK_IDS[activeIndex] as BlockId | undefined
      svc.mappingStage.value = (id && blockMappingStage[id]) ?? 'feature-space'
      svc.activeViz.value = 'mapping'
    },
    leave: () => {
      svc.mappingStage.value = 'none'
    },
  },
  {
    from: blockIdx('2d-intro'),
    to: blockIdx('orthonormal-basis'),
    apply: (activeIndex: number) => {
      svc.activeViz.value = 'coordinate'
      const id = BLOCK_IDS[activeIndex] as BlockId | undefined
      if (id && blockCoordinateStage[id]) {
        svc.coordinateStage.value = blockCoordinateStage[id]
      }
      svc.coordinateSubStage.value = (id && blockCoordinateSubStage[id]) ?? 0
      dragTaskList.setActive(id === 'arbitrary-projection')
    },
    leave: () => {
      svc.activeViz.value = 'mapping'
      dragTaskList.setActive(false)
    },
  },
]

useParagraphRanges(ranges, activeBlockIndex)
</script>

<template>
  <VizSection heading="Geometric Foundations: Bases and Feature Representation">
    <template #heading>
      <h2 class="section-heading full-span">Geometric Foundations: Bases and Feature Representation</h2>
    </template>
    <template #text>
    <!-- Text column -->
     <div class="text-column" data-scroll-dir="down">

      <!-- Block 'feature-space': Intro + feature space concept -->
      <p>
        We want to understand how features are represented inside an embedding space — in
        particular, how they are embedded and how they can be recovered. This section develops
        the mathematical intuition that directly motivates the architecture of the toy
        autoencoder.
      </p>
      <p>
        Suppose a model needs to represent
        <katex-element expression="n"/>
        distinct features
        inside an embedding space with fewer dimensions. In the original feature space, each
        feature occupies its own coordinate axis — reading off how strongly a feature is present
        is as simple as looking at the corresponding coordinate. The challenge arises when these
        features must be mapped into a lower-dimensional embedding space, where each feature is
        no longer guaranteed its own axis and must instead be represented as a learned direction.
      </p>
      <div
          :ref="(el) => blockRefs[blockIdx('feature-space')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('feature-space') }"
      >
        <p>Formally, a <strong>feature vector</strong> <katex-element expression="x = (x_1, \ldots, x_n)^T"/>
          lives in <strong>feature
            space</strong> <katex-element expression="F = \mathbb{R}^n"/>
          , where each coordinate
          <katex-element expression="x_i"/>
          represents the activation strength of feature
          <katex-element expression="f_i"/>
          .</p>
      </div>

      <!-- Block 'both-spaces': Formal definitions of F, H, W -->
      <div
          :ref="(el) => blockRefs[blockIdx('both-spaces')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('both-spaces') }"
      >
        <p>
           The model maps
          <katex-element expression="x"/>
          into an <strong>embedding space</strong> <katex-element expression="H = \mathbb{R}^m"/>
          , typically with
          <katex-element expression="m < n"/>
          . Inside this space, each feature
          <katex-element expression="f_i"/>
          is represented by a learned <strong>feature direction
          vector</strong> <katex-element expression="w_i \in \mathbb{R}^m"/>
          . These <katex-element expression="n"/>
          vectors form the columns of the <strong>weight
          matrix</strong> <katex-element expression="W = [w_1 \;\; \cdots \;\; w_n] \in \mathbb{R}^{m \times n}"/>
          .
        </p>
      </div>

      <!-- Block 'encoding': Embedding with W -->
      <div
          :ref="(el) => blockRefs[blockIdx('encoding')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('encoding') }"
      >
        <p>
          <strong>Embedding with
            <katex-element expression="W"/>
          </strong> computes a linear
          combination of the feature direction vectors, weighted by the feature activations:
        </p>
        <katex-element :display-mode="true"
                       expression="y = Wx = \sum_{i=1}^{n} x_i \, w_i"/>
        <p>
          Each activation
          <katex-element expression="x_i"/>
          controls how much its direction
          <katex-element expression="w_i"/>
          contributes to the embedded representation
          <katex-element expression="y \in \mathbb{R}^m"/>
          . This is the key geometric picture:
          the feature activations are the coefficients, and the feature direction vectors are the
          directions we combine.
        </p>
      </div>

      <!-- Block 'decoding': Recovery with W^T + substitution -->
      <div
          :ref="(el) => blockRefs[blockIdx('decoding')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('decoding') }"
      >
        <p>
          <strong>Recovery with
            <katex-element expression="W^T"/>
          </strong> reverses this
          process. To recover feature activations from
          <katex-element expression="y"/>
          , we
          measure how aligned
          <katex-element expression="y"/>
          is with each feature direction
          by computing the dot product
          <katex-element expression="w_i \cdot y"/>
          . The
          transpose
          <katex-element expression="W^T"/>
          computes all of these projections at
          once — the
          <katex-element expression="i"/>
          -th entry of
          <katex-element expression="W^T y"/>
          is precisely
          <katex-element expression="w_i \cdot y"/>
          :
        </p>
        <katex-element :display-mode="true"
                       expression="W^T y = \begin{pmatrix} w_1 \cdot y \\ w_2 \cdot y \\ \vdots \\ w_n \cdot y \end{pmatrix}"/>
        <p>
          Whether this actually recovers the true feature activations depends on the geometry
          of the feature direction vectors. Substituting
          <katex-element expression="y = Wx"/>
          :
        </p>
        <katex-element :display-mode="true"
                       expression="W^T y = W^T W \, x"/>
      </div>

      <!-- Block 'gram-matrix': Gram matrix and identity condition -->
      <div
          :ref="(el) => blockRefs[blockIdx('gram-matrix')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('gram-matrix') }"
      >
        <p>
          The matrix
          <katex-element expression="W^T W \in \mathbb{R}^{n \times n}"/>
          is the
          <strong>Gram matrix</strong> of the feature directions. Its entries
          <katex-element expression="(W^T W)_{ij} = w_i \cdot w_j"/>
          are the pairwise dot
          products. The <strong>diagonal entries</strong> <katex-element expression="w_i \cdot w_i = \|w_i\|^2"/>
          are the squared lengths of
          the feature directions. The <strong>off-diagonal entries</strong> <katex-element expression="w_i \cdot w_j"/>
          (
          <katex-element expression="i \neq j"/>
          ) quantify the <strong>cross-talk</strong>
          between features: when nonzero, projecting onto one feature direction picks up
          contributions from others — this is <strong>interference</strong>.
        </p>
        <p>
          If
          <katex-element expression="W^T W = I"/>
          (the identity matrix), then
          <katex-element expression="W^T y = x"/>
          exactly — perfect recovery with no
          interference and no scale distortion. The Gram matrix tells us precisely how far a
          given set of feature directions deviates from this ideal.
        </p>
      </div>

      <!-- ── The 2D Example ───────────────────────────────────── -->
      <h3>The 2D Example</h3>

      <div
          :ref="(el) => blockRefs[blockIdx('2d-intro')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('2d-intro') }"
      >
        <p>
          To build this intuition concretely, we walk through three progressively structured
          choices of feature directions in a simple 2D example: two features
          <katex-element expression="f_1"/>
          and
          <katex-element expression="f_2"/>
          , embedded into
          a 2-dimensional embedding space.
        </p>
      </div>

      <p>
        Since the feature space
        <katex-element expression="F"/>
        and embedding space
        <katex-element expression="H"/>
        have the same dimensionality, we could represent the
        features in the embedding space identically by choosing
        <katex-element expression="W"/>
        as the identity mapping. In that case, the feature directions would directly align with
        the coordinate axes of the embedding space too, making both embedding and recovery
        trivial. However, a learned model does not begin with such a clean construction. It
        adjusts its weights through iterative optimization to reduce loss and may arrive at many
        different valid representations. Additionally, this ideal choice only works as long as
        we have at least as many embedding dimensions as features. Once we try to fit more
        features into fewer dimensions, the clean one-feature-per-axis picture breaks down.
        So let's study what happens when the feature directions are chosen arbitrarily, and
        then see why orthogonal and orthonormal directions are such a special case.
      </p>

      <p>
        In the 2D-to-2D setup below, the two embedding vectors
        <katex-element expression="w_1, w_2"/>
        form a basis of the embedding space. Later, when
        we move to more features than embedding dimensions, the vectors
        <katex-element expression="w_i"/>
        are better understood as <strong>feature
        directions</strong> rather than a basis in the strict linear-algebra sense.
      </p>

      <!-- ── Arbitrary Basis ──────────────────────────────────── -->
      <h3>Arbitrary Basis</h3>

      <div
          :ref="(el) => blockRefs[blockIdx('arbitrary-vectors')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('arbitrary-vectors') }"
      >
      <p>
        Let us choose two arbitrary embedding vectors:
      </p>
      <katex-element :display-mode="true"
                     expression="w_1 = (1,2)^T, \quad w_2 = (2,1)^T"/>
      <p>
        These vectors are linearly independent, which is essential: if one were just a scalar
        multiple of the other, they would only span a line instead of the full 2D space. In
        that case, different feature combinations could map to the same embedding, making exact
        recovery impossible. In this square 2D example, these two vectors form a basis of the
        embedding space: any point in the 2D embedding space can be written as a linear
        combination of them.
      </p>

      <p>
        Embedding remains straightforward: we simply use the feature activations as coefficients
        of the embedding vectors:
      </p>
      <katex-element :display-mode="true"
                     expression="y = Wx = x_1 w_1 + x_2 w_2"/>
      <p>
        With our chosen feature directions, this becomes:
      </p>
      <katex-element :display-mode="true"
                     expression="W = \begin{bmatrix} 1 &amp; 2 \\ 2 &amp; 1 \end{bmatrix}, \qquad x = \begin{bmatrix} x_1 \\ x_2 \end{bmatrix}, \qquad y = Wx"/>
      </div>

      <div
          :ref="(el) => blockRefs[blockIdx('arbitrary-projection')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('arbitrary-projection') }"
      >
      <p>
        What is more interesting is the reverse direction: given the embedded vector
        <katex-element expression="y"/>
        , how do we recover the original feature activations
        <katex-element expression="x_1"/>
        and
        <katex-element expression="x_2"/>
        ?
      </p>

      <p>
        A natural first guess is to recover the feature activations by projecting back onto each
        feature direction separately — taking dot products with the same vectors
        <katex-element expression="w_i"/>
        . In matrix form, this is exactly what
        <katex-element expression="W^T"/>
        does: it computes all raw projections at once.
        Expanding a single dot product:
      </p>
      <katex-element :display-mode="true"
                     expression="y = x_1 w_1 + x_2 w_2"/>
      <p>
        Then trying to recover
        <katex-element expression="x_1"/>
        via the dot product with
        <katex-element expression="w_1"/>
        :
      </p>
      <katex-element :display-mode="true"
                     expression="w_1 \cdot y = x_1 (w_1 \cdot w_1) + x_2 (w_2 \cdot w_1) = x_1 \|w_1\|^2 + x_2 (w_2 \cdot w_1)"/>

      <p>
        However, as the feature vectors
        <katex-element expression="w_1"/>
        and
        <katex-element expression="w_2"/>
        are not orthogonal
        (
        <katex-element expression="w_2 \cdot w_1 \neq 0"/>
        ), the coordinates are coupled:
        reading out one feature by projection is contaminated by the other. The cross-term
        <katex-element expression="x_2 (w_2 \cdot w_1)"/>
        is the interference term: even
        though we are measuring along
        <katex-element expression="w_1"/>
        , feature activation
        <katex-element expression="x_2"/>
        still contributes to the projection. Geometrically,
        if we move
        <katex-element expression="y"/>
        only in the direction of
        <katex-element expression="w_1"/>
        , the raw projection onto
        <katex-element expression="w_2"/>
        changes as well. So even though feature activation
        <katex-element expression="x_2"/>
        has not changed, a naive projection-based readout
        would incorrectly suggest that it has.
      </p>

      <TaskListDisplay :taskList="dragTaskList" />

      <p>
        The Gram matrix
        <katex-element expression="W^T W"/>
        makes this interference structure
        explicit:
      </p>
      <katex-element :display-mode="true"
                     expression="W^T W = \begin{bmatrix} w_1 \cdot w_1 &amp; w_1 \cdot w_2 \\ w_2 \cdot w_1 &amp; w_2 \cdot w_2 \end{bmatrix} = \begin{bmatrix} 5 &amp; 4 \\ 4 &amp; 5 \end{bmatrix}"/>
      <p>
        The off-diagonal entries (
        <katex-element expression="= 4"/>
        ) are the source of the
        cross-talk. Because
        <katex-element expression="W^T W \neq I"/>
        , recovery via
        <katex-element expression="W^T"/>
        alone does not return the true activations.
      </p>

      <p>
        In this 2D-to-2D example, recovery is still possible despite the interference: we can
        recover the true feature activations by accounting for both basis vectors at once —
        solving the full linear system, or equivalently multiplying by
        <katex-element expression="W^{-1}"/>
        (
        <katex-element expression="x = W^{-1}y"/>
        ). This exact inversion is only possible
        when the feature directions form a square, invertible matrix — a condition that breaks
        down once we have more features than dimensions.
      </p>
      </div>

      <!-- ── Orthogonal Basis ─────────────────────────────────── -->
      <h3>Orthogonal Basis</h3>

      <div
          :ref="(el) => blockRefs[blockIdx('orthogonal-basis')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('orthogonal-basis') }"
      >
      <p>
        Let's fix this shortcoming by placing our feature direction vectors orthogonal to one
        another using
        <katex-element expression="w_1 = \begin{pmatrix} 1 \\ 2 \end{pmatrix}"/>
        and
        <katex-element expression="w_2 = \begin{pmatrix} 1.5 \\ -0.75 \end{pmatrix}"/>
        .
        These two vectors now form an orthogonal basis of the 2D embedding space.
      </p>

      <p>
        As the basis vectors
        <katex-element expression="w_i"/>
        are orthogonal, their dot
        product (by definition) becomes 0. Using this in the previous equation leaves us with:
      </p>
      <katex-element :display-mode="true"
                     expression="y \cdot w_i = x_i \|w_i\|^2"/>
      <p>
        And we can easily recover the individual feature activation values
        <katex-element expression="x_i"/>
        by dividing by the squared length of each basis
        vector:
      </p>
      <katex-element :display-mode="true"
                     expression="x_i = \frac{y \cdot w_i}{\|w_i\|^2}"/>

      <p>
        In matrix form,
        <katex-element expression="W^T"/>
        again computes all projections at
        once. Since the feature directions are orthogonal, the Gram matrix
        <katex-element expression="W^T W"/>
        becomes diagonal — the off-diagonal cross-talk
        terms vanish:
      </p>
      <katex-element :display-mode="true"
                     expression="W^T W = \begin{bmatrix} \|w_1\|^2 &amp; 0 \\ 0 &amp; \|w_2\|^2 \end{bmatrix} = \begin{bmatrix} 5 &amp; 0 \\ 0 &amp; 2.8125 \end{bmatrix}"/>
      <p>
        This gives us:
      </p>
      <katex-element :display-mode="true"
                     expression="W^T y = W^T W x = \begin{pmatrix} \|w_1\|^2 \, x_1 \\ \|w_2\|^2 \, x_2 \end{pmatrix}"/>
      <p>
        Projecting the embedding
        <katex-element expression="y"/>
        onto the embedding vectors
        <katex-element expression="w_i"/>
        no longer results in interference — the coordinates
        are fully decoupled. Orthogonality eliminates cross-talk: each coefficient can be
        recovered independently via projection. The only remaining artifact is a per-feature
        scale factor
        <katex-element expression="\|w_i\|^2"/>
        .
      </p>
      </div>

      <!-- ── Orthonormal Basis ────────────────────────────────── -->
      <h3>Orthonormal Basis</h3>

      <div
          :ref="(el) => blockRefs[blockIdx('orthonormal-basis')] = el as HTMLElement"
          @click="scrollToBlock($event.currentTarget)" class="text-block"
          :class="{ 'active-block': activeBlockIndex === blockIdx('orthonormal-basis') }"
      >
      <p>
        We can simplify the situation even further by normalizing the orthogonal vectors so that
        <katex-element expression="\|w_1\| = \|w_2\| = 1"/>
        . This gives us an orthonormal
        basis: perpendicular directions with unit length.
      </p>

      <p>
        This makes retrieving the embedded feature vector even easier, as the scale correction
        disappears entirely. The Gram matrix becomes the identity:
      </p>
      <katex-element :display-mode="true"
                     expression="W^T W = I"/>
      <katex-element :display-mode="true"
                     expression="W^T y = \begin{pmatrix} x_1 \cdot 1^2 \\ x_2 \cdot 1^2 \end{pmatrix} = x"/>

      <p>
        With unit-length perpendicular axes, the dot product with each embedding vector directly
        gives us the corresponding feature activations in feature space — no coupling, no scale
        correction. In this square 2D example, an orthonormal basis makes the transpose equal
        to the inverse:
        <katex-element expression="W^T = W^{-1}"/>
        . This makes both embedding
        and recovery maximally simple: encode with
        <katex-element expression="W"/>
        , decode
        with
        <katex-element expression="W^T"/>
        .
      </p>

      <p>
        This clean encode/decode symmetry is the geometric intuition behind why the toy
        autoencoder uses a weight matrix and its transpose: it mirrors the idealized behavior
        of an orthonormal basis. Later, when we try to represent more features than there are
        orthogonal directions available, this symmetry remains — but exact orthonormality
        becomes impossible, and the model is forced into compromise geometries.
      </p>
      </div>

      <!-- ── Bridging to overcomplete regime ──────────────────── -->
      <p>
        When the number of features exceeds the embedding dimension
        (
        <katex-element expression="n > m"/>
        ), the feature direction vectors
        <katex-element expression="w_1, \ldots, w_n"/>
        cannot all be mutually orthogonal —
        there are simply not enough independent directions in
        <katex-element expression="\mathbb{R}^m"/>
        . The Gram matrix
        <katex-element expression="W^T W"/>
        will necessarily have nonzero off-diagonal entries,
        meaning that some degree of interference between features is unavoidable. How the model
        navigates this forced compromise is the subject of the experiments that follow.
      </p>
      </div>
    </template>

    <template #viz>
      <div class="viz-sticky">
        <BasesVisualization/>
      </div>
    </template>
  </VizSection>
</template>

<style scoped>
/* Layout handled by VizSection wrapper. Interaction styles in BlogPost.vue. */
</style>
