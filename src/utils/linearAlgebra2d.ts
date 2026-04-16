export type Vec2 = [number, number]

export function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]]
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

export function scale(v: Vec2, s: number): Vec2 {
  return [v[0] * s, v[1] * s]
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1]
}

export function norm(v: Vec2): number {
  return Math.sqrt(dot(v, v))
}

export function normSq(v: Vec2): number {
  return dot(v, v)
}

export function normalize(v: Vec2): Vec2 {
  const n = norm(v)
  return [v[0] / n, v[1] / n]
}

/** Project vector x onto the line through the origin in direction w. */
export function projectOnto(x: Vec2, w: Vec2): Vec2 {
  const t = dot(x, w) / normSq(w)
  return scale(w, t)
}

/** Solve 2×2 system [w1 | w2] c = x via Cramer's rule. */
export function solve2x2(w1: Vec2, w2: Vec2, x: Vec2): Vec2 {
  const det = w1[0] * w2[1] - w1[1] * w2[0]
  const c1 = (x[0] * w2[1] - x[1] * w2[0]) / det
  const c2 = (w1[0] * x[1] - w1[1] * x[0]) / det
  return [c1, c2]
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}
