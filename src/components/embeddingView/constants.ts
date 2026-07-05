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
export const DIM_COLOR_HEX_DARK = 0x3a3f52
export const DIM_OPACITY   = 0.35

// ── Light theme colors (Three.js / CSS2D — cannot use CSS custom properties) ──
export const AXIS_COLOR_LIGHT          = 0xd1d5db
export const AXIS_LABEL_COLOR_DEFAULT_LIGHT   = '#6b7280'
export const AXIS_LABEL_COLOR_HIGHLIGHT_LIGHT = '#1f2937'
export const AXIS_HIGHLIGHT_COLOR_LIGHT       = 0x374151
export const BIAS_DOT_COLOR_LIGHT             = 0x4b5563
export const BIAS_LABEL_COLOR_LIGHT           = '#6b7280'
export const RELU_REGION_COLOR_LIGHT          = 0x9ca3af
export const RELU_LABEL_COLOR_LIGHT           = '#9ca3af'
export const RELU_LABEL_BORDER_COLOR_LIGHT    = '#d1d5db'
export const RELU_LABEL_BG_LIGHT              = 'rgba(255,255,255,0.85)'
export const RELU_DISC_OPAQUE_LIGHT           = 'rgba(255,255,255,1)'
export const RELU_DISC_TRANSPARENT_LIGHT      = 'rgba(255,255,255,0)'
export const ERROR_LINE_COLOR_LIGHT           = 0xef4444
export const DROP_LINE_COLOR_LIGHT            = 0xd1d5db
export const INPUT_DIR_DOT_COLOR_LIGHT        = 0x6b7280

// ── Dark theme overrides ──────────────────────────────────────
export const AXIS_COLOR_DARK          = 0x4b5070
export const AXIS_LABEL_COLOR_DEFAULT_DARK   = '#8b95a8'
export const AXIS_LABEL_COLOR_HIGHLIGHT_DARK = '#e2e4eb'
export const AXIS_HIGHLIGHT_COLOR_DARK       = 0xd1d5e0
export const BIAS_DOT_COLOR_DARK             = 0xffffff
export const BIAS_LABEL_COLOR_DARK           = '#8b95a8'
export const RELU_REGION_COLOR_DARK          = 0x4b5563
export const RELU_LABEL_COLOR_DARK           = '#8b95a8'
export const RELU_LABEL_BORDER_COLOR_DARK    = '#373d52'
export const RELU_LABEL_BG_DARK              = 'rgba(15,17,23,0.88)'
export const RELU_DISC_OPAQUE_DARK           = 'rgba(30,32,48,1)'
export const RELU_DISC_TRANSPARENT_DARK      = 'rgba(30,32,48,0)'
export const ERROR_LINE_COLOR_DARK           = 0xff0000
export const DROP_LINE_COLOR_DARK            = 0x4b5070
export const INPUT_DIR_DOT_COLOR_DARK        = 0x8b95a8

// ── Error line geometry (theme-independent) ───────────────────
export const ERROR_DASH_SIZE            = 0.02
export const ERROR_GAP_SIZE             = 0.02
export const ERROR_LINE_OPACITY         = 0.8
export const ERROR_LINE_RENDER_ORDER    = 3

// ── Backward compat: default = light variant ──────────────────
export const AXIS_LABEL_COLOR_DEFAULT   = AXIS_LABEL_COLOR_DEFAULT_LIGHT
