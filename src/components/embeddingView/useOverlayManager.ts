/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OVERLAY SYSTEM — DEVELOPER GUIDE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Overlays are ephemeral Three.js scene objects that exist only while a specific
 * hover or selection target is active. They are distinct from permanent objects
 * (axes, feature vectors, embedding point) which are always present.
 *
 * HOW TO ADD A NEW OVERLAY
 * ─────────────────────────
 * 1. Create a class in embeddingView/overlays/ that implements SceneOverlay:
 *
 *    import type { SceneCtx, SceneOverlay } from '../types'
 *
 *    export class MyOverlay implements SceneOverlay {
 *      private ctx!: SceneCtx
 *      private mesh!: THREE.Mesh        // declare all scene objects here
 *
 *      build(ctx: SceneCtx) {
 *        this.ctx = ctx
 *        // Create geometry, add to ctx.scene
 *        this.mesh = new THREE.Mesh(...)
 *        ctx.scene.add(this.mesh)
 *      }
 *
 *      tick() {
 *        // Called every render frame — update positions/colors from reactive state.
 *        // Read this.ctx.svc.W.value, this.ctx.svc.currentInput.value, etc.
 *        // No need to cache; tick() is cheap for small updates.
 *      }
 *
 *      dispose() {
 *        // Remove from scene and free GPU resources.
 *        this.ctx.scene.remove(this.mesh)
 *        this.mesh.geometry.dispose()
 *        ;(this.mesh.material as THREE.Material).dispose()
 *      }
 *    }
 *
 * 2. Add a case to resolveOverlays() in this file, mapping SelectionTarget(s)
 *    to one or more SceneOverlay instances. Overlays receive their target
 *    info via constructor arguments (not from selSvc — keep them pure).
 *
 *    Example:
 *      case 'feature':
 *        return [new FeatureProjectionOverlay(hov.idx)]
 *
 * 3. Permanent visual state (e.g. dimming vectors, highlighting axes) goes in
 *    applyVisualState() in useEmbeddingScene.ts — NOT in overlays.
 *
 * LIFECYCLE
 * ──────────
 *   resolveOverlays() is called on every hover/selection change.
 *   Old overlays are disposed, new ones are built immediately.
 *   tick() is called every render frame for all active overlays.
 *   disposeAll() is called on scene teardown (e.g. dimension change).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { watch } from 'vue'
import type { SelectionTarget, SelectionServiceType } from '../../services/SelectionService'
import type { SceneCtx, SceneOverlay } from './types'

// ── Overlay registry ───────────────────────────────────────────────────────────
import { InputDirectionOverlay } from './overlays/InputDirectionOverlay'
import { AxisGradientOverlay } from './overlays/AxisGradientOverlay'
import { ProjectionLineOverlay } from './overlays/ProjectionLineOverlay'
import { DropLineOverlay } from './overlays/DropLineOverlay'
import { BiasPointOverlay } from './overlays/BiasPointOverlay'
import { ReluRegionOverlay } from './overlays/ReluRegionOverlay'
import { InterferenceLinesOverlay } from './overlays/InterferenceLinesOverlay'

/** Kinds that identify a single input feature index. */
const FEATURE_KINDS = new Set(['input', 'feature', 'output', 'bias', 'relu'])

/**
 * Pure function: maps the current selection + hover target to a list of overlays.
 *
 * Overlays are **compositional** — each class does one visual thing, and this
 * resolver combines them freely. E.g. the projection visual is two independent
 * overlays (ProjectionLineOverlay + DropLineOverlay) composed into one list.
 */
