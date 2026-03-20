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
// Import overlay classes here as they are implemented:
// import { FeatureProjectionOverlay } from './overlays/FeatureProjectionOverlay'

/**
 * Pure function: maps the current selection + hover target to a list of overlays.
 * Selection takes precedence; hover only contributes if nothing is selected.
 * Return [] to show no overlays for a given target combination.
 */
function resolveOverlays(
  _sel: SelectionTarget,
  _hov: SelectionTarget,
): SceneOverlay[] {
  // Overlay implementations are added here one by one.
  // Example (once FeatureProjectionOverlay is implemented):
  //   const target = _sel ?? _hov
  //   if (target?.kind === 'feature') return [new FeatureProjectionOverlay(target.idx)]
  return []
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useOverlayManager(
  getCtx: () => SceneCtx | null,
  selSvc: SelectionServiceType,
) {
  let active: SceneOverlay[] = []

  function rebuild() {
    const ctx = getCtx()
    active.forEach(o => o.dispose())
    active = []
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
    },
  }
}
