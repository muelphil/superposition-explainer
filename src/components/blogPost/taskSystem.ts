import { ref, computed, watch, watchEffect, type Ref, type ComputedRef, type InjectionKey } from 'vue'
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
 * **Spec ordering requirement**: specs must be listed in dependency-first
 * (topological) order — a task must appear after all tasks it depends on.
 *
 * Usage:
 * ```ts
 * const list = new TaskList(specs)
 * list.startListening({ svc, events: bus })  // call during <script setup>
 * // template binds to list.tasks, list.stickyResolved
 * // cleanup on unmount (Vue watchers auto-clean; this handles event bus):
 * list.stopListening()
 * ```
 */
export class TaskList {
  private specs: TaskSpec[]
  /**
   * Raw reactive refs returned by each spec's `setup()`.
   * These represent the live (un-gated) completion signal.
   */
  private rawRefs = new Map<string, Ref<boolean> | ComputedRef<boolean>>()
  /**
   * Per sticky-task: a `Ref<boolean>` that latches to `true` once the task
   * is effectively completed and never reverts (survives dep changes).
   */
  private stickyLatched = new Map<string, Ref<boolean>>()
  /**
   * Per task: a `ComputedRef<boolean>` that correctly chains:
   *   sticky latch → dep gate → raw ref
   * Deps are captured as closures at creation time, so no map-access
   * happens inside the computed (preventing accidental reactive deps on the map).
   */
  private effectivelyCompleted = new Map<string, ComputedRef<boolean>>()

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
    // ── Phase 1: raw completion refs ─────────────────────────────────────────
    for (const spec of this.specs) {
      this.rawRefs.set(spec.id, spec.setup(ctx))
    }

    // ── Phase 2: sticky latches ───────────────────────────────────────────────
    for (const spec of this.specs) {
      if (spec.sticky) this.stickyLatched.set(spec.id, ref(false))
    }

    // ── Phase 3: effectivelyCompleted computeds ───────────────────────────────
    // Specs MUST be in dependency-first order (validated below).
    for (const spec of this.specs) {
      const id = spec.id
      const latch = this.stickyLatched.get(id)   // undefined for non-sticky
      const rawRef = this.rawRefs.get(id)!

      // Resolve dep computeds at creation time (not inside the computed fn).
      // This avoids accidental map-access reactive deps during evaluation.
      const depComputeds: ComputedRef<boolean>[] = (spec.dependencies ?? []).map(depId => {
        const c = this.effectivelyCompleted.get(depId)
        if (!c) throw new Error(
          `[TaskList] Task "${depId}" is listed as a dependency of "${id}" but has not been ` +
          `defined yet. Ensure specs are in dependency-first (topological) order.`
        )
        return c
      })

      this.effectivelyCompleted.set(id, computed(() => {
        if (latch?.value) return true                              // sticky latch overrides all
        for (const dep of depComputeds) if (!dep.value) return false  // dependency gate
        return rawRef.value                                        // live condition
      }))
    }

    // ── Phase 4: sticky latch watchers ────────────────────────────────────────
    // One-shot: as soon as effectivelyCompleted flips true, lock the latch.
    for (const spec of this.specs) {
      if (!spec.sticky) continue
      const latch = this.stickyLatched.get(spec.id)!
      const effective = this.effectivelyCompleted.get(spec.id)!
      watch(effective, (v) => { if (v) latch.value = true }, { immediate: true })
    }

    // ── Phase 5: derive UI state ──────────────────────────────────────────────
    // All deps here are explicit computed reads — no hidden implicit deps.
    watchEffect(() => {
      this.tasks.value = this.specs.map(spec => {
        const effective = this.effectivelyCompleted.get(spec.id)!
        const completed = effective.value
        const depsUnmet = (spec.dependencies ?? []).some(
          depId => !this.effectivelyCompleted.get(depId)!.value
        )
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
        .every(s => this.effectivelyCompleted.get(s.id)!.value)
      this.resolved.value = allRequiredDone
      if (allRequiredDone) this.stickyResolved.value = true
    })
  }

  /** Clean up event bus subscriptions (Vue watchers are auto-cleaned on unmount). */
  stopListening(): void {
    this.eventCleanups.forEach(fn => fn())
    this.eventCleanups = []
  }
}
