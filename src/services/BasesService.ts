import { ref } from 'vue'
import type { Vec2 } from '../utils/linearAlgebra2d'

// ── Mapping diagram stages ──────────────────────────────────────────────────

export const MAPPING_STAGES = [
  'none',
  'feature-space',
  'both-spaces',
  'encoding',
  'decoding',
  'gram-matrix',
] as const

export type MappingStage = typeof MAPPING_STAGES[number]

// ── Coordinate viz stages ───────────────────────────────────────────────────

export type CoordinateStage = 'arbitrary' | 'orthogonal' | 'orthonormal'

export interface BasisConfig {
  type: CoordinateStage
  w1: Vec2
  w2: Vec2
  target: Vec2
}

const S5 = Math.sqrt(5)

export const BASIS_CONFIGS: Record<CoordinateStage, BasisConfig> = {
  arbitrary: {
    type: 'arbitrary',
    w1: [1, 2],
    w2: [2, 1],
    target: [1.5, 1],
  },
  orthogonal: {
    type: 'orthogonal',
    w1: [1, 2],
    w2: [1.5, -0.75],
    target: [1.5, 1],
  },
  orthonormal: {
    type: 'orthonormal',
    w1: [1 / S5, 2 / S5],
    w2: [2 / S5, -1 / S5],
    target: [1.5, 1],
  },
}

// ── Service factory ─────────────────────────────────────────────────────────

export function createBasesService() {
  const activeParagraphIndex = ref(0)

  /** Which mapping diagram stage is active (starts empty) */
  const mappingStage = ref<MappingStage>('none')

  /** Which child visualization to show: mapping diagram vs coordinate system */
  const activeViz = ref<'mapping' | 'coordinate'>('mapping')

  /** Active coordinate viz stage (drives vector animation) */
  const coordinateStage = ref<CoordinateStage>('arbitrary')

  /** Sub-stage within the current coordinate stage (drives overlay visibility) */
  const coordinateSubStage = ref<number>(0)

  function setActiveParagraph(index: number) {
    activeParagraphIndex.value = index
  }

  return {
    activeParagraphIndex,
    mappingStage,
    activeViz,
    coordinateStage,
    coordinateSubStage,
    setActiveParagraph,
  }
}

export type BasesServiceType = ReturnType<typeof createBasesService>
