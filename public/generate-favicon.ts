/**
 * Generates the project favicon as SVG + PNG variants: 5 feature vectors
 * at 72° intervals forming a star shape, with colors from the project's
 * feature gradient.
 *
 * Run: npx tsx generate-favicon.ts
 * Output: public/favicon.svg, public/favicon-16.png, favicon-32.png, favicon-48.png, favicon-96.png, favicon-192.png
 *
 * Requires Inkscape on PATH for SVG → PNG export.
 */

import { writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// ── Feature color gradient (matches src/utils/featureColor.ts GRADIENT_STOPS) ──

const GRADIENT_STOPS = [
  '#F69F16',  // orange — most important feature
  '#F73361',  // pink
  '#097AFA',  // blue   — least important feature
]

function hexToRgb255(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function sampleGradientSrgb(t: number): [number, number, number] {
  const stops = GRADIENT_STOPS
  if (stops.length === 1 || t <= 0) return hexToRgb255(stops[0])
  if (t >= 1) return hexToRgb255(stops[stops.length - 1])
  const scaled = t * (stops.length - 1)
  const lo = Math.floor(scaled)
  const hi = lo + 1
  const localT = scaled - lo
  const [r0, g0, b0] = hexToRgb255(stops[lo])
  const [r1, g1, b1] = hexToRgb255(stops[hi])
  return [
    Math.round(r0 + (r1 - r0) * localT),
    Math.round(g0 + (g1 - g0) * localT),
    Math.round(b0 + (b1 - b0) * localT),
  ]
}

function featureColorHex(i: number, n: number): string {
  const [r, g, b] = sampleGradientSrgb(n <= 1 ? 0 : i / (n - 1))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ── Configuration ───────────────────────────────────────────────────────────────

const NUM_FEATURES   = 5        // number of vectors (star arms)
const CANVAS_SIZE    = 64       // SVG viewBox size (quadratic)
const CENTER_X       = CANVAS_SIZE / 2
const CENTER_Y       = CANVAS_SIZE / 2 + 2  // shifted down 2px to fit top arrowhead
const SHAFT_LENGTH   = 18       // length of the vector shaft (before arrow)
const ARROW_HEAD_W   = 10       // base width of the arrowhead
const ARROW_HEAD_H   = 14       // height of the arrowhead
const LINE_WIDTH     = 3.5      // stroke width of vector lines
const ROTATION_OFF   = -90      // degrees: 0° = first vector points right; -90° = up

// ── SVG generation ──────────────────────────────────────────────────────────────

function generateFaviconSvg(): string {
  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">`)

  for (let i = 0; i < NUM_FEATURES; i++) {
    const angleDeg = ROTATION_OFF + (360 / NUM_FEATURES) * i
    const angleRad = (angleDeg * Math.PI) / 180

    const color = featureColorHex(i, NUM_FEATURES)

    // Vector tip (shaft end + arrowhead)
    const tipX = CENTER_X + Math.cos(angleRad) * (SHAFT_LENGTH + ARROW_HEAD_H)
    const tipY = CENTER_Y + Math.sin(angleRad) * (SHAFT_LENGTH + ARROW_HEAD_H)

    // Shaft start (center) and end
    const shaftEndX = CENTER_X + Math.cos(angleRad) * SHAFT_LENGTH
    const shaftEndY = CENTER_Y + Math.sin(angleRad) * SHAFT_LENGTH

    // Arrowhead: perpendicular direction at the shaft end
    const perpX = -Math.sin(angleRad) * (ARROW_HEAD_W / 2)
    const perpY = Math.cos(angleRad) * (ARROW_HEAD_W / 2)

    const leftX = shaftEndX + perpX
    const leftY = shaftEndY + perpY
    const rightX = shaftEndX - perpX
    const rightY = shaftEndY - perpY

    parts.push(
      `<g stroke="${color}" fill="${color}" stroke-width="${LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">`
    )

    // Shaft line (from center to arrowhead base)
    parts.push(
      `<line x1="${CENTER_X.toFixed(2)}" y1="${CENTER_Y.toFixed(2)}" x2="${shaftEndX.toFixed(2)}" y2="${shaftEndY.toFixed(2)}"/>`
    )

    // Arrowhead (filled triangle)
    parts.push(
      `<polygon points="${tipX.toFixed(2)},${tipY.toFixed(2)} ${leftX.toFixed(2)},${leftY.toFixed(2)} ${rightX.toFixed(2)},${rightY.toFixed(2)}"/>`
    )

    parts.push(`</g>`)
  }

  parts.push(`</svg>`)
  return parts.join('\n')
}

// ── Write to file ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const baseName = resolve(__dirname, 'favicon')

// Generate SVG
const svgPath = baseName + '.svg'
const svg = generateFaviconSvg()
writeFileSync(svgPath, svg, 'utf-8')
console.log(`✓ Wrote ${svgPath}`)

// Generate PNG variants at common favicon sizes using Inkscape
const SIZES = [16, 32, 48, 96, 192]
for (const size of SIZES) {
  const pngPath = baseName + `-${size}.png`
  try {
    execSync(
      `inkscape "${svgPath}" --export-type=png --export-filename="${pngPath}" --export-width=${size} --export-height=${size}`,
      { stdio: 'ignore' }
    )
    console.log(`✓ Wrote ${pngPath}`)
  } catch {
    console.warn(`⚠ Skipped ${pngPath} — Inkscape not found or failed`)
    break
  }
}

console.log(svg)
