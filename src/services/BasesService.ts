import { ref, computed } from 'vue'

export function createBasesService() {
  const activeParagraphIndex = ref(0)
  const x = computed(() => activeParagraphIndex.value + 1)

  function setActiveParagraph(index: number) {
    activeParagraphIndex.value = index
  }

  return {
    activeParagraphIndex,
    x,
    setActiveParagraph,
  }
}

export type BasesServiceType = ReturnType<typeof createBasesService>
