// ── Weight / neuron interpolation RGB endpoints ────────────────────────────────
// These define the white/dark → color interpolation used for weight cells, bias icons,
// and neuron circle backgrounds.  Extracted here so all components share one source.
import { isDark } from '../services/SettingsService'

/** orange-500 = #f97316 — endpoint for positive weight/bias cell backgrounds */
export const VAL_POSITIVE_RGB: readonly [number, number, number] = [249, 115, 22]
/** blue-500 = #3b82f6 — endpoint for negative weight/bias cell backgrounds */
export const VAL_NEGATIVE_RGB: readonly [number, number, number] = [59, 130, 246]
/** orange-400 (R fixed at 255) — endpoint for positive neuron circle backgrounds */
export const NEURON_POSITIVE_RGB: readonly [number, number, number] = [255, 146, 60]
/** blue-400 (B fixed at 255) — endpoint for negative neuron circle backgrounds */
export const NEURON_NEGATIVE_RGB: readonly [number, number, number] = [96, 165, 255]

/** White base for light theme */
const WHITE_BASE: readonly [number, number, number] = [255, 255, 255]
/** Dark base for dark theme (#1e2030) */
const DARK_BASE: readonly [number, number, number] = [30, 32, 48]

/** Linear interpolation from base to a target rgb at t ∈ [0,1]. */
function lerpBase(t: number, base: readonly [number, number, number], [r1, g1, b1]: readonly [number, number, number]): string {
  const [r0, g0, b0] = base
  return `rgb(${Math.round(r0 + (r1 - r0) * t)},${Math.round(g0 + (g1 - g0) * t)},${Math.round(b0 + (b1 - b0) * t)})`
}

/**
 * Background color for a weight or bias cell.
 * v ∈ [−1, 1]: 0 → base (white/dark), +1 → orange-500, −1 → blue-500.
 */
export function valColorRgb(v: number): string {
  const t = Math.max(-1, Math.min(1, v))
  const base = isDark.value ? DARK_BASE : WHITE_BASE
  return t >= 0 ? lerpBase(t, base, VAL_POSITIVE_RGB) : lerpBase(-t, base, VAL_NEGATIVE_RGB)
}

/**
 * Background color for a neuron circle.
 * v ≥ 0 → base → orange-400; v < 0 → base → blue-400.
 * Scaled so |v| = 2 → full saturation.
 */
export function neuronColorRgb(v: number): string {
  const t = Math.abs(Math.max(-2, Math.min(2, v))) / 2
  const base = isDark.value ? DARK_BASE : WHITE_BASE
  return v >= 0 ? lerpBase(t, base, NEURON_POSITIVE_RGB) : lerpBase(t, base, NEURON_NEGATIVE_RGB)
}

// ── Neuron border colors ───────────────────────────────────────────────────────
/** Bright orange endpoint for positive neuron borders (#ea580c) */
const BORDER_POSITIVE_RGB_LIGHT: readonly [number, number, number] = [234, 88, 12]
/** Bright blue endpoint for negative neuron borders (#2563eb) */
const BORDER_NEGATIVE_RGB_LIGHT: readonly [number, number, number] = [37, 99, 235]
/** Neutral border at zero for light theme */
const BORDER_ZERO_RGB_LIGHT: readonly [number, number, number] = [156, 163, 175]

/** Orange endpoint for positive neuron borders dark (#fb923c) */
const BORDER_POSITIVE_RGB_DARK: readonly [number, number, number] = [251, 146, 60]
/** Blue endpoint for negative neuron borders dark (#60a5fa) */
const BORDER_NEGATIVE_RGB_DARK: readonly [number, number, number] = [96, 165, 250]
/** Neutral border at zero for dark theme */
const BORDER_ZERO_RGB_DARK: readonly [number, number, number] = [75, 80, 104]

/**
 * Border color for a standard neuron circle.
 * v ≥ 0 → text-secondary → orange; v < 0 → text-secondary → blue.
 * Scaled so |v| = 2 → full saturation.
 */
export function neuronBorderColorRgb(v: number): string {
  const t = Math.abs(Math.max(-2, Math.min(2, v))) / 2
  const dark = isDark.value
  const [r0, g0, b0] = dark ? BORDER_ZERO_RGB_DARK : BORDER_ZERO_RGB_LIGHT
  const pos = dark ? BORDER_POSITIVE_RGB_DARK : BORDER_POSITIVE_RGB_LIGHT
  const neg = dark ? BORDER_NEGATIVE_RGB_DARK : BORDER_NEGATIVE_RGB_LIGHT
  const [r1, g1, b1] = v >= 0 ? pos : neg
  return `rgb(${Math.round(r0 + (r1 - r0) * t)},${Math.round(g0 + (g1 - g0) * t)},${Math.round(b0 + (b1 - b0) * t)})`
}

// ── Feature-mode IO neuron colors ──────────────────────────────────────────────
/** Neutral border at zero for feature-mode, light */
const FEATURE_BORDER_ZERO_RGB_LIGHT: readonly [number, number, number] = [156, 163, 175]
/** Neutral border at zero for feature-mode, dark */
const FEATURE_BORDER_ZERO_RGB_DARK: readonly [number, number, number] = [75, 80, 104]

/**
 * Background for feature-colored IO neurons: base → feature color.
 * v ≥ 0; scaled so v = 2 → full saturation.
 */
export function neuronFeatureBgRgb(v: number, featureIdx: number, numFeatures: number): string {
  const t = Math.min(1, Math.abs(v) / 2)
  const fRgb = sampleGradientSrgb(numFeatures <= 1 ? 0 : featureIdx / (numFeatures - 1))
  const base = isDark.value ? DARK_BASE : WHITE_BASE
  const [r0, g0, b0] = base
  return `rgb(${Math.round(r0 + (fRgb[0] - r0) * t)},${Math.round(g0 + (fRgb[1] - g0) * t)},${Math.round(b0 + (fRgb[2] - b0) * t)})`
}

/**
 * Border for feature-colored IO neurons:
 * v = 0 → neutral; v = 2 → feature color.
 */
export function neuronFeatureBorderRgb(v: number, featureIdx: number, numFeatures: number): string {
  const t = Math.min(1, Math.abs(v) / 2)
  const [fr, fg, fb] = sampleGradientSrgb(numFeatures <= 1 ? 0 : featureIdx / (numFeatures - 1))
  const [r0, g0, b0] = isDark.value ? FEATURE_BORDER_ZERO_RGB_DARK : FEATURE_BORDER_ZERO_RGB_LIGHT
  return `rgb(${Math.round(r0 + (fr - r0) * t)},${Math.round(g0 + (fg - g0) * t)},${Math.round(b0 + (fb - b0) * t)})`
}

/** Color used for the min-angle statistics chart line (pink, mid-gradient) */
export const MIN_ANGLE_CHART_COLOR = '#F73361'  // pink = --color-gradient-mid

// ── Gradient definition ────────────────────────────────────────────────────────
// Add/remove/reorder CSS hex stops to change the feature color gradient.
// Sampling is done in sRGB space (matching CSS color-mix(in srgb, ...)),
// meaning gamma-encoded channel values are mixed directly — no muddy midpoints.

// const GRADIENT_STOPS: string[] = [
//   '#22c55e',  // green  — most important feature
//   '#fff63d',  // yellow — least important feature
// ]

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
