import katex from 'katex'

/**
 * Render a LaTeX formula to an HTML string using KaTeX.
 * Safe to use with v-html — throwOnError is disabled so malformed
 * formulae fall back to plain text rather than throwing.
 */
export function renderLatexHtml(formula: string): string {
  return katex.renderToString(formula, {
    throwOnError: false,
    output: 'html',
  })
}

/**
 * Create a DOM element with KaTeX-rendered LaTeX inside.
 * Useful for imperative code (e.g. Three.js CSS2DObject labels).
 */
export function createLatexElement(
  formula: string,
  style?: Partial<CSSStyleDeclaration>,
): HTMLDivElement {
  const el = document.createElement('div')
  el.innerHTML = renderLatexHtml(formula)
  if (style) Object.assign(el.style, style)
  return el
}
