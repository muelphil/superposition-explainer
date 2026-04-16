/**
 * gen-math-svg.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script that generates src/assets/mapping-diagram.svg with all math
 * labels rendered as SVG path data via MathJax. The result is fully
 * self-contained: no fonts, no HTML overlay — editable in Affinity Designer or
 * Inkscape (group IDs survive round-trips).
 *
 * Run:  node scripts/gen-math-svg.mjs
 * Deps: mathjax-full (devDependency)
 *
 * How positioning works
 * ─────────────────────
 * MathJax SVG output uses 1000 internal units per em, with y increasing
 * upward (math convention). The outer <g> it produces has
 *   transform="matrix(1 0 0 -1 0 0)"
 * which flips the y axis to screen convention.
 *
 * We extract the CONTENT inside that outer <g> and embed it in our own wrapper:
 *   <g transform="matrix(s, 0, 0, -s, x, ry)">
 * where s = fs/1000 scales MathJax units to pixels, and (x, ry) is the
 * desired baseline position in our 580×360 viewBox.
 *
 * A point at MathJax math-coord (mx, my) maps to screen (x + mx·s, ry − my·s):
 *   baseline (my=0)   → (x, ry)   ✓
 *   ascenders (my>0)  → above ry  ✓
 *   descenders (my<0) → below ry  ✓
 */

import { mathjax }          from 'mathjax-full/js/mathjax.js'
import { TeX }               from 'mathjax-full/js/input/tex.js'
import { SVG }               from 'mathjax-full/js/output/svg.js'
import { liteAdaptor }       from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { writeFileSync }     from 'node:fs'

// ── MathJax setup ─────────────────────────────────────────────────────────────
const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

const mjDoc = mathjax.document('', {
  InputJax: new TeX({ packages: ['base', 'ams'] }),
  OutputJax: new SVG({ fontCache: 'none' }),  // inline all paths — no <defs>/<use>
})

/**
 * Render a TeX expression and return the inner SVG content plus rendered width.
 * @returns {{ innerContent: string, mjWidth: number }}
 *   innerContent — serialized content of MathJax's outer <g> (the math paths)
 *   mjWidth      — rendered width in MathJax units (1000 = 1 em)
 */
function render(tex, display = false) {
  const node   = mjDoc.convert(tex, { display })
  const svgEl  = adaptor.firstChild(node)                     // <svg> element
  const vbStr  = adaptor.getAttribute(svgEl, 'viewBox')       // "0 -d w h"
  const [,, mjWidth] = vbStr.trim().split(/\s+/).map(Number)
  const outerG = adaptor.firstChild(svgEl)                    // outer <g transform="matrix(1 0 0 -1 0 0)">
  const innerContent = adaptor.innerHTML(outerG)              // math paths inside
  return { innerContent, mjWidth }
}

/**
 * Build a positioned <g> containing MathJax-rendered math paths.
 *
 * @param {string} tex     LaTeX source (no $ delimiters)
 * @param {number} rx      Reference x in the 580×360 viewBox
 * @param {number} ry      Baseline y in the 580×360 viewBox
 * @param {'left'|'center'|'right'} align  Alignment relative to rx
 * @param {number} fs      Font size in SVG units (≈ px at 1:1 scale)
 * @param {string} color   SVG color / fill for the math (currentColor-compatible)
 * @param {boolean} display Whether to use display math mode
 * @returns {string} SVG <g> element string
 */
function mathLabel(tex, rx, ry, align = 'left', fs = 14, color = '#1f2937', display = false) {
  const { innerContent, mjWidth } = render(tex, display)
  const pxWidth = mjWidth * fs / 1000

  let x = rx
  if (align === 'center') x = rx - pxWidth / 2
  if (align === 'right')  x = rx - pxWidth

  const s = fs / 1000
  // color attr cascades into fill="currentColor" on all MathJax inner paths
  return `<g transform="matrix(${s},0,0,${-s},${x.toFixed(3)},${ry})" color="${color}" fill="currentColor" stroke-width="0">${innerContent}</g>`
}

// ── Diagram geometry (SVG viewBox 580×360) ────────────────────────────────────
//   F circle:    center (155, 180), r=115
//   H circle:    center (435, 180), r=75
//   dot-x:       (120, 140)
//   dot-y:       (450, 155)
//   dot-xhat:    (139, 190)
//   W arc:       M124,136 C238.211,56.772 371.582,69.394 444,144  (peaks ≈ y=57)
//   W^T arc:     M448,160 C317.795,286.319 191.695,221.883 149.641,196.934

// ── Alignment helper: compute left edge of "=" in  "\hat{x} = W^T y"  ────────
// Used so "= W^T Wx" (gram-matrix line) starts at the same "=" column.
// Strategy: render "\hat{x}\," (xhat + thin space) to get the width of the prefix
// that sits to the LEFT of the "=" operator. In LaTeX math mode, the relation
// spacing around "=" is symmetric, so this gives the "=" left edge.
const XHAT_FS      = 13   // font size for xhat / gram labels
const XHAT_RX      = 130  // right edge x for line 1
const XHAT_RY1     = 184  // baseline y, line 1 ("\hat{x} = W^T y")
const XHAT_RY2     = 201  // baseline y, line 2 ("= W^T Wx")

const { mjWidth: W1_mj }      = render('\\hat{x} = W^{T} y')
const { mjWidth: Wprefix_mj } = render('\\hat{x}\\,')        // prefix up to "="

const W1_px      = W1_mj      * XHAT_FS / 1000
const Wprefix_px = Wprefix_mj * XHAT_FS / 1000
const line2LeftX = (XHAT_RX - W1_px) + Wprefix_px  // left edge of "=" in line 1

// ── Stage groups ──────────────────────────────────────────────────────────────

