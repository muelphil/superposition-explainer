// Feature color gradient: green (f₁, most important) → yellow (fₙ, least important)
const GREEN_RGB  = [34,  197, 94]   // #22c55e
const YELLOW_RGB = [234, 179,  8]   // #eab308

const CSS_GREEN  = `rgb(${GREEN_RGB.join(', ')})`
const CSS_YELLOW = `rgb(${YELLOW_RGB.join(', ')})`

/** CSS color-mix() blending green→yellow for feature i out of n total features */
export function featureColorCss(idx: number, amount_features: number): string {
  if (amount_features <= 1) return CSS_GREEN
  const pct = (idx / (amount_features - 1)) * 100
  return `color-mix(in srgb, ${CSS_YELLOW} ${pct.toFixed(1)}%, ${CSS_GREEN})`
}

/** CSS rgb() string for feature i out of n total features */
export function featureColor(i: number, n: number): string {
  if (n <= 1) return CSS_GREEN
  const t = i / (n - 1)
  const r = Math.round(GREEN_RGB[0] + (YELLOW_RGB[0] - GREEN_RGB[0]) * t)
  const g = Math.round(GREEN_RGB[1] + (YELLOW_RGB[1] - GREEN_RGB[1]) * t)
  const b = Math.round(GREEN_RGB[2] + (YELLOW_RGB[2] - GREEN_RGB[2]) * t)
  return `rgb(${r},${g},${b})`
}

/** CSS hex string for feature i out of n total features */
export function featureColorHex(i: number, n: number): string {
  if (n <= 1) return '#22c55e'
  const t = i / (n - 1)
  const r = Math.round(GREEN_RGB[0] + (YELLOW_RGB[0] - GREEN_RGB[0]) * t)
  const g = Math.round(GREEN_RGB[1] + (YELLOW_RGB[1] - GREEN_RGB[1]) * t)
  const b = Math.round(GREEN_RGB[2] + (YELLOW_RGB[2] - GREEN_RGB[2]) * t)
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** THREE.Color-compatible [r, g, b] components normalized to [0, 1] */
export function featureColorRGB(i: number, n: number): [number, number, number] {
  if (n <= 1) return [GREEN_RGB[0] / 255, GREEN_RGB[1] / 255, GREEN_RGB[2] / 255]
  const t = i / (n - 1)
  return [
    (GREEN_RGB[0] + (YELLOW_RGB[0] - GREEN_RGB[0]) * t) / 255,
    (GREEN_RGB[1] + (YELLOW_RGB[1] - GREEN_RGB[1]) * t) / 255,
    (GREEN_RGB[2] + (YELLOW_RGB[2] - GREEN_RGB[2]) * t) / 255,
  ]
}
