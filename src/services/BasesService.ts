import { ref, computed } from 'vue'

export const MAPPING_STAGES = [
  'none',
  'feature-space',
  'both-spaces',
  'encoding',
  'decoding',
  'gram-matrix',
] as const

export type MappingStage = typeof MAPPING_STAGES[number]

export function createBasesService() {
  const activeParagraphIndex = ref(0)

  /** Which mapping diagram stage is active (starts empty) */
  const mappingStage = ref<MappingStage>('none')

  /** Which child visualization to show: mapping diagram vs coordinate system */
  const activeViz = ref<'mapping' | 'coordinate'>('mapping')

  function setActiveParagraph(index: number) {
    activeParagraphIndex.value = index
  }

  return {
    activeParagraphIndex,
    mappingStage,
    activeViz,
    setActiveParagraph,
  }
}

export type BasesServiceType = ReturnType<typeof createBasesService>
