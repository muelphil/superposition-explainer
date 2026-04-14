import { ref, type InjectionKey, type Ref } from 'vue'

export type VizTab = 'training' | 'statistics' | 'weights'
export type StatsChart = 'loss' | 'presence' | 'angle'

export interface VizServiceType {
  activeTab: Ref<VizTab>
  statsChart: Ref<StatsChart>
}

export const VIZ_SERVICE_KEY: InjectionKey<VizServiceType> = Symbol('vizService')

export function createVizService(): VizServiceType {
  return {
    activeTab: ref<VizTab>('training'),
    statsChart: ref<StatsChart>('loss'),
  }
}
