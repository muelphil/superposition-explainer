// Feature color gradient: green (f1, most important) → yellow (fN, least important)
// Green:  #22c55e  (R=34,  G=197, B=94)
// Yellow: #eab308  (R=234, G=179, B=8)

const FR0 = 34,  FG0 = 197, FB0 = 94   // green
const FR1 = 234, FG1 = 179, FB1 = 8    // yellow

/** CSS rgb() string for feature i out of n total features */
export function featureColor(i: number, n: number): string {
  if (n <= 1) return `rgb(${FR0},${FG0},${FB0})`
  const t = i / (n - 1)
  const r = Math.round(FR0 + (FR1 - FR0) * t)
  const g = Math.round(FG0 + (FG1 - FG0) * t)
  const b = Math.round(FB0 + (FB1 - FB0) * t)
  return `rgb(${r},${g},${b})`
}

/** CSS hex string for feature i out of n total features */
export function featureColorHex(i: number, n: number): string {
  if (n <= 1) return '#22c55e'
  const t = i / (n - 1)
  const r = Math.round(FR0 + (FR1 - FR0) * t)
  const g = Math.round(FG0 + (FG1 - FG0) * t)
  const b = Math.round(FB0 + (FB1 - FB0) * t)
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** THREE.Color-compatible [r, g, b] components normalized to [0, 1] */
export function featureColorRGB(i: number, n: number): [number, number, number] {
  if (n <= 1) return [FR0 / 255, FG0 / 255, FB0 / 255]
  const t = i / (n - 1)
  return [
    (FR0 + (FR1 - FR0) * t) / 255,
    (FG0 + (FG1 - FG0) * t) / 255,
    (FB0 + (FB1 - FB0) * t) / 255,
  ]
}
