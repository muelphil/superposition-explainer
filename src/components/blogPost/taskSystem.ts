import { ref, watchEffect, type Ref, type ComputedRef, type InjectionKey } from 'vue'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'

// ─── Event bus ─────────────────────────────────────────────────────────────────

type Handler = (payload?: any) => void

/**
 * Lightweight typed event emitter for task-relevant user actions.
 * Components inject the bus and call `emit()` for actions that can't be
 * detected via reactive state (e.g. button clicks, view interactions).
 */
export class TaskEventBus {
  private handlers = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit(event: string, payload?: any): void {
    this.handlers.get(event)?.forEach(h => h(payload))
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const TASK_EVENT_BUS_KEY: InjectionKey<TaskEventBus> = Symbol('taskEventBus')

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Context provided to each task's `setup()` function.
 * Gives access to the autoencoder service (for reactive watches) and
 * the event bus (for action-based tracking).
 */
export interface TaskContext {
  svc: AutoencoderServiceType
  events: TaskEventBus
}

/**
 * Blueprint for a single task.
 * `setup()` is called once during `startListening()` and must return a
 * `Ref<boolean>` that reactively represents whether the task is completed.
 *
 * - For state-based tasks, return a `computed()`.
 * - For event-based tasks, create a `ref(false)` and mutate it inside
 *   event handlers subscribed via `ctx.events`.
 * - For convergence-style tasks, use a `ref(false)` with a `watch()`.
 */
export interface TaskSpec {
  id: string
  label: string
  /** Short note displayed in smaller italic text beneath the task label. */
  note?: string
  /** Once completed, the checkbox stays checked even if the ref later becomes false. */
  sticky?: boolean
  /** IDs of tasks that must be completed before this one is actionable. */
  dependencies?: string[]
  /** Optional tasks are not required for the task list to be "resolved". */
  optional?: boolean
  /** Called once to set up the reactive completion condition. */
  setup: (ctx: TaskContext) => Ref<boolean> | ComputedRef<boolean>
}

/** Derived UI state for a single task. */
export interface TaskState {
  id: string
  label: string
  note?: string
  completed: boolean
  /** True when dependencies are unmet AND task is not yet completed. */
  blocked: boolean
  optional: boolean
}

// ─── TaskList class ────────────────────────────────────────────────────────────

/**
 * Manages a list of tasks, their reactive completion state, sticky latching,
 * dependencies, and overall resolution.
 *
 * Usage:
 * ```ts
 * const list = new TaskList(specs)
 * list.startListening({ svc, events: bus })
 * // template binds to list.tasks, list.stickyResolved
 * // on unmount:
 * list.stopListening()
 * ```
 */
export class TaskList {
  private specs: TaskSpec[]
  private completedRefs = new Map<string, Ref<boolean> | ComputedRef<boolean>>()
  private stickyCompleted = new Set<string>()
  private stickyTrigger = ref(0)
  private eventCleanups: (() => void)[] = []

  readonly tasks = ref<TaskState[]>([])
  readonly resolved = ref(false)
  readonly stickyResolved = ref(false)

  constructor(specs: TaskSpec[]) {
    this.specs = specs
  }

  /**
   * Initialize all tasks. Must be called synchronously during `<script setup>`
   * so that Vue watchers are auto-cleaned on component unmount.
   */
  startListening(ctx: TaskContext): void {
    for (const spec of this.specs) {
      const completedRef = spec.setup(ctx)
      this.completedRefs.set(spec.id, completedRef)

      if (spec.sticky) {
        // Re-check whenever the raw ref changes OR another sticky task resolves
        // (which increments stickyTrigger and could satisfy our dependencies).
        watchEffect(() => {
          const rawDone = completedRef.value
          void this.stickyTrigger.value   // reactive dep: re-run when other stickies fire

          if (!rawDone) return
          if (this.stickyCompleted.has(spec.id)) return

          // Only latch if all dependencies are also satisfied
          const depsOk = (spec.dependencies ?? []).every(depId => this.isCompleted(depId))
          if (depsOk) {
            this.stickyCompleted.add(spec.id)
            this.stickyTrigger.value++
          }
        })
      }
    }

    watchEffect(() => {
      // Touch stickyTrigger so this re-runs when sticky set changes
      void this.stickyTrigger.value

      this.tasks.value = this.specs.map(spec => {
        const completed = this.isCompleted(spec.id)
        const depsUnmet = (spec.dependencies ?? []).some(depId => !this.isCompleted(depId))
        return {
          id: spec.id,
          label: spec.label,
          note: spec.note,
          completed,
          blocked: !completed && depsUnmet,
          optional: spec.optional ?? false,
        }
      })

      const allRequiredDone = this.specs
        .filter(s => !s.optional)
        .every(s => this.isCompleted(s.id))
      this.resolved.value = allRequiredDone
      if (allRequiredDone) this.stickyResolved.value = true
    })
  }

  /** Clean up event bus subscriptions (Vue watchers are auto-cleaned). */
  stopListening(): void {
    this.eventCleanups.forEach(fn => fn())
    this.eventCleanups = []
  }

  private isCompleted(id: string): boolean {
    const spec = this.specs.find(s => s.id === id)
    // All dependencies must be satisfied before this task can be counted as done
    if (spec?.dependencies?.some(depId => !this.isCompleted(depId))) return false
    if (this.stickyCompleted.has(id)) return true
    return this.completedRefs.get(id)?.value ?? false
  }
}
