import katex from 'katex'

/**
 * Create a DOM element with KaTeX-rendered LaTeX inside.
 * Used for imperative Three.js CSS2DObject labels — not for Vue templates.
 * Vue components should use the v-katex directive or <katex-element> instead.
 */
export function createLatexElement(
  formula: string,
  style?: Partial<CSSStyleDeclaration>,
): HTMLDivElement {
  const el = document.createElement('div')
  el.innerHTML = katex.renderToString(formula, { throwOnError: false, output: 'html' })
  if (style) Object.assign(el.style, style)
  return el
}
