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

    // Initial check — task may already be satisfied (e.g. slider already at target)
    if (handler.check()) {
      this._markComplete(spec.id)
      return
    }

    const listener = (eventName: string) => (payload?: any) => {
      if (this.completedSet.get(spec.id)) return
      handler.onEvent?.(eventName, payload)
      if (handler.check()) {
        this._markComplete(spec.id)
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
  }

  /** Permanently latch a task as complete, clean up, and promote downstream tasks. */
  private _markComplete(id: string): void {
    this.completedSet.set(id, true)
    const unsub = this.subscriptions.get(id)
    if (unsub) { unsub(); this.subscriptions.delete(id) }
    this.handlers.get(id)?.cleanup?.()
    this._subscribeEligible()
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
