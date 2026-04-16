/**
 * Imperative helpers for the blog's reveal/pulse system.
 *
 * Two selector dictionaries map abstract targets to CSS selectors:
 *   REVEAL_SELECTORS — elements toggled visible/hidden cumulatively per stage
 *   PULSE_SELECTORS  — elements that receive a continuous pulse animation per block
 *
 * State is communicated via boolean data-attributes (data-revealed, data-pulsing)
 * rather than CSS classes. Vue 3's patch algorithm completely replaces className on
 * re-render (e.g. hover), which would wipe imperatively-added classes. Data
 * attributes are safe because Vue only manages attributes explicitly bound in the
 * template.
 *
 * Usage from AutoencoderSection's apply() callback:
 *   revealUpTo(container, 'encoder')
 *   clearAllPulse(container)
 *   applyPulse(container, 'encoder', true)
 */

// ── Ordered reveal stages (cumulative) ──────────────────────────────────────

export const REVEAL_ORDER = [
  'input-output',
  'embedding',
  'encoder',
  'decoder',
  'weights-view',        // no own selectors — ordering placeholder
  'bias-relu-highlight', // no own selectors — ordering placeholder
  'data',
  'training',
  'full',
] as const

// ── Selector dictionaries ───────────────────────────────────────────────────

/** Elements to show/hide per reveal stage */
export const REVEAL_SELECTORS: Record<string, string[]> = {
  'input-output': ['[data-reveal="input-output"]'],
  'embedding':    ['[data-reveal="embedding"]'],
  'encoder':      ['[data-reveal="encoder"]', '[data-side="encoder"]'],
  'decoder':      ['[data-reveal="decoder"]', '[data-side="decoder"]'],
  'data':         ['[data-reveal="data"]', '.dist-svg'],
  'training':     ['[data-reveal="training"]'],
  'full':         ['[data-reveal="full"]'],
}

/** Elements to pulse per active block */
export const PULSE_SELECTORS: Record<string, string[]> = {
  'input-output': ['[data-reveal="input-output"]'],
  'embedding':    ['[data-reveal="embedding"]'],
  'encoder':      ['[data-reveal="encoder"]', '.vis-path[data-side="encoder"]'],
  'decoder':      ['[data-reveal="decoder"]', '.vis-path[data-side="decoder"]'],
  'weights-view': ['.panel-combined'],
  'tied-weights': ['.vis-path[data-side="encoder"]', '.vis-path[data-side="decoder"]'],
  'bias-relu':    ['.act-icons'],
  'data':         ['.dist-svg', '.resample-all-btn'],
  'training':     ['[data-reveal="training"]'],
}

// ── Data-attribute names ────────────────────────────────────────────────────

const ATTR_REVEALED = 'data-revealed'
const ATTR_PULSING  = 'data-pulsing'

// ── Internal ────────────────────────────────────────────────────────────────

function queryAll(container: HTMLElement, selectors: string[]): Element[] {
  const out: Element[] = []
  for (const sel of selectors) {
    container.querySelectorAll(sel).forEach(el => out.push(el))
  }
  return out
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Toggle visibility of elements belonging to a reveal target. */
export function applyReveal(container: HTMLElement, target: string, show: boolean): void {
  const selectors = REVEAL_SELECTORS[target]
  if (!selectors) return
  for (const el of queryAll(container, selectors)) {
    el.toggleAttribute(ATTR_REVEALED, show)
  }
}

/** Toggle the continuous pulse animation on elements for a given target. */
export function applyPulse(container: HTMLElement, target: string, on: boolean): void {
  const selectors = PULSE_SELECTORS[target]
  if (!selectors) return
  for (const el of queryAll(container, selectors)) {
    el.toggleAttribute(ATTR_PULSING, on)
  }
}

/** Remove the pulse animation from every pulsing element inside the container. */
export function clearAllPulse(container: HTMLElement): void {
  container.querySelectorAll(`[${ATTR_PULSING}]`).forEach(el => {
    el.removeAttribute(ATTR_PULSING)
  })
}

/**
 * Cumulatively reveal all stages up to (and including) the given stage.
 * Stages beyond it are hidden. Pass `null` to hide everything.
 */
export function revealUpTo(container: HTMLElement, stage: string | null): void {
  const idx = stage ? (REVEAL_ORDER as readonly string[]).indexOf(stage) : -1
  for (let i = 0; i < REVEAL_ORDER.length; i++) {
    applyReveal(container, REVEAL_ORDER[i], i <= idx)
  }
}
