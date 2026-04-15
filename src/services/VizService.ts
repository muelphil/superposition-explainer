import { ref, computed, type InjectionKey, type Ref, type ComputedRef } from 'vue'

export type VizTab = 'training' | 'statistics' | 'weights'
export type StatsChart = 'loss' | 'presence' | 'angle'

export const REVEAL_STAGES = [
  'blank',
  'input-output',
  'embedding',
  'encoder',
  'decoder',
  'weights-view',
  'bias-relu-highlight',
  'data',
  'training',
  'full',
] as const

export type RevealStage = typeof REVEAL_STAGES[number]

function stageIndex(stage: RevealStage): number {
  return REVEAL_STAGES.indexOf(stage)
}

export interface VizServiceType {
  activeTab: Ref<VizTab>
  statsChart: Ref<StatsChart>
  revealStage: Ref<RevealStage>
  /** CSS classes for the current reveal stage (cumulative) */
  revealClasses: ComputedRef<string[]>
  /** Non-cumulative class for the exact current stage, e.g. "current-stage-decoder" */
  currentStageClass: ComputedRef<string>
  /** True when current stage >= target */
  stageAtLeast(target: RevealStage): boolean
  /** When true, the bias/ReLU icons pulse continuously (non-cumulative, block-scoped) */
  biasReluPulse: Ref<boolean>
  /** When false, the Start/Continue Training button is disabled */
  continueTrainingEnabled: Ref<boolean>
}

export const VIZ_SERVICE_KEY: InjectionKey<VizServiceType> = Symbol('vizService')

export function createVizService(): VizServiceType {
  const revealStage = ref<RevealStage>('full')

  const revealClasses = computed(() => {
    const idx = stageIndex(revealStage.value)
    return REVEAL_STAGES.slice(0, idx + 1).map(s => `reveal-${s}`)
  })

  const currentStageClass = computed(() => `current-stage-${revealStage.value}`)

  return {
    activeTab: ref<VizTab>('training'),
    statsChart: ref<StatsChart>('loss'),
    revealStage,
    revealClasses,
    currentStageClass,
    stageAtLeast(target: RevealStage): boolean {
      return stageIndex(revealStage.value) >= stageIndex(target)
    },
    biasReluPulse: ref(false),
    continueTrainingEnabled: ref(true),
  }
}
