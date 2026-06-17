// ── Camera ───────────────────────────────────────────────────
export const CAMERA_FOV      = 45
export const CAMERA_MARGIN   = 0.3
export const CAMERA_3D_DIR   = [1, 1, 1] as const          // isometric: equal angle/length for all 3 axes
export const CAMERA_MIN_DIST = 1.5
export const CAMERA_MAX_DIST = 14
export const CAMERA_DAMPING  = 0.07

// ── Axes ─────────────────────────────────────────────────────
export const AXIS_LEN            = 1.3
export const AXIS_LABEL_PERP     = 0.3
export const AXIS_COLOR          = 0xd1d5db   // slate-300
export const AXIS_OPACITY        = 0.55
export const AXIS_TICK_OPACITY   = 0.4
export const AXIS_TICK_SIZE      = 0.05
export const AXIS_SHAFT_RADIUS   = 0.004
export const AXIS_SHAFT_SEGMENTS = 8
export const AXIS_ARROW_HEAD_LEN = 0.16
export const AXIS_ARROW_HEAD_W   = 0.04
export const AXIS_HIT_RADIUS     = 0.08
export const ORIGIN_RADIUS       = 0.028

// h₁ h₂ h₃ as LaTeX formulae for KaTeX rendering
export const AXIS_LABELS = ['h_1', 'h_2', 'h_3'] as const
// X / Y / Z axis directions as plain tuples (no Three.js import here)
export const AXIS_DIRECTIONS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
] as const

// ── Feature vectors ──────────────────────────────────────────
export const ARROW_HEAD_MAX_LEN   = 0.17
export const ARROW_HEAD_MAX_W     = 0.09
export const ARROW_HEAD_LEN_FRAC  = 0.35
export const ARROW_HEAD_W_FRAC    = 0.22
export const ARROW_SHAFT_RADIUS   = 0.013
export const ARROW_SHAFT_SEGMENTS = 8
export const VEC_HIT_RADIUS       = 0.075
export const VEC_HIT_EXTRA        = 0.12

// ── Hover dimming ────────────────────────────────────────────
export const DIM_COLOR_HEX = 0xadadad
export const DIM_OPACITY   = 0.35

// ── Colors (Three.js / CSS2D — cannot use CSS custom properties) ─────────────
export const AXIS_LABEL_COLOR_DEFAULT   = '#6b7280'   // grey-500 (≈ --color-text-label)
export const AXIS_LABEL_COLOR_HIGHLIGHT = '#1f2937'   // grey-900
export const AXIS_HIGHLIGHT_COLOR       = 0x374151    // grey-700 (≈ --color-text-primary)
export const BIAS_DOT_COLOR             = 0x4b5563    // grey-600
export const BIAS_LABEL_COLOR           = '#6b7280'   // grey-500 (≈ --color-text-label)
export const RELU_REGION_COLOR          = 0x9ca3af    // grey-400 (≈ --color-text-secondary)
export const RELU_LABEL_COLOR           = '#9ca3af'   // grey-400
export const RELU_LABEL_BORDER_COLOR    = '#d1d5db'   // grey-300 (≈ --color-interactive-disabled)
export const RELU_LABEL_BG              = 'rgba(255,255,255,0.85)'
export const RELU_DISC_OPAQUE           = 'rgba(255,255,255,1)'   // canvas gradient: opaque white
export const RELU_DISC_TRANSPARENT      = 'rgba(255,255,255,0)'   // canvas gradient: transparent edge
export const ERROR_LINE_COLOR           = 0xff0000                 // bright red for interference / error
export const ERROR_DASH_SIZE            = 0.02                     // error/interference dash length
export const ERROR_GAP_SIZE             = 0.02                     // error/interference gap length
export const ERROR_LINE_OPACITY         = 0.8                      // error/interference line opacity
export const ERROR_LINE_RENDER_ORDER    = 3                        // error/interference line render order
