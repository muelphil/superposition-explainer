import { ref, type InjectionKey } from 'vue'

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
 * Generic over `T` so each section provides its own service bag.
 */
export interface TaskContext<T = Record<string, any>> {
  events: TaskEventBus
  services: T
}

/**
 * Returned by `TaskSpec.setup()`. Defines which events the task subscribes to,
 * a synchronous `check()` for completion, and optional side-effect / progress hooks.
 *
 * - `events`: names of TaskEventBus events to subscribe to once deps are met.
 * - `check()`: called once on subscription (initial check) and on each matching event.
 *    Return `true` to mark the task complete (permanently latched).
 * - `onEvent()`: optional — called before `check()` to accumulate state (e.g. count clicks).
 * - `progress()`: optional — returns current/total for multi-step tasks (e.g. "2/3").
 * - `cleanup()`: optional — called when the task list is torn down.
 */
export interface TaskHandler {
  events: string[]
  check: () => boolean
  onEvent?: (eventName: string, payload?: any) => void
  progress?: () => { current: number; total: number } | null
  cleanup?: () => void
}

/**
 * Blueprint for a single task.
 * `setup()` is called once during `startListening()` and must return a `TaskHandler`.
 * Labels may contain HTML (e.g. KaTeX-rendered math).
 */
export interface TaskSpec<T = Record<string, any>> {
  id: string
  /** HTML string — may include inline KaTeX. Rendered via v-html in TaskListDisplay. */
  label: string
  /** Short note displayed beneath the label (HTML string). */
  note?: string
  /** IDs of tasks that must be completed before this one is actionable. */
  dependencies?: string[]
  /** Optional tasks are not required for the task list to be "resolved". */
  optional?: boolean
  /**
   * When true, the task stays subscribed after completing and can become
   * incomplete again if `check()` returns false on a subsequent event.
   * Use for "set slider to X" tasks where the user may undo the action.
   */
  resetable?: boolean
  /** Called once to set up the event-driven completion handler. */
  setup: (ctx: TaskContext<T>) => TaskHandler
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
  /** Progress indicator for multi-step tasks (e.g. { current: 1, total: 3 }). */
  progress: { current: number; total: number } | null
}

// ─── TaskList class ────────────────────────────────────────────────────────────

/**
 * Manages a list of tasks via event-driven completion detection.
 *
 * Tasks subscribe to TaskEventBus events only when their dependencies are met.
 * Once `handler.check()` returns true, the task is permanently latched as complete
 * and downstream tasks become eligible for subscription.
 *
 * No Vue reactivity (`computed`/`watch`) is used for task logic — only a plain
 * `ref<TaskState[]>` is updated imperatively after each event.
 *
 * **Spec ordering**: specs must be in dependency-first (topological) order.
 *
 * Usage:
 * ```ts
 * const list = new TaskList(specs)
 * list.startListening(ctx)
 * // template binds to list.tasks, list.stickyResolved
 * list.stopListening() // on unmount
 * ```
 */
export class TaskList {
  private specs: TaskSpec<any>[]
  private handlers = new Map<string, TaskHandler>()
  private completedSet = new Map<string, boolean>()
  /** Per-task unsubscribe functions for event bus listeners. */
  private subscriptions = new Map<string, () => void>()
  private ctx: TaskContext<any> | null = null
  /**
   * When false, event listeners are registered but silently skip processing.
   * Use setActive(true/false) from apply()/leave() so tasks only complete
   * while their associated text-block is the currently active one.
   */
  private active = false

  readonly tasks = ref<TaskState[]>([])
  readonly resolved = ref(false)
  readonly stickyResolved = ref(false)

  constructor(specs: TaskSpec<any>[]) {
    this.specs = specs
    for (const spec of specs) this.completedSet.set(spec.id, false)
    this._updateTaskStates()
  }

  /**
   * Initialize all task handlers and subscribe eligible tasks.
   * Call during `<script setup>`.
   */
  startListening(ctx: TaskContext<any>): void {
    this.ctx = ctx
    for (const spec of this.specs) {
      this.handlers.set(spec.id, spec.setup(ctx))
    }
    this._subscribeEligible()
    this._updateTaskStates()
  }

  /** Clean up all event bus subscriptions and handler resources. */
  stopListening(): void {
    for (const unsub of this.subscriptions.values()) unsub()
    this.subscriptions.clear()
    for (const handler of this.handlers.values()) handler.cleanup?.()
    this.handlers.clear()
  }

