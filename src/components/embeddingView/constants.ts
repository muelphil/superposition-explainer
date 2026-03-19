// ── Camera ───────────────────────────────────────────────────
export const CAMERA_FOV      = 45
export const CAMERA_MARGIN   = 0.3
export const CAMERA_3D_DIR   = [1, 0.8, 1.667] as const   // unnormalized view direction
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
export const AXIS_ARROW_INSET    = 0.18
export const AXIS_ARROW_LEN      = 0.22
export const AXIS_ARROW_HEAD_LEN = 0.16
export const AXIS_ARROW_HEAD_W   = 0.07
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