function resolveOverlays(
  _sel: SelectionTarget,
  _hov: SelectionTarget,
): SceneOverlay[] {
  // ── Input hover always takes priority ────────────────────────
  if (_hov?.kind === 'input') {
    return [new InputDirectionOverlay(_hov.idx)]
  }

  // ── Output hover takes priority (show decoding for hovered output) ──
  if (_hov?.kind === 'output') {
    return [
      new BiasPointOverlay(_hov.idx),
      new ReluRegionOverlay(_hov.idx),
      new InterferenceLinesOverlay(_hov.idx),
    ]
  }

  // ── Output selected + emb hovered → output overlays + axis gradient ──
  if (_sel?.kind === 'output' && _hov?.kind === 'emb') {
    return [
      new BiasPointOverlay(_sel.idx),
      new ReluRegionOverlay(_sel.idx),
      new InterferenceLinesOverlay(_sel.idx),
      new AxisGradientOverlay(_hov.idx),
    ]
  }

  // ── Output selected + feature hovered → keep output overlays ──
  if (_sel?.kind === 'output' && _hov && FEATURE_KINDS.has(_hov.kind)) {
    return [
      new BiasPointOverlay(_sel.idx),
      new ReluRegionOverlay(_sel.idx),
      new InterferenceLinesOverlay(_sel.idx),
    ]
  }

  // ── Cross-case: one is a feature-kind, the other is an emb axis ──
  if (_sel && _hov) {
    const selIsFeature = FEATURE_KINDS.has(_sel.kind)
    const hovIsFeature = FEATURE_KINDS.has(_hov.kind)
    const selIsEmb = _sel.kind === 'emb'
    const hovIsEmb = _hov.kind === 'emb'

    if (selIsFeature && hovIsEmb) {
      const featureIdx = 'idx' in _sel ? _sel.idx : ('col' in _sel ? _sel.col : 0)
      return [
        new ProjectionLineOverlay(featureIdx, _hov.idx),
        new DropLineOverlay(featureIdx, _hov.idx),
      ]
    }
    if (selIsEmb && hovIsFeature) {
      const featureIdx = 'idx' in _hov ? _hov.idx : ('col' in _hov ? _hov.col : 0)
      return [
        new ProjectionLineOverlay(featureIdx, _sel.idx),
        new DropLineOverlay(featureIdx, _sel.idx),
      ]
    }
  }

  // ── Single-target: selection takes precedence over hover ─────────
  const target = _sel ?? _hov
  if (!target) return []

  switch (target.kind) {
    case 'input':
      return [new InputDirectionOverlay(target.idx)]
    case 'emb':
      return [new AxisGradientOverlay(target.idx)]
    case 'output':
      return [
        new BiasPointOverlay(target.idx),
        new ReluRegionOverlay(target.idx),
        new InterferenceLinesOverlay(target.idx),
      ]
    default:
      return []
  }
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useOverlayManager(
  getCtx: () => SceneCtx | null,
  selSvc: SelectionServiceType,
) {
  let active: SceneOverlay[] = []
  let inputShelved = false

  /** Resolve the effective output target (hover priority over select). */
  function activeOutputIdx(): number | null {
    const hov = selSvc.hovered.value
    const sel = selSvc.selected.value
    if (hov?.kind === 'output') return hov.idx
    if (sel?.kind === 'output') return sel.idx
    return null
  }

  function rebuild() {
    const ctx = getCtx()
    active.forEach(o => o.dispose())
    active = []

    // Shelve / restore input based on whether an output neuron is active
    const outIdx = ctx ? activeOutputIdx() : null
    if (outIdx !== null && ctx) {
      ctx.svc.shelveInput(outIdx)
      inputShelved = true
    } else if (inputShelved && ctx) {
      ctx.svc.restoreInput()
      inputShelved = false
    }

    if (!ctx) return

    const overlays = resolveOverlays(selSvc.selected.value, selSvc.hovered.value)
    for (const overlay of overlays) {
      overlay.build(ctx)
      active.push(overlay)
    }
  }

  watch([selSvc.selected, selSvc.hovered], rebuild, { flush: 'sync' })

  return {
    /** Call every render frame to update all active overlays. */
    tick() {
      for (const o of active) o.tick()
    },
    /** Dispose all active overlays — call on scene teardown. */
    disposeAll() {
      active.forEach(o => o.dispose())
      active = []
      if (inputShelved) {
        const ctx = getCtx()
        if (ctx) ctx.svc.restoreInput()
        inputShelved = false
      }
    },
  }
}