  /**
   * Enable or disable event processing for this task list.
   * Call setActive(true) when entering the associated text-block and
   * setActive(false) when leaving it. Events emitted while inactive are
   * silently ignored — task state is preserved so progress is not lost.
   *
   * On transition to active, runs deferred initial checks for all subscribed
   * tasks so that conditions already satisfied before the block was reached
   * are correctly reflected (e.g. "slider already at target value").
   */
  setActive(active: boolean): void {
    const wasInactive = !this.active
    this.active = active
    if (active && wasInactive) this._runDeferredInitialChecks()
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private _areDepsComplete(spec: TaskSpec<any>): boolean {
    return (spec.dependencies ?? []).every(depId => this.completedSet.get(depId))
  }

  /** Subscribe any tasks whose deps are now met and that aren't already done/subscribed. */
  private _subscribeEligible(): void {
    for (const spec of this.specs) {
      if (this.completedSet.get(spec.id)) continue
      if (this.subscriptions.has(spec.id)) continue
      if (!this._areDepsComplete(spec)) continue
      this._subscribe(spec)
    }
  }

  /** Subscribe a single task to its declared events. Runs initial check immediately. */
  private _subscribe(spec: TaskSpec<any>): void {
    const handler = this.handlers.get(spec.id)!
    const isResetable = !!spec.resetable

    // Initial check — only when active. If inactive at subscription time (i.e. at
    // startListening()), this is skipped; setActive(true) later calls
    // _runDeferredInitialChecks() to catch conditions already satisfied on arrival.
    if (this.active && handler.check()) {
      this.completedSet.set(spec.id, true)
      this._subscribeEligible()
      if (!isResetable) {
        // Non-resetable: permanently latched, no listener needed
        this._updateTaskStates()
        return
      }
      // Resetable: mark done but still set up listener so it can be undone
    }

    const listener = (eventName: string) => (payload?: any) => {
      if (!this.active) return  // only process events while associated block is active
      const wasDone = this.completedSet.get(spec.id)!
      if (wasDone && !isResetable) return  // non-resetable: already done, ignore

      handler.onEvent?.(eventName, payload)
      const nowDone = handler.check()

      if (nowDone && !wasDone) {
        // Newly completed
        this.completedSet.set(spec.id, true)
        if (!isResetable) {
          // Non-resetable: unsubscribe and clean up
          const unsub = this.subscriptions.get(spec.id)
          if (unsub) { unsub(); this.subscriptions.delete(spec.id) }
          handler.cleanup?.()
        }
        this._subscribeEligible()
      } else if (!nowDone && wasDone) {
        // Resetable: became incomplete (non-resetable can't reach here due to early return)
        this.completedSet.set(spec.id, false)
      }
      this._updateTaskStates()
    }

    const unsubs: (() => void)[] = []
    for (const event of handler.events) {
      const fn = listener(event)
      this.ctx!.events.on(event, fn)
      unsubs.push(() => this.ctx!.events.off(event, fn))
    }

    this.subscriptions.set(spec.id, () => unsubs.forEach(fn => fn()))
    this._updateTaskStates()
  }

  /** Permanently latch a non-resetable task as complete, clean up, and promote downstream tasks. */
  private _markComplete(id: string): void {
    this.completedSet.set(id, true)
    const unsub = this.subscriptions.get(id)
    if (unsub) { unsub(); this.subscriptions.delete(id) }
    this.handlers.get(id)?.cleanup?.()
    this._subscribeEligible()
    this._updateTaskStates()
  }

  /**
   * Run initial checks for all currently subscribed tasks. Called when
   * setActive(true) transitions from inactive so that conditions already
   * satisfied before the block was reached are correctly applied.
   */
  private _runDeferredInitialChecks(): void {
    let changed = false
    for (const spec of this.specs) {
      if (!this.subscriptions.has(spec.id)) continue
      const handler = this.handlers.get(spec.id)!
      const wasDone = this.completedSet.get(spec.id)!
      const nowDone = handler.check()
      if (nowDone && !wasDone) {
        this.completedSet.set(spec.id, true)
        if (!spec.resetable) {
          const unsub = this.subscriptions.get(spec.id)
          if (unsub) { unsub(); this.subscriptions.delete(spec.id) }
          handler.cleanup?.()
        }
        changed = true
      } else if (!nowDone && wasDone && spec.resetable) {
        this.completedSet.set(spec.id, false)
        changed = true
      }
    }
    if (changed) this._subscribeEligible()
    this._updateTaskStates()
  }

  /** Rebuild the public `tasks` ref from current internal state. */
  private _updateTaskStates(): void {
    this.tasks.value = this.specs.map(spec => {
      const isDone = this.completedSet.get(spec.id)!
      const depsUnmet = !this._areDepsComplete(spec)
      const handler = this.handlers.get(spec.id)
      return {
        id: spec.id,
        label: spec.label,
        note: spec.note,
        completed: isDone,
        blocked: !isDone && depsUnmet,
        optional: spec.optional ?? false,
        progress: (!isDone && !depsUnmet && handler?.progress?.()) ?? null,
      }
    })

    const allRequiredDone = this.specs
      .filter(s => !s.optional)
      .every(s => this.completedSet.get(s.id))
    this.resolved.value = allRequiredDone
    if (allRequiredDone) this.stickyResolved.value = true
  }
}
