import type { Vec2 } from './linearAlgebra'
import { solve2x2, dot, normSq } from './linearAlgebra'

export interface BasisPreset {
  type: 'arbitrary' | 'orthogonal' | 'orthonormal'
  label: string
  w1: Vec2
  w2: Vec2
  target: Vec2
  c1: number
  c2: number
}

export const target: Vec2 = [3, 2]

// --- Arbitrary basis: clearly skewed, non-orthogonal ---
const arbW1: Vec2 = [2, 1]
const arbW2: Vec2 = [1, 2]
const [arbC1, arbC2] = solve2x2(arbW1, arbW2, target)
// c1 = 4/3, c2 = 1/3

// --- Orthogonal basis: perpendicular, different lengths ---
const orthW1: Vec2 = [2, 1]
const orthW2: Vec2 = [-0.5, 1]
// w1·w2 = 0, |w1|² = 5, |w2|² = 1.25
const orthC1 = dot(target, orthW1) / normSq(orthW1) // 8/5 = 1.6
const orthC2 = dot(target, orthW2) / normSq(orthW2) // 0.4

// --- Orthonormal basis: perpendicular, unit length ---
// Normalized version of orthogonal basis
const s5 = Math.sqrt(5)
const onW1: Vec2 = [2 / s5, 1 / s5]
const onW2: Vec2 = [-1 / s5, 2 / s5]
const onC1 = dot(target, onW1) // 8/√5 ≈ 3.578
const onC2 = dot(target, onW2) // 1/√5 ≈ 0.447

export const basisPresets: [BasisPreset, BasisPreset, BasisPreset] = [
  {
    type: 'arbitrary',
    label: 'Arbitrary Basis',
    w1: arbW1,
    w2: arbW2,
    target,
    c1: arbC1,
    c2: arbC2,
  },
  {
    type: 'orthogonal',
    label: 'Orthogonal Basis',
    w1: orthW1,
    w2: orthW2,
    target,
    c1: orthC1,
    c2: orthC2,
  },
  {
    type: 'orthonormal',
    label: 'Orthonormal Basis',
    w1: onW1,
    w2: onW2,
    target,
    c1: onC1,
    c2: onC2,
  },
]
