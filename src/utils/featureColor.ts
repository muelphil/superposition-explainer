// ── Gradient definition ────────────────────────────────────────────────────────
// Add/remove/reorder CSS hex stops to change the feature color gradient.
// Sampling is done in sRGB space (matching CSS color-mix(in srgb, ...)),
// meaning gamma-encoded channel values are mixed directly — no muddy midpoints.
const GRADIENT_STOPS: string[] = [
    '#F69F16',  // orange — most important feature
    '#F73361',  // pink
    '#097AFA',  // blue   — least important feature
]

// ── Embedding point ────────────────────────────────────────────────────────────
/** Purple used for the current embedding point in the 3D scene. */
export const EMBEDDING_POINT_COLOR     = '#a855f7'   // violet-500
export const EMBEDDING_POINT_COLOR_HEX = hexCssToNum('#a855f7')

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert a CSS hex color string (e.g. "#a855f7" or "a855f7") to a numeric hex value (0xa855f7). */
export function hexCssToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

/** Parse a CSS hex string into [r, g, b] in the 0–255 range (sRGB, gamma-encoded). */
function hexToRgb255(hex: string): [number, number, number] {
  const n = hexCssToNum(hex)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/**
 * Decode a single sRGB gamma-encoded channel (0–255) to linear light (0–1).
 * Matches the IEC 61966-2-1 piecewise transfer function used by CSS and Three.js.
 */
function srgbChannelToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/**
 * Interpolate t ∈ [0, 1] across GRADIENT_STOPS in sRGB space —
 * i.e. mix the gamma-encoded channel values directly, matching
 * CSS `color-mix(in srgb, ...)`.  Returns [r, g, b] in 0–255.
 */
function sampleGradientSrgb(t: number): [number, number, number] {
  const stops = GRADIENT_STOPS
  if (stops.length === 1 || t <= 0) return hexToRgb255(stops[0])
  if (t >= 1) return hexToRgb255(stops[stops.length - 1])

  const scaled  = t * (stops.length - 1)
  const lo      = Math.floor(scaled)
  const hi      = lo + 1
  const local_t = scaled - lo

  const [r0, g0, b0] = hexToRgb255(stops[lo])
  const [r1, g1, b1] = hexToRgb255(stops[hi])
  return [
    Math.round(r0 + (r1 - r0) * local_t),
    Math.round(g0 + (g1 - g0) * local_t),
    Math.round(b0 + (b1 - b0) * local_t),
  ]
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * CSS color for feature i out of n total features.
 * Interpolated in sRGB space (matching `color-mix(in srgb, ...)`).
 * Output as `color(srgb ...)` — the browser keeps the gamma-encoded values as-is.
 */
export function featureColorCss(idx: number, amount_features: number): string {
  const t = amount_features <= 1 ? 0 : idx / (amount_features - 1)
  const [r, g, b] = sampleGradientSrgb(t)
  return `color(srgb ${(r / 255).toFixed(5)} ${(g / 255).toFixed(5)} ${(b / 255).toFixed(5)})`
}

/** CSS rgb() string for feature i out of n total features */
export function featureColor(i: number, n: number): string {
  const [r, g, b] = sampleGradientSrgb(n <= 1 ? 0 : i / (n - 1))
  return `rgb(${r},${g},${b})`
}

/** CSS hex string for feature i out of n total features */
export function featureColorHex(i: number, n: number): string {
  const [r, g, b] = sampleGradientSrgb(n <= 1 ? 0 : i / (n - 1))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * THREE.Color-compatible [r, g, b] normalized to [0, 1] in **linear light**.
 * Three.js r152+ stores colors as linear internally (outputColorSpace = SRGBColorSpace),
 * so we gamma-decode from sRGB after sampling the gradient in sRGB space.
 */
export function featureColorRGB(i: number, n: number): [number, number, number] {
  const [r, g, b] = sampleGradientSrgb(n <= 1 ? 0 : i / (n - 1))
  return [srgbChannelToLinear(r), srgbChannelToLinear(g), srgbChannelToLinear(b)]
}