const gFeatureSpace = `
  <!-- ── STAGE: feature-space ───────────────────────────────────────────────── -->
  <g id="g-feature-space">
    <circle id="circle-f" cx="155" cy="180" r="115"
            fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
    <text x="155" y="52" text-anchor="middle" font-size="13" fill="#6b7280"
          font-family="system-ui,-apple-system,sans-serif">Feature Space <tspan
          font-style="italic" font-family="Georgia,serif">F</tspan></text>
    <circle id="dot-x" cx="120" cy="140" r="4" fill="#1f2937"/>
    ${mathLabel('x', 113, 133, 'right', 15)}
  </g>`

// coord-exp is a separate group so it can fade out when H is introduced
const gCoordExp = `
  <!-- coord-exp: fades in with feature-space, fades out at both-spaces -->
  <g id="g-coord-exp">
    ${mathLabel('= (x_1, \\ldots, x_n)^{T}', 113, 153, 'right', 11, '#4b5563')}
  </g>`

const gBothSpaces = `
  <!-- ── STAGE: both-spaces ─────────────────────────────────────────────────── -->
  <g id="g-both-spaces">
    <circle id="circle-h" cx="435" cy="180" r="75"
            fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
    <text x="435" y="96" text-anchor="middle" font-size="13" fill="#6b7280"
          font-family="system-ui,-apple-system,sans-serif">Embedding Space <tspan
          font-style="italic" font-family="Georgia,serif">H</tspan></text>
  </g>`

const gEncoding = `
  <!-- ── STAGE: encoding ────────────────────────────────────────────────────── -->
  <g id="g-encoding">
    <circle id="dot-y" cx="450" cy="155" r="4" fill="#1f2937"/>
    ${mathLabel('y = Wx', 462, 151, 'left', 13)}
    <path id="arrow-w"
          d="M124,136 C238.211,56.772 371.582,69.394 444,144"
          fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round"/>
    <polygon id="arrowhead-w" points="0,0 -8,-3.2 -8,3.2" fill="#4b5563"
             transform="translate(448,152) rotate(60)"/>
    ${mathLabel('W', 291, 66, 'center', 17)}
  </g>`

const gDecoding = `
  <!-- ── STAGE: decoding ────────────────────────────────────────────────────── -->
  <g id="g-decoding">
    <circle id="dot-xhat" cx="139" cy="190" r="4" fill="#1f2937"/>
    <path id="arrow-wt"
          d="M448,160 C317.795,286.319 191.695,221.883 149.641,196.934"
          fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round"/>
    <polygon id="arrowhead-wt" points="0,0 -8,-3.2 -8,3.2" fill="#4b5563"
             transform="translate(142,192) rotate(212)"/>
    ${mathLabel('W^{T}', 268, 262, 'center', 17)}
    ${mathLabel('\\hat{x} = W^{T} y', XHAT_RX, XHAT_RY1, 'right', XHAT_FS)}
  </g>`

// Line 2: left-aligned so its "=" column matches line 1's "=" column
const gGramMatrix = `
  <!-- ── STAGE: gram-matrix ─────────────────────────────────────────────────── -->
  <g id="g-gram-matrix">
    ${mathLabel('= W^{T} Wx', line2LeftX, XHAT_RY2, 'left', XHAT_FS)}
  </g>`

// Error/interference line: red dashed x → x̂. Hidden by default.
// Reveal later via CSS class .show-error-line on .mapping-diagram.
const gErrorLine = `
  <!-- Red dashed line: x → x̂ (reconstruction error reference).
       Default opacity:0 in MappingDiagram.vue. Reveal via .show-error-line. -->
  <g id="g-error-line">
    <line id="error-line" x1="120" y1="140" x2="139" y2="190"
          stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/>
  </g>`

// ── Final SVG ─────────────────────────────────────────────────────────────────
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 580 360"
     width="580"
     height="360">
  <!--
    MAPPING DIAGRAM — F → H → F̂
    ══════════════════════════════════════════════════════════════════════════════
    All math labels are SVG path data generated from LaTeX via MathJax.
    To regenerate after editing TeX expressions:
      node scripts/gen-math-svg.mjs

    Stage groups (targeted by CSS in MappingDiagram.vue):
      #g-feature-space  → opacity 1 at stage: feature-space
      #g-coord-exp      → opacity 1 at stage: feature-space; opacity 0 at: both-spaces
      #g-both-spaces    → opacity 1 at stage: both-spaces
      #g-encoding       → opacity 1 at stage: encoding
      #g-decoding       → opacity 1 at stage: decoding
      #g-gram-matrix    → opacity 1 at stage: gram-matrix
      #g-error-line     → not in stage system; reveal via .show-error-line class

    Geometry anchor IDs (survive Affinity Designer / Inkscape round-trips):
      #circle-f, #dot-x               — in g-feature-space
      #circle-h                       — in g-both-spaces
      #dot-y, #arrow-w, #arrowhead-w  — in g-encoding
      #dot-xhat, #arrow-wt, #arrowhead-wt — in g-decoding
      #error-line                     — in g-error-line

    Arrow draw-on: CSS stroke-dashoffset on #arrow-w, #arrow-wt
    Arrowhead reveal: CSS opacity delay on #arrowhead-w, #arrowhead-wt
  -->
${gFeatureSpace}
${gCoordExp}
${gBothSpaces}
${gEncoding}
${gDecoding}
${gGramMatrix}
${gErrorLine}
</svg>
`

writeFileSync('src/assets/mapping-diagram.svg', svg, 'utf-8')
console.log('✓ Generated src/assets/mapping-diagram.svg')
console.log(`  gram-matrix "=" left edge: x = ${line2LeftX.toFixed(2)}`)
