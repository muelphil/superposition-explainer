import { ref, type InjectionKey, type Ref } from 'vue'

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
  /** True when current stage >= target */
  stageAtLeast(target: RevealStage): boolean
  /** When false, the Start/Continue Training button is disabled */
  continueTrainingEnabled: Ref<boolean>
}

export const VIZ_SERVICE_KEY: InjectionKey<VizServiceType> = Symbol('vizService')

export function createVizService(): VizServiceType {
  const revealStage = ref<RevealStage>('full')

  return {
    activeTab: ref<VizTab>('training'),
    statsChart: ref<StatsChart>('loss'),
    revealStage,
    stageAtLeast(target: RevealStage): boolean {
      return stageIndex(revealStage.value) >= stageIndex(target)
    },
    continueTrainingEnabled: ref(true),
  }
}
